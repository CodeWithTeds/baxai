import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConvoMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

export type VoiceState =
  | 'idle'         // owl at rest
  | 'recording'    // mic open, user speaking
  | 'transcribing' // audio sent to STT
  | 'thinking'     // STT done, waiting for LLM
  | 'speaking'     // TTS playing back
  | 'error';       // something failed

// Ensure the base URL always ends with /api/v1
function buildApiBase(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  if (!raw) return 'http://192.168.1.13:8084/api/v1';
  if (raw.endsWith('/api/v1')) return raw;
  return `${raw}/api/v1`;
}
const API = buildApiBase();

// ─── Local fallback replies (when backend is unreachable) ────────────────────

function localFallbackReply(text: string): string | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Strict domain scope & off-topic refusal for local fallback
  if (
    /\b(python|javascript|coding|c\+\+|java|php|html|css|sql|programming|developer|script|algorithm)\b/i.test(lower) ||
    /\b(poem|poetry|joke|weather|politics|president|who is|crypto|bitcoin|stock market)\b/i.test(lower)
  ) {
    return "I am specialized only in assisting with Rens Digital products, custom printing, and orders! I cannot answer general programming or unrelated topics. Let me know if you need help with your orders or merchandise!";
  }

  // Direct order reference e.g. RD-1234, #RD-1234, #1234
  if (/(?:#|rd-|order\s*\d)/i.test(clean) || (/^[a-z0-9_-]{4,15}$/i.test(clean) && /\d/.test(clean))) {
    const orderRef = clean.replace(/^#/, '');
    return `To check order ${orderRef}, please check the Orders tab where all your personal verified orders and live tracking milestones are listed securely! 📦`;
  }

  if (/track|order|status|where.*order|my order/.test(lower)) {
    return "To track your order, type or paste your Order Reference (such as RD-1234) right here into the chat, or head to the Orders tab to view live delivery timelines! 📦";
  }
  if (/price|cost|how much|magkano/.test(lower)) {
    return "Prices vary by product and customization. Browse the Services tab to see all available products with their starting prices. 🏷️";
  }
  if (/hello|hi|kumusta|magandang/.test(lower)) {
    return "Hi there! 👋 I'm Owla, your NUYDA ENTERPRISE assistant. I can help you with orders, pricing, and product info. How can I help?";
  }
  if (/cancel|undo|bawi/.test(lower)) {
    return "To cancel an order, please contact us directly through the AI Hub chat or visit our store. We process orders quickly so reach out as soon as possible! ⏰";
  }
  if (/pay|bayad|cash|gcash|online/.test(lower)) {
    return "We currently accept Cash on Delivery for all orders. Online payment options are coming soon! 💳";
  }
  if (/product|customize|custom|personalize/.test(lower)) {
    return "You can customize mugs, t-shirts, stickers, pins, tote bags, and more! Head to the Services tab to explore our full catalogue and launch the 3D preview. 🎨";
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceConversation(userEmail?: string | null) {
  const userEmailRef = useRef(userEmail);
  userEmailRef.current = userEmail;

  const [messages, setMessages] = useState<ConvoMessage[]>([
    {
      id: '0',
      role: 'assistant',
      text: "Hi! I'm Owla, your NUYDA ENTERPRISE assistant. Tap me to start speaking — I understand both English and Tagalog.",
    },
  ]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError]           = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Conversation history sent to LLM (role+content only, no ids)
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Request mic permission on mount ────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  // ── Helper: append a message ────────────────────────────────────────────────

  const addMessage = useCallback((msg: ConvoMessage) => {
    setMessages((prev) => [...prev, msg]);
    historyRef.current = [
      ...historyRef.current,
      { role: msg.role, content: msg.text },
    ];
  }, []);

  // ── START recording ─────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!permissionGranted) {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied.');
        setVoiceState('error');
        return;
      }
      setPermissionGranted(true);
    }
    setError(null);
    // Stop any on-device TTS that may be speaking (fallback)
    try { await Speech.stop(); } catch {}
    setVoiceState('recording');
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [permissionGranted, recorder]);

  // ── STOP recording → run full pipeline ──────────────────────────────────────

  const stopAndProcess = useCallback(async () => {
    if (voiceState !== 'recording') return;

    setVoiceState('transcribing');

    await recorder.stop();
    const uri = recorder.uri;

    if (!uri) {
      setError('Recording produced no file.');
      setVoiceState('error');
      return;
    }

    try {
      // ── 1. STT — use FileSystem.uploadAsync (RN FormData can't attach files) ──
      const sttUpload = await FileSystem.uploadAsync(
        `${API}/groq/transcribe`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: FileSystemUploadType.MULTIPART,
          fieldName: 'audio',
          mimeType: 'audio/m4a',
          parameters: {},
        },
      );

      if (sttUpload.status < 200 || sttUpload.status >= 300) {
        const bodyPreview = sttUpload.body?.slice(0, 400) ?? '';
        console.warn('[VoiceConversation] STT failed', sttUpload.status, bodyPreview, ' URL:', `${API}/groq/transcribe`);
        throw new Error(`STT HTTP ${sttUpload.status} — ${bodyPreview.slice(0,120)}`);
      }

      let sttJson: any;
      try {
        sttJson = JSON.parse(sttUpload.body);
      } catch {
        throw new Error(`STT invalid JSON (HTTP ${sttUpload.status}): ${sttUpload.body.slice(0,200)}`);
      }

      if (sttJson.status !== 'success') {
        throw new Error(sttJson.message ?? 'Transcription failed');
      }

      const transcribedText: string = sttJson.data.text?.trim();
      const detectedLang: string    = sttJson.data.language ?? 'en'; // ISO e.g. "tl", "en"

      if (!transcribedText) {
        setVoiceState('idle');
        return; // silence or empty — just go back to idle
      }

      // Display user bubble
      addMessage({ id: Date.now().toString(), role: 'user', text: transcribedText });

      // ── 2. LLM ─────────────────────────────────────────────────────────────
      setVoiceState('thinking');

      let reply: string;
      let replyLang: string = detectedLang;

      try {
        const chatRes  = await fetch(`${API}/groq/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyRef.current,
            language: detectedLang,
            customer_email: userEmailRef.current || undefined,
          }),
        });
        const chatJson = await chatRes.json();

        if (!chatRes.ok || chatJson.status !== 'success') {
          throw new Error(chatJson.message ?? 'Chat failed');
        }

        reply     = chatJson.data.reply;
        replyLang = chatJson.data.language ?? detectedLang;
      } catch (chatErr: any) {
        // Try local keyword fallback before giving up
        const localReply = localFallbackReply(transcribedText);
        if (localReply) {
          addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: localReply });
          setVoiceState('idle');
          return;
        }
        throw chatErr;
      }

      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: reply });

      // ── 3. TTS — fetch WAV via POST, write to cache, then play ───────────
      // TTS is non-fatal: if it fails (429/413/502) we still show the text reply and return to idle.
      setVoiceState('speaking');

      const ttsRes = await fetch(`${API}/groq/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply, language: replyLang }),
      });

      if (!ttsRes.ok) {
        let serverMsg = '';
        let retryAfter: number | null = null;
        try {
          const bodyText = await ttsRes.text();
          try {
            const j = JSON.parse(bodyText);
            serverMsg = j.message ?? '';
            retryAfter = j.data?.retry_after ?? null;
            if (j.data?.groq_error) serverMsg = j.data.groq_error || serverMsg;
          } catch {
            serverMsg = bodyText.slice(0, 300);
          }
        } catch {
          // ignore parse errors
        }
        console.warn('[VoiceConversation] TTS unavailable', ttsRes.status, serverMsg);

        // ── FALLBACK: Groq first, expo-speech only on rate limit (429) ─────────
        // 429 = TPD/TPM quota exhausted. Other statuses (413/400/502) are not
        // rate limits — show text reply without attempting device TTS.
        if (ttsRes.status === 429) {
          const fallbackOk = await speakWithExpoSpeech(reply, replyLang);
          if (fallbackOk) {
            console.log('[VoiceConversation] Groq rate-limited — fallback TTS (expo-speech) succeeded');
            setVoiceState('idle');
            setError(null);
            return;
          }
          const mins = retryAfter ? Math.ceil(retryAfter / 60) : null;
          setError(
            mins
              ? `Voice daily limit reached — text reply shown. Try again in ~${mins} min.`
              : 'Voice daily limit reached — text reply shown. Try again later.'
          );
          setVoiceState('idle');
          return;
        }

        if (ttsRes.status === 413) {
          setError('Voice reply too long — showing text only.');
        } else if (ttsRes.status === 400) {
          setError(serverMsg ? `Voice error: ${serverMsg}` : 'Voice configuration error — showing text only.');
        } else {
          setError(serverMsg ? `Voice unavailable: ${serverMsg}` : `Voice unavailable (${ttsRes.status}) — showing text reply.`);
        }
        setVoiceState('idle');
        return;
      }

      await playGroqWav(ttsRes);

      setVoiceState('idle');
    } catch (err: any) {
      console.error('[VoiceConversation]', err);
      setError(err?.message ?? 'Something went wrong');
      setVoiceState('error');
    }
  }, [voiceState, recorder, addMessage]);

  // ── SEND text directly (quick actions) ─────────────────────────────────────

  const sendText = useCallback(async (text: string) => {
    if (voiceState !== 'idle' && voiceState !== 'error') return;
    setError(null);

    addMessage({ id: Date.now().toString(), role: 'user', text });

    try {
      setVoiceState('thinking');

      let reply: string;
      let replyLang: string = 'en';

      try {
        const chatRes  = await fetch(`${API}/groq/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyRef.current,
            language: 'en',
            customer_email: userEmailRef.current || undefined,
          }),
        });
        const chatJson = await chatRes.json();

        if (!chatRes.ok || chatJson.status !== 'success') {
          throw new Error(chatJson.message ?? 'Chat failed');
        }

        reply     = chatJson.data.reply;
        replyLang = chatJson.data.language ?? 'en';
      } catch (chatErr: any) {
        const localReply = localFallbackReply(text);
        if (localReply) {
          addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: localReply });
          setVoiceState('idle');
          return;
        }
        throw chatErr;
      }

      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: reply });

      setVoiceState('speaking');

      const ttsRes = await fetch(`${API}/groq/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: reply, language: replyLang }),
      });

      if (!ttsRes.ok) {
        let serverMsg = '';
        let retryAfter: number | null = null;
        try {
          const bodyText = await ttsRes.text();
          try {
            const j = JSON.parse(bodyText);
            serverMsg = j.message ?? '';
            retryAfter = j.data?.retry_after ?? null;
            if (j.data?.groq_error) serverMsg = j.data.groq_error || serverMsg;
          } catch {
            serverMsg = bodyText.slice(0, 300);
          }
        } catch {}
        console.warn('[VoiceConversation] TTS unavailable', ttsRes.status, serverMsg);

        // ── FALLBACK: Groq first, expo-speech only on rate limit (429) ─────────
        if (ttsRes.status === 429) {
          const fallbackOk = await speakWithExpoSpeech(reply, replyLang);
          if (fallbackOk) {
            console.log('[VoiceConversation] Groq rate-limited — fallback TTS (expo-speech) succeeded');
            setVoiceState('idle');
            setError(null);
            return;
          }
          const mins = retryAfter ? Math.ceil(retryAfter / 60) : null;
          setError(
            mins
              ? `Voice daily limit reached — text reply shown. Try again in ~${mins} min.`
              : 'Voice daily limit reached — text reply shown. Try again later.'
          );
          setVoiceState('idle');
          return;
        }

        if (ttsRes.status === 413) {
          setError('Voice reply too long — showing text only.');
        } else if (ttsRes.status === 400) {
          setError(serverMsg ? `Voice error: ${serverMsg}` : 'Voice configuration error — showing text only.');
        } else {
          setError(serverMsg ? `Voice unavailable: ${serverMsg}` : `Voice unavailable (${ttsRes.status}) — showing text reply.`);
        }
        setVoiceState('idle');
        return;
      }

      await playGroqWav(ttsRes);

      setVoiceState('idle');
    } catch (err: any) {
      console.error('[VoiceConversation]', err);
      setError(err?.message ?? 'Something went wrong');
      setVoiceState('error');
    }
  }, [voiceState, addMessage]);

  // ── Toggle (tap owl / mic) ──────────────────────────────────────────────────

  const toggle = useCallback(() => {
    if (voiceState === 'idle' || voiceState === 'error') {
      startRecording();
    } else if (voiceState === 'recording') {
      stopAndProcess();
    } else if (voiceState === 'speaking') {
      try { Speech.stop(); } catch {}
      setVoiceState('idle');
    }
    // Ignore taps during transcribing / thinking
  }, [voiceState, startRecording, stopAndProcess]);

  // ── Clear conversation ──────────────────────────────────────────────────────

  const clearConversation = useCallback(() => {
    try { Speech.stop(); } catch {}
    historyRef.current = [];
    setError(null);
    setVoiceState('idle');
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        text: "Hi! I'm Owla, your NUYDA ENTERPRISE assistant. Tap me or type below — what can I help you with today?",
      },
    ]);
  }, []);

  // Stop speech when unmounting
  useEffect(() => {
    return () => { try { Speech.stop(); } catch {} };
  }, []);

  return {
    messages,
    voiceState,
    error,
    permissionGranted,
    toggle,
    sendText,
    clearConversation,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function playGroqWav(ttsRes: Response): Promise<void> {
  const arrayBuffer = await ttsRes.arrayBuffer();
  const uint8       = new Uint8Array(arrayBuffer);
  let binary        = '';
  for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
  const base64wav = btoa(binary);
  const tempPath  = `${FileSystem.cacheDirectory}tts_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(tempPath, base64wav, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const player = createAudioPlayer({ uri: tempPath });
  player.play();
  await waitForPlaybackEnd(player);
  player.remove();
}

async function speakWithExpoSpeech(text: string, lang: string): Promise<boolean> {
  try {
    const speechLang =
      lang === 'tl' || lang === 'fil' || lang === 'tgl' ? 'fil-PH' :
      lang === 'ar' ? 'ar-SA' :
      lang.startsWith('tl') ? 'fil-PH' : 'en-US';
    await Speech.stop();
    const clipped = text.length > 800 ? text.slice(0, 800) : text;
    await new Promise<void>((resolve, reject) => {
      Speech.speak(clipped, {
        language: speechLang,
        pitch: 1.0,
        rate: 1.0,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: (e) => reject(e),
      });
    });
    return true;
  } catch (e) {
    console.warn('[VoiceConversation] expo-speech fallback failed', e);
    return false;
  }
}

function waitForPlaybackEnd(player: ReturnType<typeof createAudioPlayer>): Promise<void> {
  return new Promise((resolve) => {
    // Poll every 300 ms; resolve when the player stops playing
    const interval = setInterval(() => {
      if (!player.playing) {
        clearInterval(interval);
        resolve();
      }
    }, 300);

    // Safety timeout — 60 s max
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 60_000);
  });
}

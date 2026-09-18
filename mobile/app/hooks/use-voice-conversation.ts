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

const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.149.41.1:8080/api/v1'; // fallback for dev — override via .env EXPO_PUBLIC_API_URL

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceConversation() {
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

      const chatRes  = await fetch(`${API}/groq/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyRef.current,
          language: detectedLang,
        }),
      });
      const chatJson = await chatRes.json();

      if (!chatRes.ok || chatJson.status !== 'success') {
        throw new Error(chatJson.message ?? 'Chat failed');
      }

      const reply: string    = chatJson.data.reply;
      const replyLang: string = chatJson.data.language ?? detectedLang;

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

      const chatRes  = await fetch(`${API}/groq/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyRef.current,
          language: 'en',
        }),
      });
      const chatJson = await chatRes.json();

      if (!chatRes.ok || chatJson.status !== 'success') {
        throw new Error(chatJson.message ?? 'Chat failed');
      }

      const reply: string     = chatJson.data.reply;
      const replyLang: string = chatJson.data.language ?? 'en';

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

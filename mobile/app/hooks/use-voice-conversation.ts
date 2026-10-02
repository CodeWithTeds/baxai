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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractPriceConstraintFromText } from '@/utils/price-search';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConvoProduct {
  id: string | number;
  name: string;
  category?: string;
  price?: string | number;
  sku?: string;
  thumbnail?: string | null;
  fallback_image?: string | null;
  has_3d_preview?: boolean;
  is3D?: boolean;
  viewer_type?: string;
  viewerType?: string;
  stock?: number;
  customization_addon_price?: number | string;
  customizationAddonPrice?: number | string;
  max_text_length?: number;
  maxTextLength?: number;
}

export type ConvoMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  products?: ConvoProduct[];
};

export type VoiceState =
  | 'idle'         // owl at rest
  | 'recording'    // mic open, user speaking
  | 'transcribing' // audio sent to STT
  | 'thinking'     // STT done, waiting for LLM
  | 'speaking'     // TTS playing back
  | 'error';       // something failed

export type VerificationStage = 'user' | 'data' | 'security';
export type StageStatus = 'pending' | 'active' | 'success' | 'failed';

export type VerificationState = {
  inProgress: boolean;
  currentStage: VerificationStage | null;
  stages: {
    user: StageStatus;
    data: StageStatus;
    security: StageStatus;
  };
  error: string | null;
  failedStage: VerificationStage | null;
};

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
    return "I am specialized only in assisting with NUYDA ENTERPRISE products, custom printing, and orders! I cannot answer general programming or unrelated topics. Let me know if you need help with your orders or merchandise!";
  }

  // Direct order reference e.g. RD-1234, #RD-1234, #1234
  if (/(?:#|rd-|order\s*\d)/i.test(clean) || (/^[a-z0-9_-]{4,15}$/i.test(clean) && /\d/.test(clean))) {
    const orderRef = clean.replace(/^#/, '');
    return `To check order ${orderRef}, please check the Orders tab where all your personal verified orders and live tracking milestones are listed securely! 📦`;
  }

  if (/track|order|status|where.*order|my order/.test(lower)) {
    return "To track your order, type or paste your Order Reference (such as RD-1234) right here into the chat, or head to the Orders tab to view live delivery timelines! 📦";
  }
  if (/choose|recommend|suggest|pili|quiz|help me pick/i.test(lower)) {
    return "I would love to help you find the perfect product! 🎉 Could you share:\n1. What is the occasion or purpose? (Gift, event, personal use, or giveaway?)\n2. How many pieces do you need?\n3. What is your target budget?\n\nTell me your preferences and I will recommend the best match for you!";
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

  // ── Conversation ID & Database-backed verification state ────────────────────
  const [conversationId, setConversationId] = useState<string>('');
  const conversationIdRef = useRef<string>('');

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const isVerifiedRef = useRef<boolean>(false);

  const [verificationState, setVerificationState] = useState<VerificationState>({
    inProgress: false,
    currentStage: null,
    stages: {
      user: 'pending',
      data: 'pending',
      security: 'pending',
    },
    error: null,
    failedStage: null,
  });

  const pendingRequestRef = useRef<{
    prompt: string;
    lang: string;
  } | null>(null);

  // Conversation history sent to LLM (role+content only, no ids)
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // ── Initialize Conversation ID and verify against Database on mount ─────────
  useEffect(() => {
    (async () => {
      try {
        let storedId = await AsyncStorage.getItem('@nuyda_active_convo_id');
        if (!storedId) {
          storedId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          await AsyncStorage.setItem('@nuyda_active_convo_id', storedId);
        }
        setConversationId(storedId);
        conversationIdRef.current = storedId;

        // Check local storage verification flag
        const localVerified = await AsyncStorage.getItem(`@nuyda_convo_verified_${storedId}`);
        if (localVerified === 'true') {
          setIsVerified(true);
          isVerifiedRef.current = true;
        }

        // Verify and sync with database
        try {
          const res = await fetch(`${API}/groq/conversation/${storedId}/status`);
          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.data?.is_verified) {
              setIsVerified(true);
              isVerifiedRef.current = true;
              await AsyncStorage.setItem(`@nuyda_convo_verified_${storedId}`, 'true');
            }
          }
        } catch {}
      } catch (err) {
        console.warn('[VoiceConversation] Session initialization error', err);
      }
    })();
  }, []);

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

  // ── Sequential 3-Stage Security Verification Runner ─────────────────────────
  const runVerification = useCallback(async (
    convoId: string,
    currentHistory: { role: string; content: string }[]
  ): Promise<boolean> => {
    setVerificationState({
      inProgress: true,
      currentStage: 'user',
      stages: {
        user: 'active',
        data: 'pending',
        security: 'pending',
      },
      error: null,
      failedStage: null,
    });

    // ── STAGE 1: Checking User ────────────────────────────────────────────────
    try {
      const res1 = await fetch(`${API}/groq/conversation/verify-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convoId,
          stage: 'user',
          user_email: userEmailRef.current || undefined,
        }),
      });
      const json1 = await res1.json();
      if (!res1.ok || json1.status !== 'success') {
        throw new Error(json1.message ?? 'User verification failed.');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Checking User stage failed.';
      setVerificationState((prev) => ({
        ...prev,
        inProgress: false,
        currentStage: 'user',
        failedStage: 'user',
        error: msg,
        stages: { ...prev.stages, user: 'failed' },
      }));
      return false;
    }

    setVerificationState((prev) => ({
      ...prev,
      stages: { ...prev.stages, user: 'success' },
    }));

    await new Promise((r) => setTimeout(r, 450));

    // ── STAGE 2: Checking Data ────────────────────────────────────────────────
    setVerificationState((prev) => ({
      ...prev,
      currentStage: 'data',
      stages: { ...prev.stages, data: 'active' },
    }));

    try {
      const res2 = await fetch(`${API}/groq/conversation/verify-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convoId,
          stage: 'data',
          messages: currentHistory,
        }),
      });
      const json2 = await res2.json();
      if (!res2.ok || json2.status !== 'success') {
        throw new Error(json2.message ?? 'Conversation data validation failed.');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Checking Data stage failed.';
      setVerificationState((prev) => ({
        ...prev,
        inProgress: false,
        currentStage: 'data',
        failedStage: 'data',
        error: msg,
        stages: { ...prev.stages, data: 'failed' },
      }));
      return false;
    }

    setVerificationState((prev) => ({
      ...prev,
      stages: { ...prev.stages, data: 'success' },
    }));

    await new Promise((r) => setTimeout(r, 450));

    // ── STAGE 3: Securing Request & Checking Vulnerabilities (5s animation) ───
    setVerificationState((prev) => ({
      ...prev,
      currentStage: 'security',
      stages: { ...prev.stages, security: 'active' },
    }));

    const stage3StartTime = Date.now();

    try {
      const res3 = await fetch(`${API}/groq/conversation/verify-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: convoId,
          stage: 'security',
        }),
      });
      const json3 = await res3.json();
      if (!res3.ok || json3.status !== 'success') {
        throw new Error(json3.message ?? 'Security validation failed.');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Securing Request stage failed.';
      setVerificationState((prev) => ({
        ...prev,
        inProgress: false,
        currentStage: 'security',
        failedStage: 'security',
        error: msg,
        stages: { ...prev.stages, security: 'failed' },
      }));
      return false;
    }

    // Animation for checking vulnerabilities lasts 5 seconds
    const elapsed = Date.now() - stage3StartTime;
    const remainingTime = Math.max(0, 5000 - elapsed);
    if (remainingTime > 0) {
      await new Promise((r) => setTimeout(r, remainingTime));
    }

    setVerificationState((prev) => ({
      ...prev,
      stages: { ...prev.stages, security: 'success' },
    }));

    await new Promise((r) => setTimeout(r, 400));

    setIsVerified(true);
    isVerifiedRef.current = true;
    await AsyncStorage.setItem(`@nuyda_convo_verified_${convoId}`, 'true');

    setVerificationState({
      inProgress: false,
      currentStage: null,
      stages: { user: 'success', data: 'success', security: 'success' },
      error: null,
      failedStage: null,
    });

    return true;
  }, []);

  // ── LLM Chat & TTS execution ────────────────────────────────────────────────
  const callLlmAndTts = useCallback(async (promptText: string, lang: string = 'en') => {
    let activeConvoId = conversationIdRef.current;
    if (!activeConvoId) {
      activeConvoId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      setConversationId(activeConvoId);
      conversationIdRef.current = activeConvoId;
      await AsyncStorage.setItem('@nuyda_active_convo_id', activeConvoId);
    }

    // One-time initialization and security check before first AI response
    if (!isVerifiedRef.current) {
      pendingRequestRef.current = { prompt: promptText, lang };
      const verifiedOk = await runVerification(activeConvoId, historyRef.current);
      if (!verifiedOk) {
        setVoiceState('idle');
        return; // Halt: verification UI shows failure and blocks AI response
      }
      pendingRequestRef.current = null;
    }

    setVoiceState('thinking');

    let reply: string;
    let replyLang: string = lang;

    try {
      const chatRes = await fetch(`${API}/groq/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConvoId,
          messages: historyRef.current,
          language: lang,
          customer_email: userEmailRef.current || undefined,
        }),
      });
      const chatJson = await chatRes.json();

      if (!chatRes.ok || chatJson.status !== 'success') {
        throw new Error(chatJson.message ?? 'Chat failed');
      }

      reply     = chatJson.data.reply;
      replyLang = chatJson.data.language ?? lang;
      let returnedProducts: ConvoProduct[] = chatJson.data.products || [];

      // Client-side safety safeguard: Ensure no products violating user budget are rendered
      const constraint = extractPriceConstraintFromText(promptText);
      if (constraint.min !== undefined || constraint.max !== undefined) {
        returnedProducts = returnedProducts.filter((p) => {
          const numPrice = typeof p.price === 'number'
            ? p.price
            : parseFloat(String(p.price || 0).replace(/[^\d.]/g, ''));
          if (constraint.min !== undefined && numPrice < constraint.min) return false;
          if (constraint.max !== undefined && numPrice > constraint.max) return false;
          return true;
        });
      }

      addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: reply, products: returnedProducts });
    } catch (chatErr: any) {
      const localReply = localFallbackReply(promptText);
      if (localReply) {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', text: localReply });
        setVoiceState('idle');
        return;
      }
      throw chatErr;
    }

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

      if (ttsRes.status === 429) {
        const fallbackOk = await speakWithExpoSpeech(reply, replyLang);
        if (fallbackOk) {
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
  }, [addMessage, runVerification]);

  // ── Retry verification if a stage failed ────────────────────────────────────
  const retryVerification = useCallback(async () => {
    if (!conversationIdRef.current) return;
    setError(null);
    const ok = await runVerification(conversationIdRef.current, historyRef.current);
    if (ok && pendingRequestRef.current) {
      const pending = pendingRequestRef.current;
      pendingRequestRef.current = null;
      await callLlmAndTts(pending.prompt, pending.lang);
    }
  }, [runVerification, callLlmAndTts]);

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
    try { await Speech.stop(); } catch {}
    setVoiceState('recording');
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [permissionGranted, recorder]);

  // ── STOP recording → run STT then LLM pipeline ──────────────────────────────
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
        console.warn('[VoiceConversation] STT failed', sttUpload.status, bodyPreview);
        throw new Error(`STT HTTP ${sttUpload.status} — ${bodyPreview.slice(0, 120)}`);
      }

      let sttJson: any;
      try {
        sttJson = JSON.parse(sttUpload.body);
      } catch {
        throw new Error(`STT invalid JSON (HTTP ${sttUpload.status}): ${sttUpload.body.slice(0, 200)}`);
      }

      if (sttJson.status !== 'success') {
        throw new Error(sttJson.message ?? 'Transcription failed');
      }

      const transcribedText: string = sttJson.data.text?.trim();
      const detectedLang: string    = sttJson.data.language ?? 'en';

      if (!transcribedText) {
        setVoiceState('idle');
        return;
      }

      // Display user bubble
      addMessage({ id: Date.now().toString(), role: 'user', text: transcribedText });

      // Run verification & LLM pipeline
      await callLlmAndTts(transcribedText, detectedLang);
    } catch (err: any) {
      console.error('[VoiceConversation]', err);
      setError(err?.message ?? 'Something went wrong');
      setVoiceState('error');
    }
  }, [voiceState, recorder, addMessage, callLlmAndTts]);

  // ── SEND text directly (type or quick action) ───────────────────────────────
  const sendText = useCallback(async (text: string) => {
    if (voiceState !== 'idle' && voiceState !== 'error') return;
    setError(null);

    addMessage({ id: Date.now().toString(), role: 'user', text });

    try {
      await callLlmAndTts(text, 'en');
    } catch (err: any) {
      console.error('[VoiceConversation]', err);
      setError(err?.message ?? 'Something went wrong');
      setVoiceState('error');
    }
  }, [voiceState, addMessage, callLlmAndTts]);

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
  }, [voiceState, startRecording, stopAndProcess]);

  // ── Clear conversation (generates fresh conversation ID for new cycle) ──────
  const clearConversation = useCallback(() => {
    try { Speech.stop(); } catch {}
    const newId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setConversationId(newId);
    conversationIdRef.current = newId;
    setIsVerified(false);
    isVerifiedRef.current = false;
    AsyncStorage.setItem('@nuyda_active_convo_id', newId).catch(() => {});
    setVerificationState({
      inProgress: false,
      currentStage: null,
      stages: { user: 'pending', data: 'pending', security: 'pending' },
      error: null,
      failedStage: null,
    });
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
    conversationId,
    isVerified,
    verificationState,
    retryVerification,
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

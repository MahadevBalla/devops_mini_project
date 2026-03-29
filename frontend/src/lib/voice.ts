// frontend/src/lib/voice.ts
// Voice API layer — STT, TTS, voices
// No auth headers needed — voice endpoints are public (no get_current_user dependency)

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SupportedLanguage =
  | "en-IN"
  | "hi-IN"
  | "ta-IN"
  | "te-IN"
  | "kn-IN"
  | "ml-IN";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "en-IN": "EN",
  "hi-IN": "HI",
  "ta-IN": "TA",
  "te-IN": "TE",
  "kn-IN": "KN",
  "ml-IN": "ML",
};

// Cycles shown in the language pill — keep short for mobile
export const LANG_CYCLE: SupportedLanguage[] = [
  "en-IN",
  "hi-IN",
  "ta-IN",
  "te-IN",
];

export interface VoicesResponse {
  voices: Record<string, string>; // { meera: "Female, Indian English…", … }
  default: string;
}

export interface RecordingSession {
  stop: () => void;           // stop recording, fires onComplete callback
  getAmplitude: () => number; // returns 0–1, for waveform visualiser
}

// ── GET /api/voice/voices ─────────────────────────────────────────────────────

export async function fetchVoices(): Promise<VoicesResponse> {
  const res = await fetch(`${API_BASE}/api/voice/voices`);
  if (!res.ok) throw new Error(`VOICES_FETCH_FAILED_${res.status}`);
  return res.json() as Promise<VoicesResponse>;
}

// ── POST /api/voice/stt ───────────────────────────────────────────────────────
// audioBlob: from MediaRecorder (webm/opus or ogg/opus)
// Backend accepts WAV/MP3/OGG — field name must be "audio" (UploadFile)

export async function speechToText(
  audioBlob: Blob,
  languageCode: SupportedLanguage = "en-IN"
): Promise<string> {
  const form = new FormData();

  const rawMime = audioBlob.type || "audio/webm";
  const baseMime = rawMime.split(";")[0].trim();
  const ext = baseMime.includes("ogg") ? "ogg"
             : baseMime.includes("mp4") ? "mp4"
             : "webm";

  const cleanBlob = new Blob([audioBlob], { type: baseMime });
  form.append("audio", cleanBlob, `recording.${ext}`);  // ← "audio" matches FastAPI
  form.append("language_code", languageCode);            // ← this one is correct already

  const res = await fetch(`${API_BASE}/api/voice/stt`, {
    method: "POST",
    body: form,
  });

  if (res.status === 413) throw new Error("AUDIO_TOO_LARGE");
  if (res.status === 503) throw new Error("VOICE_NOT_CONFIGURED");
  if (!res.ok) throw new Error("STT_FAILED");

  const data = await res.json();
  return (data.transcript as string) ?? "";
}

// ── POST /api/voice/tts ───────────────────────────────────────────────────────
// Returns a blob URL (string) pointing to the raw WAV the backend returned
// Caller must call URL.revokeObjectURL(url) when done to free memory

export async function textToSpeech(
  text: string,
  voice = "meera",
  languageCode: SupportedLanguage = "en-IN"
): Promise<string> {
  const form = new FormData();
  form.append("text", text);
  form.append("voice", voice);
  form.append("language_code", languageCode);

  const res = await fetch(`${API_BASE}/api/voice/tts`, {
    method: "POST",
    body: form,
  });

  if (res.status === 503) throw new Error("VOICE_NOT_CONFIGURED");
  if (res.status === 400) throw new Error("TTS_INVALID_INPUT");
  if (!res.ok) throw new Error("TTS_FAILED");

  // Backend returns raw WAV bytes with media_type="audio/wav"
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ── MediaRecorder helpers — browser only, no backend ─────────────────────────

export function startRecording(
  onComplete: (blob: Blob) => void,
  onError: (err: Error) => void
): Promise<RecordingSession> {
  return new Promise(async (resolve, reject) => {
    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const error =
        (err as Error).name === "NotAllowedError"
          ? new Error("MIC_PERMISSION_DENIED")
          : new Error("MIC_UNAVAILABLE");
      onError(error);
      reject(error);
      return;
    }

    // Pick best supported codec — backend's Sarvam STT accepts webm/ogg
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop()); // release mic indicator
      onComplete(new Blob(chunks, { type: recorder.mimeType }));
    };

    recorder.onerror = () => {
      onError(new Error("RECORDER_ERROR"));
    };

    // Amplitude analyser for live waveform bars
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;

    try {
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // Amplitude visualiser is optional — recording still works without it
    }

    recorder.start(100); // fire ondataavailable every 100ms

    resolve({
      stop: () => {
        recorder.stop();
        ctx?.close();
      },
      getAmplitude: () => {
        if (!analyser || !dataArray) return 0;
        analyser.getByteFrequencyData(dataArray as any);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        return sum / dataArray.length / 255; // normalise to 0–1
      },
    });
  });
}   
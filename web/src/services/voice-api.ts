import { apiUrl } from "../config";
import type { LocalModel } from "./app-settings";
import type { PracticePreferences, TurnDiagnostics } from "./debate-api";

/** Events the voice socket sends. Mirrors app/voice/routes.py exactly. */
export type VoiceState = "listening" | "thinking" | "speaking" | "interrupted";

export type VoiceCaption = {
  type: "caption";
  text: string;
  index: number;
  total?: number;
  opener?: boolean;
  /** The fourth voice announces a phase; it is never part of the reply. */
  moderator?: boolean;
  duration_ms: number;
  sample_rate: number;
};

export type VoiceTranscript = {
  type: "transcript";
  speaker: "learner" | "opponent";
  content: string;
  interrupted?: boolean;
  pending?: boolean;
  edit_window_ms?: number;
  stt?: { ms: number; words: number };
};

export type DeliverySignals = {
  wpm: number;
  fillers: number;
  pauses: number;
  longest_pause_sec: number;
  words: number;
};

export type VoiceDiagnostics = {
  type: "diagnostics";
  turn: TurnDiagnostics & {
    voice?: {
      endpoint_wait_ms: number;
      stt_ms: number;
      plan_ms: number;
      draft_ms: number;
      verify_ms: number;
      tts_first_ms: number;
      first_audio_ms: number;
      voice_to_voice_ms: number;
      total_ms: number;
      sentences: number;
      audio_ms: number;
      tts_engine: string;
      opener_used: boolean;
      interrupted: boolean;
    };
  };
};

export type VoiceEvent =
  | {
      type: "ready";
      tts: string;
      persona_voices: Record<string, string>;
      recognition: string;
      turn_end_ms: number;
    }
  | { type: "started"; topic: string; persona: string; reply_length: string }
  | { type: "state"; state: VoiceState }
  | VoiceCaption
  | VoiceTranscript
  | {
      type: "reply";
      text: string;
      verified: boolean;
      redirect_reason?: string | null;
      guard_pattern?: string | null;
    }
  | { type: "delivery"; signals: DeliverySignals }
  | VoiceDiagnostics
  | { type: "notice"; message: string; reason?: string; stt?: { ms: number; words: number } }
  | { type: "error"; message: string; retry_after?: number; recoverable?: boolean }
  | { type: "pong" };

export type VoiceConfig = {
  topic: string;
  learner_position: "for" | "against";
  persona: "strategist" | "skeptic" | "diplomat";
  difficulty: "warm-up" | "challenge" | "cross-examination";
  preferences?: PracticePreferences | null;
  adaptive_tactics?: boolean;
  model?: LocalModel;
  reset?: boolean;
  history?: Array<{ speaker: "learner" | "opponent"; content: string }>;
};

export type UtteranceMode = "push_to_talk" | "hands_free";

function socketUrl() {
  // A blank VITE_API_BASE_URL leaves apiUrl() relative, and `new URL` throws on a
  // relative URL without a base. Resolve against the page, so dev goes through
  // the Vite proxy and a configured origin stays absolute.
  const url = new URL(apiUrl("/ws/voice"), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * A thin WebSocket client: one queue, JSON text frames and binary audio frames.
 *
 * Binary frames are only ever the audio for the caption immediately before
 * them, so the caller never has to guess what a blob contains.
 */
export class VoiceClient {
  private socket: WebSocket | null = null;
  private audioQueue: Promise<void> = Promise.resolve();
  private closeNotified = false;

  constructor(
    private readonly options: {
      token?: string;
      onEvent: (event: VoiceEvent) => void;
      onAudio: (audio: Blob) => void | Promise<void>;
      onClose: (reason: string, code?: number) => void;
      onOpen: () => void;
    },
  ) {}

  connect() {
    const socket = new WebSocket(socketUrl());
    socket.binaryType = "blob";
    this.socket = socket;
    this.closeNotified = false;
    // The token arrives in a frame after the handshake, never in the URL.
    // The server sends `authenticated` before it sends `ready`.
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "auth",
        ...(this.options.token ? { token: this.options.token } : {}),
      }));
    };
    socket.onclose = (event) => {
      const reason = event.reason || (event.code === 1000 ? "Voice session closed." : `Voice session closed (${event.code}).`);
      this.notifyClose(reason, event.code);
    };
    socket.onerror = () => this.notifyClose("Voice connection failed. Typed turns still work.", 1006);
    socket.onmessage = (message) => {
      if (typeof message.data === "string") {
        try {
          const event = JSON.parse(message.data) as VoiceEvent | { type: "authenticated" };
          if (event.type === "authenticated") {
            this.options.onOpen();
            return;
          }
          this.options.onEvent(event as VoiceEvent);
        } catch {
          /* A malformed frame must not kill the session. */
        }
        return;
      }
      if (message.data instanceof Blob) {
        // Decode clips in server order before scheduling them for playback.
        this.audioQueue = this.audioQueue
          .then(() => this.options.onAudio(message.data as Blob))
          .then(() => undefined)
          .catch(() => undefined);
      }
    };
  }

  private notifyClose(reason: string, code?: number) {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.options.onClose(reason, code);
  }

  private send(payload: object) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }

  start(config: VoiceConfig) {
    this.send({ type: "start", ...config });
  }

  utteranceStart(speechEndMs: number, mode: UtteranceMode, editWindow: boolean) {
    this.send({
      type: "utterance_start",
      speech_end_ms: speechEndMs,
      mode,
      edit_window: editWindow,
    });
  }

  sendAudio(audio: Blob) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(audio);
  }

  /** Send a spoken turn in one call: the metadata, then the clip. */
  speak(audio: Blob, mode: UtteranceMode, editWindow: boolean) {
    this.utteranceStart(Date.now(), mode, editWindow);
    this.sendAudio(audio);
  }

  sendText(text: string) {
    this.send({ type: "text", text });
  }

  confirm(text?: string) {
    this.send({ type: "confirm", text });
  }

  dismiss() {
    this.send({ type: "dismiss" });
  }

  /** Ask the moderator voice to open or resume the round after configuration. */
  announce(continuing = false) {
    this.send({ type: "announce", continuing });
  }

  interrupt(playedCaptions: number) {
    this.send({ type: "interrupt", played: playedCaptions });
  }

  close() {
    this.send({ type: "stop" });
    this.socket?.close();
    this.socket = null;
  }
}

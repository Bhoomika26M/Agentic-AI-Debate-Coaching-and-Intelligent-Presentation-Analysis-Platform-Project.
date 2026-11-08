import { useCallback, useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { TARGET_SAMPLE_RATE, mergeChunks, trimSilence, wavFromChunks } from "../../utils/wav";

/**
 * Microphone capture for voice turns.
 *
 * Two paths, deliberately:
 *  - push to talk records raw samples and builds a 16 kHz WAV on release;
 *  - hands-free runs Silero VAD in the page (WASM, no network) and hands over
 *    the clip it isolated.
 *
 * No SpeechRecognition / Web Speech input anywhere: Chrome's recogniser sends
 * the audio to a cloud service, which this project does not allow.
 */

export type Utterance = { blob: Blob; durationMs: number; mode: "push_to_talk" | "hands_free" };

type Options = {
  onUtterance: (utterance: Utterance) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onLevel?: (probability: number) => void;
  /** Barge-in gating: when false, the mic is paused while the opponent speaks. */
  turnEndMs?: number;
};

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
};

export function useSpeechInput(options: Options) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const recordingRef = useRef(false);
  const pushToTalkPressedRef = useRef(false);
  const startingVadRef = useRef(false);
  const mountedRef = useRef(true);
  const startedAtRef = useRef(0);
  const vadRef = useRef<MicVAD | null>(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [level, setLevel] = useState(0);
  const levelAtRef = useRef(0);
  const [handsFree, setHandsFree] = useState(false);
  const [startingHandsFree, setStartingHandsFree] = useState(false);

  const release = useCallback(() => {
    recordingRef.current = false;
    setLevel(0);
    pushToTalkPressedRef.current = false;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      release();
      void vadRef.current?.destroy();
      vadRef.current = null;
    };
  }, [release]);

  // Keep the meter cheap: one state update per ~80 ms is plenty for a level.
  const publishLevel = useCallback((value: number) => {
    const now = performance.now();
    if (now - levelAtRef.current < 80) return;
    levelAtRef.current = now;
    setLevel(Math.max(0, Math.min(1, value)));
  }, []);

  const ensureStream = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser cannot record audio.");
    }
    streamRef.current = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
    return streamRef.current;
  }, []);

  const startPushToTalk = useCallback(async () => {
    if (pushToTalkPressedRef.current || recordingRef.current) return;
    pushToTalkPressedRef.current = true;
    setError("");
    try {
      const stream = await ensureStream();
      // getUserMedia can resolve after the learner has already released the
      // button while accepting the browser's permission prompt.
      if (!pushToTalkPressedRef.current) {
        release();
        return;
      }
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = contextRef.current ?? new Ctor();
      contextRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      processor.onaudioprocess = (event) => {
        if (!recordingRef.current) return;
        const samples = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(samples));
        let energy = 0;
        for (let index = 0; index < samples.length; index += 1) energy += samples[index] * samples[index];
        publishLevel(Math.sqrt(energy / samples.length) * 7);
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      sourceRef.current = source;
      processorRef.current = processor;
      recordingRef.current = true;
      startedAtRef.current = performance.now();
      setListening(true);
      // Same hook the VAD path uses, so the voice room can show it is hearing
      // the learner (and clear the previous transcript) in both modes.
      optionsRef.current.onSpeechStart();
    } catch {
      pushToTalkPressedRef.current = false;
      release();
      setListening(false);
      setLevel(0);
      setError("Microphone access failed. Allow the microphone, or close voice mode and type your turn.");
    }
  }, [ensureStream, publishLevel, release]);

  const stopPushToTalk = useCallback(() => {
    pushToTalkPressedRef.current = false;
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setListening(false);
    setLevel(0);
    const rate = contextRef.current?.sampleRate ?? TARGET_SAMPLE_RATE;
    const durationMs = performance.now() - startedAtRef.current;
    const blob = wavFromChunks(chunksRef.current, rate);
    chunksRef.current = [];
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    processorRef.current?.disconnect();
    processorRef.current = null;
    if (blob.size < 2 * 44 + TARGET_SAMPLE_RATE) {
      // Under ~0.5 s of audio: a click, not a turn.
      setError("Hold the key a little longer so the turn registers.");
      return;
    }
    optionsRef.current.onSpeechEnd();
    optionsRef.current.onUtterance({ blob, durationMs, mode: "push_to_talk" });
  }, []);

  const startHandsFree = useCallback(async () => {
    if (startingVadRef.current || handsFree) return;
    startingVadRef.current = true;
    setStartingHandsFree(true);
    setError("");
    try {
      let vad = vadRef.current;
      if (!vad) {
        vad = await MicVAD.new({
          baseAssetPath: "/vad/",
          // Keep ONNX's ESM glue bundled by Vite. Point only the binary at
          // public/; using a string base path makes ONNX dynamically import
          // /vad/ort-wasm-*.mjs, which Vite correctly rejects as a public import.
          onnxWASMBasePath: "",
          ortConfig: (ort) => {
            ort.env.wasm.wasmPaths = { wasm: "/vad/ort-wasm-simd-threaded.wasm" };
          },
          startOnLoad: false,
          positiveSpeechThreshold: 0.55,
          negativeSpeechThreshold: 0.3,
          // Debaters pause to think; a 200 ms cutoff would slice turns in half.
          redemptionMs: optionsRef.current.turnEndMs ?? 1100,
          minSpeechMs: 400,
          preSpeechPadMs: 200,
          onSpeechStart: () => {
            setListening(true);
            optionsRef.current.onSpeechStart();
          },
          onSpeechEnd: (audio: Float32Array) => {
            setListening(false);
            optionsRef.current.onSpeechEnd();
            const pcm = trimSilence(audio);
            if (pcm.length < TARGET_SAMPLE_RATE * 0.4) return;
            const blob = new Blob(
              [new Blob([new Uint8Array(encodeWav(pcm, TARGET_SAMPLE_RATE))], { type: "audio/wav" })],
              { type: "audio/wav" },
            );
            optionsRef.current.onUtterance({
              blob,
              durationMs: (pcm.length / TARGET_SAMPLE_RATE) * 1000,
              mode: "hands_free",
            });
          },
          onFrameProcessed: (probabilities: { isSpeech: number }) => {
            publishLevel(probabilities.isSpeech);
            optionsRef.current.onLevel?.(probabilities.isSpeech);
          },
        });
        if (!mountedRef.current) {
          await vad.destroy();
          return;
        }
        vadRef.current = vad;
      }
      await vad.start();
      if (mountedRef.current) setHandsFree(true);
    } catch {
      if (mountedRef.current) {
        setError("Hands-free could not start. Check microphone permission and local voice assets; push-to-talk is still available.");
        setHandsFree(false);
      }
    } finally {
      startingVadRef.current = false;
      if (mountedRef.current) setStartingHandsFree(false);
    }
  }, [handsFree, publishLevel]);

  const stopHandsFree = useCallback(async () => {
    await vadRef.current?.pause();
    setHandsFree(false);
    setListening(false);
    setLevel(0);
  }, []);

  const pause = useCallback(() => {
    void vadRef.current?.pause();
    setListening(false);
    setLevel(0);
  }, []);

  const resume = useCallback(() => {
    void vadRef.current?.start().catch(() => {
      setError("Hands-free paused unexpectedly. Turn it off and on again, or use push-to-talk.");
      setHandsFree(false);
      setListening(false);
    });
  }, []);

  return {
    error,
    listening,
    level,
    handsFree,
    startingHandsFree,
    startPushToTalk,
    stopPushToTalk,
    startHandsFree,
    stopHandsFree,
    pause,
    resume,
    release,
  };
}

/** Minimal 16-bit WAV writer for the VAD path, where the samples are already 16 kHz. */
function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length * 2, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

export { mergeChunks };

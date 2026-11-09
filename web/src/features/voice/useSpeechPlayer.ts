import { useCallback, useEffect, useRef, useState } from "react";

/**
 * WebAudio playback for the opponent's sentences.
 *
 * Clips are decoded and scheduled back to back so the reply sounds continuous,
 * and `stop()` cuts every source immediately: that is the barge-in guarantee.
 * Every clip reports when it actually starts, so a caption is only lit while
 * its audio is in the learner's ears.
 */
export type PlayerState = {
  playing: boolean;
  activeIndex: number | null;
  /** Captions the browser has started playing, for the interrupt report. */
  playedCaptions: number;
};

type PlaybackMeta = { index: number | null; onStart?: () => void };
type ReadyClip = { buffer: AudioBuffer; meta: PlaybackMeta };

// Give the next decoded sentence a chance to arrive before starting a reply.
// This is deliberately small: it removes decode/network seams without making
// the learner wait for the whole answer.
const PREBUFFER_MS = 180;
const PREBUFFER_CLIPS = 2;
const START_LEAD_SEC = 0.03;

export function useSpeechPlayer() {
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextTimeRef = useRef(0);
  const pendingRef = useRef(0);
  const playedRef = useRef(0);
  const generationRef = useRef(0);
  const readyRef = useRef<ReadyClip[]>([]);
  const startTimerRef = useRef(0);
  const startTimersRef = useRef<number[]>([]);
  const [state, setState] = useState<PlayerState>({ playing: false, activeIndex: null, playedCaptions: 0 });

  const context = useCallback(() => {
    if (!contextRef.current) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio is unavailable in this browser.");
      contextRef.current = new Ctor();
    }
    return contextRef.current;
  }, []);

  /** Called from a user gesture so autoplay policy never mutes the opponent. */
  const unlock = useCallback(() => {
    try {
      const ctx = context();
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      return ctx.state === "running";
    } catch {
      return false;
    }
  }, [context]);

  const clear = useCallback(() => {
    generationRef.current += 1;
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
    readyRef.current = [];
    window.clearTimeout(startTimerRef.current);
    startTimerRef.current = 0;
    for (const timer of startTimersRef.current) window.clearTimeout(timer);
    startTimersRef.current = [];
    nextTimeRef.current = 0;
    pendingRef.current = 0;
    window.speechSynthesis?.cancel();
    setState((current) => ({ ...current, playing: false, activeIndex: null }));
  }, []);

  useEffect(() => () => clear(), [clear]);

  const scheduleReady = useCallback(() => {
    const ctx = contextRef.current;
    const ready = readyRef.current;
    if (!ctx || ready.length === 0) return;

    // An opener or moderator line should start immediately. A reply waits only
    // long enough either for a second sentence to be decoded or for the short
    // prebuffer window to expire, so the first sentence is not delayed.
    const firstIsSpeech = ready[0].meta.index !== null;
    if (nextTimeRef.current === 0 && firstIsSpeech && ready.length < PREBUFFER_CLIPS) {
      if (startTimerRef.current !== 0) return;
      startTimerRef.current = window.setTimeout(() => {
        startTimerRef.current = 0;
        scheduleReady();
      }, PREBUFFER_MS);
      return;
    }
    if (startTimerRef.current !== 0) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = 0;
    }

    let cursor = nextTimeRef.current > 0
      ? Math.max(ctx.currentTime + START_LEAD_SEC, nextTimeRef.current)
      : ctx.currentTime + START_LEAD_SEC;
    const generation = generationRef.current;
    for (const { buffer, meta } of ready) {
      const startAt = Math.max(ctx.currentTime + 0.01, cursor);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (generation !== generationRef.current) return;
        sourcesRef.current = sourcesRef.current.filter((current) => current !== source);
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) {
          nextTimeRef.current = 0;
          setState((current) => ({ ...current, playing: false, activeIndex: null }));
        }
      };
      pendingRef.current += 1;
      source.start(startAt);
      sourcesRef.current.push(source);
      cursor = startAt + buffer.duration;

      const timer = window.setTimeout(
        () => {
          startTimersRef.current = startTimersRef.current.filter((current) => current !== timer);
          if (generation !== generationRef.current) return;
          if (meta.onStart) meta.onStart();
          if (meta.index !== null) playedRef.current = Math.max(playedRef.current, meta.index + 1);
          setState((current) => ({ ...current, activeIndex: meta.index, playedCaptions: playedRef.current }));
        },
        Math.max(0, (startAt - ctx.currentTime) * 1000),
      );
      startTimersRef.current.push(timer);
    }
    readyRef.current = [];
    nextTimeRef.current = cursor;
    setState({ playing: true, activeIndex: null, playedCaptions: playedRef.current });
  }, []);

  const enqueue = useCallback(
    async (audio: Blob, meta: PlaybackMeta) => {
      const generation = generationRef.current;
      let ctx: AudioContext;
      let buffer: AudioBuffer;
      try {
        ctx = context();
        if (ctx.state === "suspended") void ctx.resume().catch(() => {});
        buffer = await ctx.decodeAudioData(await audio.arrayBuffer());
      } catch {
        return;
      }
      if (generation !== generationRef.current) return;
      readyRef.current.push({ buffer, meta });
      scheduleReady();
    },
    [context, scheduleReady],
  );

  /** The no-TTS path: the browser's own voice, at the persona's pace. */
  const speak = useCallback(
    (sentences: string[], rate: number, onIndex?: (index: number) => void, onDone?: () => void) => {
      if (!window.speechSynthesis || sentences.length === 0) return false;
      clear();
      const generation = generationRef.current;
      sentences.forEach((sentence, index) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.onstart = () => {
          if (generation !== generationRef.current) return;
          playedRef.current = Math.max(playedRef.current, index + 1);
          onIndex?.(index);
          setState((current) => ({ ...current, playing: true, activeIndex: index, playedCaptions: playedRef.current }));
        };
        utterance.onend = () => {
          if (generation !== generationRef.current || index !== sentences.length - 1) return;
          setState((current) => ({ ...current, playing: false, activeIndex: null }));
          onDone?.();
        };
        utterance.onerror = () => {
          if (generation !== generationRef.current || index !== sentences.length - 1) return;
          setState((current) => ({ ...current, playing: false, activeIndex: null }));
        };
        window.speechSynthesis.speak(utterance);
      });
      setState({ playing: true, activeIndex: 0, playedCaptions: playedRef.current });
      return true;
    },
    [clear],
  );

  /** A debate bell, synthesised here so there is no audio asset or licence. */
  const bell = useCallback(() => {
    try {
      const ctx = context();
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
      const strike = (when: number, frequency: number) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
        gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + when + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + 0.9);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(ctx.currentTime + when);
        oscillator.stop(ctx.currentTime + when + 1.1);
      };
      strike(0, 1046.5);
      strike(0.18, 1568);
    } catch {
      // The debate remains readable when Web Audio is unavailable.
    }
  }, [context]);

  const resetPlayed = useCallback(() => {
    playedRef.current = 0;
    setState((current) => ({ ...current, playedCaptions: 0 }));
  }, []);

  return { enqueue, speak, bell, stop: clear, unlock, resetPlayed, ...state };
}

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
  /** Captions the browser has finished playing, for the interrupt report. */
  playedCaptions: number;
};

export function useSpeechPlayer() {
  const contextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextTimeRef = useRef(0);
  const pendingRef = useRef(0);
  const playedRef = useRef(0);
  const generationRef = useRef(0);
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
    nextTimeRef.current = 0;
    pendingRef.current = 0;
    window.speechSynthesis?.cancel();
    setState((current) => ({ ...current, playing: false, activeIndex: null }));
  }, []);

  useEffect(() => () => clear(), [clear]);

  const enqueue = useCallback(
    async (audio: Blob, meta: { index: number | null; onStart?: () => void }) => {
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
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime + 0.02, nextTimeRef.current);
      nextTimeRef.current = startAt + buffer.duration;
      pendingRef.current += 1;
      source.onended = () => {
        if (generation !== generationRef.current) return;
        sourcesRef.current = sourcesRef.current.filter((current) => current !== source);
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) {
          setState((current) => ({ ...current, playing: false, activeIndex: null }));
        }
      };
      source.start(startAt);
      sourcesRef.current.push(source);
      setState({ playing: true, activeIndex: null, playedCaptions: playedRef.current });
      window.setTimeout(
        () => {
          if (generation !== generationRef.current) return;
          if (meta.onStart) meta.onStart();
          if (meta.index !== null) playedRef.current = Math.max(playedRef.current, meta.index + 1);
          setState((current) => ({ ...current, activeIndex: meta.index, playedCaptions: playedRef.current }));
        },
        Math.max(0, (startAt - ctx.currentTime) * 1000),
      );
    },
    [context],
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

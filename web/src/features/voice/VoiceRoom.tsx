import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, Headphones, Mic, MicOff, Pause, Send, Square, X } from "lucide-react";
import { VoiceClient, type DeliverySignals, type VoiceCaption, type VoiceDiagnostics, type VoiceEvent } from "../../services/voice-api";
import type { DebateOptions, PracticePreferences } from "../../services/debate-api";
import { personaFor } from "../debate-catalog";
import { OpponentEmblem } from "../../components/OpponentEmblem";
import { useSpeechInput } from "./useSpeechInput";
import { useSpeechPlayer } from "./useSpeechPlayer";
import "./voice.css";

type Props = {
  topic: string;
  position: "for" | "against";
  persona: "strategist" | "skeptic" | "diplomat";
  difficulty: DebateOptions["difficulty"];
  preferences?: PracticePreferences | null;
  accessToken?: string;
  history?: Array<{ speaker: "learner" | "opponent"; content: string }>;
  onTurn?: (speaker: "learner" | "opponent", content: string) => void;
  onClose: () => void;
  onSignIn?: () => void;
};

type Status = "connecting" | "idle" | "listening" | "thinking" | "speaking" | "interrupted" | "closed";

type Line = {
  id: string;
  speaker: "learner" | "opponent";
  content: string;
  interrupted?: boolean;
};

const PERSONA_LABEL: Record<Props["persona"], string> = {
  strategist: "The Strategist",
  skeptic: "The Skeptic",
  diplomat: "The Diplomat",
};

// The browser fallback speaks at the same pace the Kokoro voice would.
const PERSONA_RATE: Record<Props["persona"], number> = { strategist: 0.94, skeptic: 1.06, diplomat: 0.9 };

const STATUS_COPY: Record<Status, string> = {
  connecting: "Opening the voice room",
  idle: "Ready when you are",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  interrupted: "Interrupted",
  closed: "Voice room closed",
};

// Close codes are the honest part of a refused room: say which one happened.
function closeMessage(reason: string, code?: number) {
  if (code === 4401) {
    return "Voice debate needs a signed-in account. Sign in to start, or close this room and continue by text.";
  }
  if (code === 4403) {
    return "The API refused this page's origin. Add it to WEB_ORIGIN and restart the API.";
  }
  if (code === 4429) {
    return "Too many voice turns in a row. Wait a moment, then reopen the room.";
  }
  if (code === 4503) {
    return reason || "Voice authentication is temporarily unavailable. Check the API configuration and try again.";
  }
  if (code === 1011) {
    return reason || "The voice service hit an error. Check the API logs, then reconnect.";
  }
  if (code === 1006) {
    return "Voice could not reach the API. Check that it is running on port 8000, then reconnect.";
  }
  return reason;
}

function sentencesOf(text: string) {
  return text
    .replace(/[*_`#>]+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function VoiceRoom({ topic, position, persona, difficulty, preferences, accessToken, history = [], onTurn, onClose, onSignIn }: Props) {
  const titleId = useId();
  const [status, setStatus] = useState<Status>("connecting");
  const [lines, setLines] = useState<Line[]>(() => history.map((line) => ({
    id: crypto.randomUUID(),
    speaker: line.speaker,
    content: line.content,
  })));
  const [caption, setCaption] = useState("");
  const [delivery, setDelivery] = useState<DeliverySignals | null>(null);
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics["turn"] | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [tts, setTts] = useState<string>("unknown");
  const [turnEndMs, setTurnEndMs] = useState(1100);
  const [headphones, setHeadphones] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [canReconnect, setCanReconnect] = useState(true);
  const [pending, setPending] = useState<{ text: string; deadline: number } | null>(null);
  const [pendingDraft, setPendingDraft] = useState("");
  const [showDev, setShowDev] = useState(false);
  const [reply, setReply] = useState("");

  const clientRef = useRef<VoiceClient | null>(null);
  const captionRef = useRef<VoiceCaption | null>(null);
  const pendingTimerRef = useRef(0);
  const connectionTimerRef = useRef(0);
  const connectionEpochRef = useRef(0);
  const connectedRef = useRef(false);
  const ttsRef = useRef(tts);
  const roomRef = useRef<HTMLDialogElement | null>(null);
  const configRef = useRef({ topic, position, persona, difficulty, preferences, accessToken, history });
  configRef.current = { topic, position, persona, difficulty, preferences, accessToken, history };
  ttsRef.current = tts;
  const chatRef = useRef<HTMLDivElement | null>(null);
  const player = useSpeechPlayer();

  const appendLine = useCallback(
    (speaker: "learner" | "opponent", content: string, interrupted = false) => {
      if (!content.trim()) return;
      setLines((current) => [
        ...current,
        { id: crypto.randomUUID(), speaker, content, interrupted },
      ]);
      onTurn?.(speaker, content);
    },
    [onTurn],
  );

  const input = useSpeechInput({
    turnEndMs,
    onUtterance: ({ blob, mode }) => {
      setNotice("");
      setError("");
      player.resetPlayed();
      setStatus("thinking");
      clientRef.current?.speak(blob, mode, mode === "hands_free");
    },
    onSpeechStart: () => {
      if (status === "speaking") {
        // Barge-in: stop the audio before the server hears about it.
        player.stop();
        clientRef.current?.interrupt(player.playedCaptions);
        setCaption("");
      }
      setStatus("listening");
      setNotice("");
    },
    onSpeechEnd: () => setStatus("thinking"),
  });
  const inputRef = useRef(input);
  inputRef.current = input;

  const confirmPending = useCallback(
    (text?: string) => {
      window.clearTimeout(pendingTimerRef.current);
      setPending(null);
      setPendingDraft("");
      if (text !== undefined) clientRef.current?.confirm(text);
      else clientRef.current?.confirm();
    },
    [],
  );

  const handleEvent = useCallback(
    (event: VoiceEvent) => {
      switch (event.type) {
        case "ready":
          ttsRef.current = event.tts;
          setTts(event.tts);
          setTurnEndMs(event.turn_end_ms || 1100);
          break;
        case "started":
          connectedRef.current = true;
          window.clearTimeout(connectionTimerRef.current);
          setStatus("idle");
          player.bell();
          // The fourth voice opens the round; it never argues.
          clientRef.current?.announce(history.length > 0);
          break;
        case "state":
          setStatus(event.state);
          if (event.state === "listening") {
            setCaption("");
            setReply("");
          }
          if (event.state === "speaking") {
            setNotice("");
          }
          break;
        case "transcript":
          if (event.speaker === "learner") {
            if (event.pending) {
              setPending({ text: event.content, deadline: Date.now() + (event.edit_window_ms ?? 1500) });
              setPendingDraft(event.content);
              window.clearTimeout(pendingTimerRef.current);
              // The learner gets a moment to fix a recognition error before it
              // reaches the guard or the model.
              pendingTimerRef.current = window.setTimeout(() => confirmPending(), event.edit_window_ms ?? 1500);
              setStatus("thinking");
            } else {
              appendLine("learner", event.content);
              setStatus("thinking");
            }
          } else {
            appendLine("opponent", event.content, event.interrupted);
            if (event.interrupted) {
              setStatus("interrupted");
              player.stop();
            }
          }
          break;
        case "caption":
          captionRef.current = event;
          if (!event.opener && !event.moderator) setCaption(event.text);
          if (event.moderator) setNotice(event.text);
          break;
        case "reply":
          setReply(event.text);
          if (ttsRef.current === "none") {
            // No server voice: the browser speaks, one sentence at a time.
            const parts = sentencesOf(event.text);
            const started = player.speak(
              parts,
              PERSONA_RATE[persona],
              (index) => setCaption(parts[index] ?? ""),
              () => setCaption(""),
            );
            if (!started) setNotice("This browser cannot play speech. Read the opponent's reply in the exchange.");
          }
          break;
        case "delivery":
          setDelivery(event.signals);
          break;
        case "diagnostics":
          setDiagnostics(event.turn);
          break;
        case "notice":
          setNotice(event.message);
          setStatus("listening");
          break;
        case "error":
          setError(event.message);
          setStatus("idle");
          break;
        default:
          break;
      }
    },
    [appendLine, confirmPending, history, persona, player],
  );
  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = handleEvent;

  useEffect(() => {
    const epoch = ++connectionEpochRef.current;
    connectedRef.current = false;
    setStatus("connecting");
    setError("");
    const client = new VoiceClient({
      token: configRef.current.accessToken,
      onOpen: () => {
        const config = configRef.current;
        client.start({
          topic: config.topic,
          learner_position: config.position,
          persona: config.persona,
          difficulty: config.difficulty,
          preferences: config.preferences ?? undefined,
          reset: true,
          history: config.history.slice(-200),
        });
      },
      onEvent: (event) => handleEventRef.current(event),
      onAudio: async (blob) => {
        const meta = captionRef.current;
        await player.enqueue(blob, {
          index: meta && !meta.opener ? meta.index : null,
          onStart: () => {
            if (meta && !meta.opener) setCaption(meta.text);
          },
        });
      },
      onClose: (reason, code) => {
        if (epoch !== connectionEpochRef.current) return;
        window.clearTimeout(connectionTimerRef.current);
        setCanReconnect(code !== 4401 && code !== 4403);
        setStatus("closed");
        setError(closeMessage(reason, code));
      },
    });
    clientRef.current = client;
    try {
      client.connect();
      connectionTimerRef.current = window.setTimeout(() => {
        if (epoch !== connectionEpochRef.current || connectedRef.current) return;
        connectionEpochRef.current += 1;
        client.close();
        setCanReconnect(true);
        setStatus("closed");
        setError("The voice service did not answer. Check that the debate API is running, then reconnect.");
      }, 15000);
    } catch {
      connectionEpochRef.current += 1;
      setCanReconnect(true);
      setStatus("closed");
      setError("The voice connection could not be opened. Check the API address and try again.");
    }
    return () => {
      window.clearTimeout(pendingTimerRef.current);
      window.clearTimeout(connectionTimerRef.current);
      if (connectionEpochRef.current === epoch) connectionEpochRef.current += 1;
      client.close();
      player.stop();
      clientRef.current = null;
    };
    // The room is a session: reconnect only on an explicit retry, never on a render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionAttempt]);

  useEffect(() => {
    const dialog = roomRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".voice-close")?.focus();
    return () => {
      window.clearTimeout(connectionTimerRef.current);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // Keep hands-free capture out of both the opponent's thinking and speaking turns.
  useEffect(() => {
    if (!input.handsFree) return;
    if (status === "thinking" || (status === "speaking" && !headphones)) inputRef.current.pause();
    else inputRef.current.resume();
  }, [status, headphones, input.handsFree]);

  const speaking = status === "speaking";
  const canListen = status === "idle" || status === "listening" || status === "interrupted";
  const canPushToTalk = canListen && !pending && !input.handsFree && !input.startingHandsFree;

  const interrupt = useCallback(() => {
    player.stop();
    clientRef.current?.interrupt(player.playedCaptions);
    setCaption("");
    setStatus("interrupted");
  }, [player]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!pending) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [pending]);
  const timer = pending ? Math.max(0, pending.deadline - now) : 0;
  const opponent = personaFor(persona);

  const reconnect = () => {
    setError("");
    setCanReconnect(true);
    setStatus("connecting");
    setConnectionAttempt((attempt) => attempt + 1);
  };

  const closeDialog = () => onClose();

  const handsFreeActive = input.handsFree;
  const canToggleHandsFree = canListen || handsFreeActive;
  const fallbackCaption = status === "thinking"
    ? "Composing a reply…"
    : status === "connecting"
      ? "Connecting to the debate service…"
      : reply
        ? "Reply text is in the exchange."
        : "Their words will appear here as they speak.";
  const pushToTalkLabel = input.startingHandsFree
    ? "Starting hands-free…"
    : input.handsFree
      ? input.listening ? "Listening…" : "Hands-free on"
      : input.listening
        ? "Release to send"
        : status === "connecting"
          ? "Connecting…"
          : status === "thinking"
            ? "Opponent is thinking"
            : status === "closed"
              ? "Room unavailable"
              : "Hold to speak";
  const pushToTalkAccessibleLabel = input.startingHandsFree
    ? "Hands-free microphone is starting"
    : input.handsFree
      ? input.listening ? "Hands-free microphone is listening" : "Hands-free mode is on; speak when ready"
      : input.listening
        ? "Release to send your spoken turn"
        : status === "connecting"
          ? "Voice debate is connecting"
          : status === "thinking"
            ? "Wait for your opponent to finish thinking"
            : status === "closed"
              ? "Voice debate is unavailable; reconnect above"
              : "Hold to speak your turn";

  return createPortal(
    <dialog
      ref={roomRef}
      className="voice-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      <section className={`voice-room is-${status}`} aria-label="Voice debate">
        <header className="voice-topbar">
          <div className="voice-brand" aria-label="Verdict voice rehearsal">
            <span className="voice-brand-mark"><BookOpenText size={16} /></span>
            <span>VERDICT<span className="voice-brand-period">.</span></span>
          </div>
          <div className={`voice-status state-${status}`} role="status" aria-live="polite">
            <span className="voice-status-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>{STATUS_COPY[status]}</span>
          </div>
          <div className="voice-top-actions">
            <button type="button" className="voice-ghost" onClick={() => setShowDev((value) => !value)} aria-pressed={showDev}>
              {showDev ? "Hide timings" : "Timings"}
            </button>
            <button type="button" className="voice-close" onClick={closeDialog} aria-label="Close voice debate">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="voice-title-row">
          <div className="voice-persona-title">
            <h1 id={titleId}>{PERSONA_LABEL[persona]}</h1>
            <p>Debating <strong>{position === "for" ? "for" : "against"}</strong> the motion</p>
          </div>
          <div className="voice-motion-slip">
            <span>THE MOTION</span>
            <p>{topic}</p>
          </div>
        </div>

        {(error || input.error || notice) && (
          <div className="voice-alerts">
            {error && (
              <div className="voice-error" role="alert">
                <p>{error}</p>
                {status === "closed" && canReconnect && (
                  <button type="button" className="voice-reconnect" onClick={reconnect}>Reconnect</button>
                )}
                {status === "closed" && !canReconnect && error.startsWith("Voice debate needs a signed-in account") && onSignIn && (
                  <button type="button" className="voice-reconnect" onClick={onSignIn}>Sign in</button>
                )}
              </div>
            )}
            {input.error && <div className="voice-error" role="alert"><p>{input.error}</p></div>}
            {notice && <div className="voice-notice" role="status">{notice}</div>}
          </div>
        )}

        <main className="voice-layout">
          <section className="voice-transcript-panel" aria-label="Debate exchange">
            <div className="voice-transcript-heading">
              <div>
                <h2>The exchange</h2>
                <p>{difficulty.replace(/-/g, " ")} · spoken turns appear here</p>
              </div>
              <span className="voice-turn-count">{String(lines.length).padStart(2, "0")} TURNS</span>
            </div>
            <div className="voice-chat" ref={chatRef} role="log" aria-label="Debate transcript" aria-live="polite" aria-relevant="additions text">
              {lines.length === 0 && (
                <div className="voice-empty">
                  <Mic size={18} aria-hidden="true" />
                  {input.error ? (
                    <>
                      <p>Microphone access needs attention.</p>
                      <span>Allow microphone access and try again, or close voice mode to keep debating by text.</span>
                    </>
                  ) : status === "connecting" ? (
                    <>
                      <p>Opening your voice debate.</p>
                      <span>Your microphone will be ready as soon as the room connects.</span>
                    </>
                  ) : status === "thinking" ? (
                    <>
                      <p>Your opponent is working through your point.</p>
                      <span>The microphone opens again when they finish.</span>
                    </>
                  ) : status === "closed" ? (
                    <>
                      <p>The voice room is unavailable.</p>
                      <span>Reconnect above to try again, or close voice mode to return to typed debate.</span>
                    </>
                  ) : (
                    <>
                      <p>Make your opening point. Your opponent will answer in character.</p>
                      <span>Hold the microphone, or enable hands-free.</span>
                    </>
                  )}
                </div>
              )}
              {lines.map((line) => (
                <article key={line.id} className={`voice-line ${line.speaker}`}>
                  <span className="voice-speaker">{line.speaker === "learner" ? "YOU" : PERSONA_LABEL[persona].toUpperCase()}</span>
                  <p>
                    {line.content}
                    {line.interrupted && <em> — interrupted</em>}
                  </p>
                </article>
              ))}
            </div>

            {pending && (
              <div className="voice-pending" role="group" aria-label="Confirm what you said">
                <label htmlFor="voice-pending-text">Check the transcript</label>
                <input
                  id="voice-pending-text"
                  value={pendingDraft}
                  onChange={(event) => setPendingDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") confirmPending(pendingDraft);
                  }}
                  autoFocus
                />
                <div className="voice-pending-actions">
                  <button type="button" className="voice-primary" onClick={() => confirmPending(pendingDraft)}>
                    <Send size={15} /> Send · {Math.ceil(timer / 1000)}s
                  </button>
                  <button
                    type="button"
                    className="voice-ghost voice-ghost-paper"
                    onClick={() => {
                      window.clearTimeout(pendingTimerRef.current);
                      setPending(null);
                      setPendingDraft("");
                      clientRef.current?.dismiss();
                    }}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="voice-desk" aria-label="Voice controls">
            <div className={`voice-opponent tone-${opponent.color}`}>
              <div className="voice-sigil"><OpponentEmblem persona={persona} label={`${PERSONA_LABEL[persona]} emblem`} /></div>
              <div>
                <span className="voice-opponent-label">YOUR OPPONENT</span>
                <h2>{opponent.name}</h2>
                <p>{opponent.title} · {opponent.style.toLowerCase()}</p>
              </div>
            </div>

            <div className={`voice-caption${status === "speaking" ? " is-speaking" : ""}`} aria-live="polite">
              <span>IN THEIR WORDS</span>
              <p>{caption || fallbackCaption}</p>
            </div>

            {delivery && (
              <div className="voice-delivery" aria-label="Delivery signals for the latest turn">
                <span>{Math.round(delivery.wpm)} WPM</span>
                <span>{delivery.fillers} filler{delivery.fillers === 1 ? "" : "s"}</span>
                <span>{delivery.pauses} pause{delivery.pauses === 1 ? "" : "s"}</span>
              </div>
            )}

            <div className="voice-controls">
              {speaking ? (
                <button type="button" className="voice-primary voice-interrupt" onClick={interrupt}>
                  <Pause size={16} /> Interrupt reply
                </button>
              ) : (
                <button
                  type="button"
                  className={`voice-primary voice-hold${input.listening ? " holding" : ""}`}
                  disabled={!canPushToTalk}
                  onPointerDown={() => {
                    player.unlock();
                    void input.startPushToTalk();
                  }}
                  onPointerUp={() => input.stopPushToTalk()}
                  onPointerCancel={() => input.stopPushToTalk()}
                  onPointerLeave={() => input.listening && input.stopPushToTalk()}
                  onKeyDown={(event) => {
                    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                      event.preventDefault();
                      player.unlock();
                      void input.startPushToTalk();
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === " " || event.key === "Enter") input.stopPushToTalk();
                  }}
                  aria-label={pushToTalkAccessibleLabel}
                >
                  {input.listening && !input.handsFree ? <Square size={16} /> : <Mic size={17} />}
                  {pushToTalkLabel}
                </button>
              )}

              <button
                type="button"
                className={`voice-mode${handsFreeActive ? " on" : ""}`}
                aria-pressed={handsFreeActive}
                disabled={!canToggleHandsFree || input.startingHandsFree}
                onClick={() => {
                  player.unlock();
                  if (handsFreeActive) void input.stopHandsFree();
                  else void input.startHandsFree();
                }}
              >
                {input.startingHandsFree ? <span className="voice-progress-dot" aria-hidden="true" /> : handsFreeActive ? <Mic size={15} /> : <MicOff size={15} />}
                {input.startingHandsFree ? "Starting hands-free…" : handsFreeActive ? "Hands-free on" : "Turn on hands-free"}
              </button>

              <button
                type="button"
                className={`voice-mode${headphones ? " on" : ""}`}
                aria-pressed={headphones}
                onClick={() => setHeadphones((value) => !value)}
                title="With headphones on, you can interrupt while the opponent speaks."
              >
                <Headphones size={15} />
                {headphones ? "Headphones on" : "Using headphones"}
              </button>
            </div>

            <p className="voice-hint">
              {tts === "none"
                ? "Replies use your browser's voice. Your speech is transcribed locally before the local debate API receives it."
                : tts === "unknown"
                  ? "Speech settings arrive when the room connects."
                  : `Reply voice: ${tts}. Pauses of ${turnEndMs} ms end a hands-free turn.`}
              {handsFreeActive && !headphones ? " The mic pauses while your opponent answers." : ""}
            </p>

            {showDev && diagnostics?.voice && (
              <dl className="voice-dev">
                <div><dt>API wait</dt><dd>{diagnostics.voice.endpoint_wait_ms} ms</dd></div>
                <div><dt>Recognition</dt><dd>{diagnostics.voice.stt_ms} ms</dd></div>
                <div><dt>Plan</dt><dd>{diagnostics.voice.plan_ms} ms</dd></div>
                <div><dt>Draft</dt><dd>{diagnostics.voice.draft_ms} ms</dd></div>
                <div><dt>Review</dt><dd>{diagnostics.voice.verify_ms} ms</dd></div>
                <div><dt>First audio</dt><dd>{diagnostics.voice.first_audio_ms} ms</dd></div>
                <div><dt>Voice to voice</dt><dd>{diagnostics.voice.voice_to_voice_ms} ms</dd></div>
                <div><dt>Sentences</dt><dd>{diagnostics.voice.sentences}</dd></div>
              </dl>
            )}
          </aside>
        </main>
      </section>
    </dialog>,
    document.body,
  );
}

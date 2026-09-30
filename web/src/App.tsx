import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  CornerDownLeft,
  Fingerprint,
  Gavel,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Radio,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Swords,
  TimerReset,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  checkBackend,
  streamOpponentReply,
  type DebateMessage,
  type DebateOptions,
} from "./services/debate-api";

type View = "landing" | "setup" | "arena" | "verdict";
type PersonaKey = DebateOptions["persona"];
type BackendState = "checking" | "warming" | "ready" | "offline";

const topics = [
  "Should social platforms verify every user?",
  "Do grades measure what matters?",
  "Should cities ban cars from their centres?",
  "Is a four-day work week better for everyone?",
];

const personas: {
  key: PersonaKey;
  name: string;
  title: string;
  line: string;
  sigil: string;
  color: string;
}[] = [
  {
    key: "strategist",
    name: "The Strategist",
    title: "Reads the room",
    line: "Looks past the headline to the consequences underneath.",
    sigil: "S",
    color: "mint",
  },
  {
    key: "skeptic",
    name: "The Skeptic",
    title: "Follows the proof",
    line: "Finds the assumption hiding between your points.",
    sigil: "?",
    color: "coral",
  },
  {
    key: "diplomat",
    name: "The Diplomat",
    title: "Sees every side",
    line: "Tests your case against the people it affects.",
    sigil: "D",
    color: "violet",
  },
];

const difficultyOptions: { value: DebateOptions["difficulty"]; label: string; detail: string }[] = [
  { value: "warm-up", label: "Warm-up", detail: "Find your footing" },
  { value: "challenge", label: "Challenge", detail: "Push the case" },
  { value: "cross-examination", label: "Cross-exam", detail: "No easy exits" },
];

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32 },
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function Header({ onHome, onStart }: { onHome: () => void; onStart: () => void }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={onHome} aria-label="Verdict home">
        <span className="brand-mark"><Gavel size={17} strokeWidth={2.2} /></span>
        <span>VERDICT<span className="brand-period">.</span></span>
      </button>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href="#how-it-works">The format</a>
        <a href="#opponents">Opponents</a>
        <span className="nav-divider" />
        <span className="local-indicator"><i /> Local demo</span>
      </nav>
      <button className="header-cta" onClick={onStart}>
        Step inside <ArrowUpRight size={15} />
      </button>
    </header>
  );
}

function StatusTag({ state }: { state: BackendState }) {
  const labels: Record<BackendState, string> = {
    checking: "CHECKING LOCAL MODEL",
    warming: "WARMING LOCAL MODEL",
    ready: "LOCAL MODEL READY",
    offline: "MODEL NEEDS A NUDGE",
  };
  return (
    <span className={`status-tag is-${state}`}>
      <i /> {labels[state]}
    </span>
  );
}

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [topicChoice, setTopicChoice] = useState(topics[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");
  const [persona, setPersona] = useState<PersonaKey>("skeptic");
  const [difficulty, setDifficulty] = useState<DebateOptions["difficulty"]>("challenge");
  const [duration, setDuration] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [backendState, setBackendState] = useState<BackendState>("checking");
  const [backendMessage, setBackendMessage] = useState("");
  const [sessionId, setSessionId] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activePersona = useMemo(
    () => personas.find((candidate) => candidate.key === persona) ?? personas[0],
    [persona],
  );
  const activeTopic = customTopic.trim() || topicChoice;
  const learnerTurns = messages.filter((message) => message.speaker === "learner");
  const totalWords = learnerTurns.reduce(
    (count, message) => count + message.content.trim().split(/\s+/).filter(Boolean).length,
    0,
  );

  async function refreshBackend() {
    try {
      const health = await checkBackend();
      setBackendState(
        health.model_loaded ? "ready" : health.model_available ? "warming" : "offline",
      );
      setBackendMessage(
        health.model_loaded
          ? `Connected to ${health.model}. Your debate stays on this machine.`
          : health.model_available
            ? `Warming ${health.model} for your first turn.`
            : `Start Ollama and pull ${health.model} to open the debate room.`,
      );
    } catch {
      setBackendState("offline");
      setBackendMessage("Start the Python service and Ollama to connect your local opponent.");
    }
  }

  useEffect(() => {
    void refreshBackend();
  }, []);

  useEffect(() => {
    if (backendState === "ready") return;
    const poll = window.setInterval(() => void refreshBackend(), 2500);
    return () => window.clearInterval(poll);
  }, [backendState]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  async function requestOpponentReply(
    history: DebateMessage[],
    learnerArgument: string | null,
  ) {
    const options: DebateOptions = {
      topic: activeTopic,
      learner_position: position,
      persona,
      difficulty,
    };
    const replyId = crypto.randomUUID();
    const controller = new AbortController();
    abortRef.current = controller;
    setBackendMessage("");
    setStreaming(true);
    setMessages((current) => [
      ...current,
      { id: replyId, speaker: "opponent", content: "", pending: true },
    ]);

    try {
      await streamOpponentReply(
        options,
        history,
        learnerArgument,
        (delta) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === replyId
                ? { ...message, content: message.content + delta }
                : message,
            ),
          );
        },
        controller.signal,
      );
      setMessages((current) =>
        current.map((message) =>
          message.id === replyId ? { ...message, pending: false } : message,
        ),
      );
      setBackendState("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((current) =>
        current.filter((message) => message.id !== replyId || message.content.length > 0)
          .map((message) => message.id === replyId ? { ...message, pending: false } : message),
      );
      setBackendState("offline");
      setBackendMessage(error instanceof Error ? error.message : "The opponent lost the connection.");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  useEffect(() => {
    if (view === "arena" && sessionId > 0 && messages.length === 0) {
      void requestOpponentReply([], null);
    }
  }, [view, sessionId]);

  useEffect(() => {
    if (view !== "arena" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view === "arena" && secondsLeft === 0) setView("verdict");
  }, [view, secondsLeft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function startSession() {
    setMessages([]);
    setDraft("");
    setSecondsLeft(duration * 60);
    setStartedAt(Date.now());
    setSessionId((current) => current + 1);
    setView("arena");
  }

  function finishSession() {
    abortRef.current?.abort();
    setStreaming(false);
    setView("verdict");
  }

  async function submitArgument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const argument = draft.trim();
    if (!argument || streaming || secondsLeft === 0) return;
    const learnerMessage: DebateMessage = {
      id: crypto.randomUUID(),
      speaker: "learner",
      content: argument,
    };
    setMessages((current) => [...current, learnerMessage]);
    setDraft("");
    await requestOpponentReply(messages, argument);
  }

  function returnHome() {
    abortRef.current?.abort();
    setStreaming(false);
    setView("landing");
    setMessages([]);
    setSessionId(0);
  }

  const elapsed = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

  return (
    <div className={`app-shell ${view === "arena" || view === "verdict" ? "app-shell-room" : ""}`}>
      {view !== "arena" && view !== "verdict" && (
        <Header onHome={returnHome} onStart={() => setView("setup")} />
      )}

      <AnimatePresence mode="wait">
        {view === "landing" && (
          <motion.main key="landing" className="landing" {...pageMotion}>
            <section className="hero-section">
              <div className="hero-noise" />
              <div className="hero-copy">
                <p className="eyebrow"><span className="eyebrow-line" /> THE FLOOR IS YOURS</p>
                <h1>Your argument<br />is <span className="hero-accent">on the record.</span></h1>
                <p className="hero-intro">
                  A debate coach with a point of view. Bring a claim. Meet a mind that pushes back.
                  Leave with a sharper case.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => setView("setup")}>
                    Enter the chamber <ArrowUpRight size={17} />
                  </button>
                  <a className="text-link" href="#how-it-works">See how it works <ArrowDownRight size={16} /></a>
                </div>
                <div className="hero-footnote"><LockKeyhole size={13} /> Local model. Your words stay on your machine.</div>
              </div>

              <div className="hero-scene" aria-label="Preview of a debate case file">
                <div className="scene-grid" />
                <div className="scene-vertical-label">CASE FILE / 001</div>
                <div className="orbit orbit-a" />
                <div className="orbit orbit-b" />
                <div className="scene-stamp">OPEN<br />CASE</div>
                <motion.div
                  className="case-preview"
                  initial={{ opacity: 0, rotate: 5, y: 20 }}
                  animate={{ opacity: 1, rotate: -3, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="case-topline"><span>THE PROPOSITION</span><span>001 — OPEN</span></div>
                  <div className="case-art">
                    <div className="case-ring ring-one" />
                    <div className="case-ring ring-two" />
                    <div className="case-cutout"><span>?</span></div>
                    <div className="case-redbar" />
                    <span className="case-art-caption">EVERY CLAIM<br />HAS A COUNTER.</span>
                  </div>
                  <div className="case-title-row">
                    <div><span className="case-label">TODAY'S QUESTION</span><h2>Who gets<br />the final word?</h2></div>
                    <ArrowUpRight size={24} />
                  </div>
                  <div className="case-bottomline"><span>ONE-ON-ONE / AI</span><span>YOUR MOVE</span></div>
                </motion.div>
                <div className="scene-note"><span className="note-arrow">↗</span><span>NOT A CHAT.<br />A CHALLENGE.</span></div>
              </div>
            </section>

            <section className="intro-strip">
              <div className="intro-small">PRACTICE WITH PURPOSE</div>
              <p>Good arguments aren't born ready.<br /><span>They're tested.</span></p>
              <div className="strip-arrow"><ArrowDownRight size={21} /></div>
            </section>

            <section className="format-section" id="how-it-works">
              <div className="section-heading">
                <p className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> INSIDE THE CHAMBER</p>
                <h2>Think on your feet.<br /><span>Keep your footing.</span></h2>
                <p className="section-subtitle">No scripts. No safe answers. Just a sharp opponent, a live clock, and your next move.</p>
              </div>
              <div className="format-grid">
                <motion.article className="format-card card-claim" whileHover={{ y: -7 }} transition={{ duration: 0.25 }}>
                  <div className="format-card-top"><span>01 / MAKE A CASE</span><Fingerprint size={18} /></div>
                  <div className="claim-visual"><span className="claim-line" /><span className="claim-dot" /><span className="claim-line short" /></div>
                  <h3>Start with a<br />position.</h3>
                  <p>Pick a side, choose a motion, and say what you actually think.</p>
                </motion.article>
                <motion.article className="format-card card-reply" whileHover={{ y: -7 }} transition={{ duration: 0.25 }}>
                  <div className="format-card-top"><span>02 / TAKE THE FLOOR</span><MessageSquareText size={18} /></div>
                  <div className="reply-visual"><span className="reply-pulse"><i /><i /><i /></span><span>OPPONENT IS THINKING</span></div>
                  <h3>Meet your<br />counterpoint.</h3>
                  <p>A distinct AI persona listens, challenges, and answers in real time.</p>
                </motion.article>
                <motion.article className="format-card card-verdict" whileHover={{ y: -7 }} transition={{ duration: 0.25 }}>
                  <div className="format-card-top"><span>03 / LEAVE SHARPER</span><ShieldAlert size={18} /></div>
                  <div className="verdict-visual"><span>CLAIM</span><ArrowRight size={18} /><span>COUNTER</span><ArrowRight size={18} /><b>CLARITY</b></div>
                  <h3>Find the<br />weak point.</h3>
                  <p>Review the exchange and take a clearer argument into your next room.</p>
                </motion.article>
              </div>
            </section>

            <section className="opponents-section" id="opponents">
              <div className="opponents-copy">
                <p className="eyebrow"><span className="eyebrow-line" /> PICK YOUR PRESSURE</p>
                <h2>Three minds.<br />No easy <span>outs.</span></h2>
                <p>Each opponent sees the same motion differently. Choose who you want across the table.</p>
                <button className="button button-outline" onClick={() => setView("setup")}>
                  Choose your opponent <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="opponent-stack">
                {personas.map((person, index) => (
                  <motion.div
                    className={`opponent-tile tone-${person.color}`}
                    key={person.key}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.1, duration: 0.45 }}
                  >
                    <span className="tile-sigil">{person.sigil}</span>
                    <span className="tile-copy"><b>{person.name}</b><small>{person.title}</small></span>
                    <span className="tile-index">0{index + 1}</span>
                    <span className="tile-slash" />
                  </motion.div>
                ))}
                <div className="opponent-stack-caption">AN OPPONENT FOR EVERY BLIND SPOT</div>
              </div>
            </section>

            <section className="closing-section">
              <span className="closing-orbit" />
              <div className="closing-content">
                <p className="eyebrow"><span className="eyebrow-line" /> THE NEXT MOVE IS YOURS</p>
                <h2>Walk in with a claim.<br /><span>Walk out with a case.</span></h2>
                <button className="button button-dark" onClick={() => setView("setup")}>
                  Step into the chamber <ArrowUpRight size={17} />
                </button>
              </div>
              <div className="closing-aside">A PRACTICE ROOM<br />THAT TALKS BACK.</div>
            </section>
            <footer className="site-footer"><span>VERDICT<span className="brand-period">.</span></span><span>THINK CLEAR. SPEAK SHARP.</span><span>LOCAL AI PRACTICE ROOM</span></footer>
          </motion.main>
        )}

        {view === "setup" && (
          <motion.main key="setup" className="setup-page" {...pageMotion}>
            <div className="setup-topline">
              <button className="back-link" onClick={() => setView("landing")}><ArrowLeft size={16} /> Back to introduction</button>
              <StatusTag state={backendState} />
            </div>
            <div className="setup-heading">
              <p className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> BUILD YOUR CASE</p>
              <h1>Set the room.<br /><span>Pick your pressure.</span></h1>
              <p>Your opponent is ready when you are. Set a motion and choose the mind across the table.</p>
            </div>

            <div className="setup-layout">
              <section className="setup-panel motion-panel">
                <div className="panel-heading"><span className="panel-count">01</span><div><h2>The motion</h2><p>What do you want to put on trial?</p></div></div>
                <div className="topic-list">
                  {topics.map((topic, index) => (
                    <button
                      key={topic}
                      className={`topic-option ${topicChoice === topic && !customTopic ? "selected" : ""}`}
                      onClick={() => { setTopicChoice(topic); setCustomTopic(""); }}
                    >
                      <span className="topic-number">0{index + 1}</span><span>{topic}</span>
                      {topicChoice === topic && !customTopic ? <Check size={16} /> : <ArrowUpRight size={14} />}
                    </button>
                  ))}
                </div>
                <label className="custom-topic-label" htmlFor="custom-topic">OR WRITE YOUR OWN</label>
                <input
                  id="custom-topic"
                  className="custom-topic-input"
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value)}
                  onFocus={() => setTopicChoice("")}
                  maxLength={240}
                  placeholder="Should we trust an algorithm with..."
                />
                <div className="position-row">
                  <span className="setting-label">I'M ARGUING</span>
                  <div className="segmented-control">
                    <button className={position === "for" ? "active" : ""} onClick={() => setPosition("for")}>FOR</button>
                    <button className={position === "against" ? "active" : ""} onClick={() => setPosition("against")}>AGAINST</button>
                  </div>
                </div>
              </section>

              <section className="setup-panel opponent-panel">
                <div className="panel-heading"><span className="panel-count">02</span><div><h2>Across the table</h2><p>Choose the lens that tests you best.</p></div></div>
                <div className="persona-list">
                  {personas.map((person) => (
                    <button
                      key={person.key}
                      className={`persona-option tone-${person.color} ${persona === person.key ? "selected" : ""}`}
                      onClick={() => setPersona(person.key)}
                    >
                      <span className="persona-sigil">{person.sigil}</span>
                      <span className="persona-copy"><b>{person.name}</b><small>{person.line}</small></span>
                      <span className="persona-radio">{persona === person.key && <i />}</span>
                    </button>
                  ))}
                </div>

                <div className="setting-block">
                  <div className="setting-line"><span className="setting-label">INTENSITY</span><span className="setting-value">{difficultyOptions.find((option) => option.value === difficulty)?.label}</span></div>
                  <div className="difficulty-options">
                    {difficultyOptions.map((option, index) => (
                      <button className={difficulty === option.value ? "selected" : ""} key={option.value} onClick={() => setDifficulty(option.value)}>
                        <span>0{index + 1}</span><b>{option.label}</b><small>{option.detail}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-block duration-setting">
                  <div className="setting-line"><span className="setting-label">TIME IN THE ROOM</span><span className="setting-value"><Clock3 size={14} /> {duration} MIN</span></div>
                  <input type="range" min="2" max="10" step="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} aria-label="Debate duration in minutes" />
                  <div className="range-labels"><span>2 MIN</span><span>10 MIN</span></div>
                </div>
              </section>
            </div>

            <div className="setup-bottom">
              <div className="local-note"><LockKeyhole size={14} /><span>Your first debate stays on this device. No account needed for the demo.</span></div>
              <button className="button button-dark setup-submit" onClick={startSession} disabled={!activeTopic.trim()}>
                Open the room <ArrowRight size={17} />
              </button>
            </div>
            {backendState === "offline" && (
              <div className="backend-help" role="status">
                <div><Radio size={16} /><span>{backendMessage || "The local model is not connected yet."}</span></div>
                <button onClick={() => void refreshBackend()}><RotateCcw size={14} /> Check again</button>
              </div>
            )}
          </motion.main>
        )}

        {view === "arena" && (
          <motion.main key="arena" className="arena-page" {...pageMotion}>
            <header className="arena-header">
              <button className="arena-brand" onClick={returnHome} aria-label="Return home"><span className="brand-mark"><Gavel size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button>
              <div className="arena-session"><span>LIVE PRACTICE</span><i /> <span>CASE / {String(sessionId).slice(-4).padStart(4, "0")}</span></div>
              <div className="arena-header-actions"><span className="arena-model"><i /> LOCAL MODEL</span><button className="end-button" onClick={finishSession}>End session <X size={15} /></button></div>
            </header>

            <div className="arena-casebar">
              <div><span className="casebar-label">THE MOTION</span><h1>{activeTopic}</h1></div>
              <div className="casebar-side"><span>YOU SPEAK</span><b>{position.toUpperCase()}</b></div>
              <div className={`arena-clock ${secondsLeft < 60 ? "clock-urgent" : ""}`}><TimerReset size={17} /><span>{formatTime(secondsLeft)}</span></div>
            </div>

            <div className="arena-grid">
              <aside className="arena-identity">
                <div className="identity-card">
                  <div className={`identity-portrait tone-${activePersona.color}`}>
                    <div className="portrait-halo" /><div className="portrait-shape" /><span>{activePersona.sigil}</span>
                    <div className="portrait-label">OPPONENT / 0{personas.findIndex((person) => person.key === persona) + 1}</div>
                  </div>
                  <div className="identity-copy"><span>ACROSS THE TABLE</span><h2>{activePersona.name}</h2><p>{activePersona.title}</p></div>
                  <div className="identity-trait"><span>DEBATE STYLE</span><b>{persona === "skeptic" ? "EVIDENCE FIRST" : persona === "strategist" ? "LONG GAME" : "WIDER LENS"}</b></div>
                </div>
                <div className="arena-side-note"><span>YOUR POSITION</span><b>{position === "for" ? "IN FAVOUR" : "AGAINST"}</b><p>Stay with your case. Change your mind only when the argument earns it.</p></div>
                <button className="arena-help" onClick={() => setBackendMessage("Write one clear claim. The opponent will answer that point directly.")}><Sparkles size={14} /> How to make a strong turn</button>
              </aside>

              <section className="transcript-panel" aria-label="Live debate transcript">
                <div className="transcript-heading"><div><span className="eyebrow eyebrow-dark"><span className="eyebrow-line" /> LIVE TRANSCRIPT</span><h2>The floor is open.</h2></div><span className="round-counter"><span>TURN</span> {Math.max(1, learnerTurns.length + 1).toString().padStart(2, "0")}</span></div>
                {backendMessage && (
                  <div className="inline-notice" role="status"><span>{backendMessage}</span>{backendState === "offline" && <button onClick={() => void refreshBackend()}>Retry connection</button>}</div>
                )}
                <div className="transcript-scroll">
                  {messages.length === 0 && (
                    <div className="empty-transcript"><span className="empty-marker"><Sparkles size={17} /></span><p>The room is listening. Your opponent is preparing an opening statement.</p></div>
                  )}
                  {messages.map((message, index) => (
                    <motion.article
                      key={message.id}
                      className={`message-card ${message.speaker === "learner" ? "message-learner" : "message-opponent"}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <div className="message-meta">
                        <span className={`message-speaker ${message.speaker}`}>
                          {message.speaker === "learner" ? "YOUR CASE" : activePersona.name.toUpperCase()}
                        </span>
                        <span>TURN {Math.ceil((index + 1) / 2).toString().padStart(2, "0")}</span>
                      </div>
                      <p>{message.content}{message.pending && <span className="stream-cursor" />}</p>
                      {message.pending && !message.content && <div className="thinking-label"><LoaderCircle size={14} /> FORMULATING A RESPONSE</div>}
                    </motion.article>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="argument-composer" onSubmit={(event) => void submitArgument(event)}>
                  <div className="composer-topline"><span><CornerDownLeft size={13} /> YOUR TURN</span><span>{draft.length} / 1000</span></div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                    placeholder={learnerTurns.length === 0 ? "State your opening case..." : "Answer the point. Make it count."}
                    rows={3}
                    disabled={streaming || secondsLeft === 0}
                  />
                  <div className="composer-bottom"><span>One claim at a time. The room is listening.</span><button className="send-button" disabled={!draft.trim() || streaming || secondsLeft === 0} type="submit">{streaming ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />} <span>{streaming ? "Opponent has the floor" : "Make your case"}</span></button></div>
                </form>
              </section>

              <aside className="room-notes">
                <div className="room-note-heading"><span>THE RECORD</span><span className="record-dot" /></div>
                <div className="record-card"><div className="record-number">{learnerTurns.length.toString().padStart(2, "0")}</div><span>YOUR TURNS</span></div>
                <div className="record-card"><div className="record-number">{totalWords.toString().padStart(2, "0")}</div><span>WORDS ON RECORD</span></div>
                <div className="room-divider" />
                <div className="live-note"><span className="live-note-mark"><Swords size={15} /></span><b>NO SCRIPT.</b><p>Your opponent responds to the argument you make, not a preset sequence.</p></div>
                <div className="room-status"><span>MODEL STATUS</span><b><i /> CONNECTED LOCALLY</b></div>
              </aside>
            </div>
            <div className="arena-bottomline"><span>VERDICT / PRACTICE ROOM</span><span>YOUR ARGUMENT STAYS LOCAL</span><span>SESSION LENGTH {duration} MIN</span></div>
          </motion.main>
        )}

        {view === "verdict" && (
          <motion.main key="verdict" className="verdict-page" {...pageMotion}>
            <header className="verdict-header"><button className="arena-brand" onClick={returnHome}><span className="brand-mark"><Gavel size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button><span>SESSION CLOSED / LOCAL DEMO</span></header>
            <section className="verdict-content">
              <div className="verdict-overline"><span className="verdict-seal"><Gavel size={24} /></span><span>THE SESSION IS IN.</span></div>
              <h1>Make the next<br /><span>case stronger.</span></h1>
              <p className="verdict-summary">You took on <b>{activePersona.name}</b> over the motion: <b>“{activeTopic}”</b></p>
              <div className="verdict-stats">
                <div><span>YOUR TURNS</span><b>{learnerTurns.length.toString().padStart(2, "0")}</b></div>
                <div><span>WORDS ON RECORD</span><b>{totalWords.toString().padStart(2, "0")}</b></div>
                <div><span>TIME IN ROOM</span><b>{formatTime(Math.min(elapsed, duration * 60))}</b></div>
              </div>
              <div className="verdict-note"><span>WHAT HAPPENS NEXT</span><p>This preview records the exchange locally. Argument analysis, fallacy coaching, and session history are coming in the full learner showcase.</p></div>
              <div className="verdict-actions">
                <button className="button button-dark" onClick={() => { setSecondsLeft(duration * 60); setStartedAt(Date.now()); setView("arena"); }}><RotateCcw size={16} /> Review the room</button>
                <button className="button button-light" onClick={() => setView("setup")}>Start another case <ArrowUpRight size={16} /></button>
              </div>
            </section>
            <div className="verdict-footer"><span>VERDICT / CASE CLOSED</span><span>LOCAL AI PRACTICE ROOM</span></div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

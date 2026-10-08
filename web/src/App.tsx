import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  Clock3,
  CornerDownLeft,
  LoaderCircle,
  LockKeyhole,
  Radio,
  RotateCcw,
  Send,
  Sparkles,
  Swords,
  TimerReset,
  X,
} from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  checkBackend,
  streamOpponentReply,
  analyzeDebate,
  requestChallenge,
  requestJudge,
  type AnalysisReport,
  type DebateMessage,
  type DebateOptions,
  type JudgeVerdict,
} from "./services/debate-api";
import { createDebateRecord, finishDebateRecord, resumeDebateRecord, saveDebateAnalysis, saveDebateTurn } from "./services/debate-records";
import { addBankTopic, listBankTopics, type BankTopic } from "./services/topics";
import { useAuth } from "./features/auth/AuthProvider";
import { supabaseConfigured } from "./features/auth/supabase";
import { OpponentEmblem } from "./components/OpponentEmblem";
import { EmptyCueArt } from "./components/CueArt";
import { MarkdownText } from "./components/Markdown";
import type { PresentationResult } from "./services/presentation-api";

const AccountView = lazy(() => import("./features/auth/AccountView").then((m) => ({ default: m.AccountView })));
const AuthView = lazy(() => import("./features/auth/AuthView").then((m) => ({ default: m.AuthView })));
const PresentationRoom = lazy(() => import("./features/presentation/PresentationRoom").then((m) => ({ default: m.PresentationRoom })));

type View = "landing" | "setup" | "arena" | "verdict" | "auth" | "account" | "present";
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
  color: string;
}[] = [
  {
    key: "strategist",
    name: "The Strategist",
    title: "Reads the room",
    line: "Looks past the headline to the consequences underneath.",
    color: "mint",
  },
  {
    key: "skeptic",
    name: "The Skeptic",
    title: "Follows the proof",
    line: "Finds the assumption hiding between your points.",
    color: "coral",
  },
  {
    key: "diplomat",
    name: "The Diplomat",
    title: "Sees every side",
    line: "Tests your case against the people it affects.",
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

function Header({
  onHome,
  onStart,
  onAccount,
  accountLabel,
  showNav = true,
}: {
  onHome: () => void;
  onStart: () => void;
  onAccount: () => void;
  accountLabel: string;
  showNav?: boolean;
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={onHome} aria-label="Verdict home">
          <span className="brand-mark"><BookOpenText size={17} strokeWidth={2} /></span>
          <span>VERDICT<span className="brand-period">.</span></span>
        </button>
        <div className="header-actions">
          {showNav && (
            <nav className="desktop-nav" aria-label="Main navigation">
              <a href="#how-it-works">The format</a>
              <a href="#opponents">Opponents</a>
              <span className="nav-divider" aria-hidden="true" />
              <span className="local-indicator"><i aria-hidden="true" /> Guest practice open</span>
            </nav>
          )}
          <button className="header-account-link" onClick={onAccount}>{accountLabel}</button>
          <button className="header-cta" onClick={onStart}>
            <span className="cta-full">Open the prompt book</span>
            <span className="cta-short">Start</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {showNav && (
        <nav className="mobile-nav" aria-label="Main navigation">
          <a href="#how-it-works">The format</a>
          <a href="#opponents">Opponents</a>
        </nav>
      )}
    </header>
  );
}

function StatusTag({ state }: { state: BackendState }) {
  const labels: Record<BackendState, string> = {
    checking: "CHECKING AI OPPONENT",
    warming: "WARMING AI OPPONENT",
    ready: "AI OPPONENT READY",
    offline: "AI OPPONENT NEEDS A NUDGE",
  };
  return (
    <span className={`status-tag is-${state}`}>
      <i /> {labels[state]}
    </span>
  );
}

const HASH_VIEWS: View[] = ["landing", "setup", "present", "auth", "account"];

function viewFromHash(): View {
  const hash = window.location.hash.replace("#/", "").replace("#", "");
  return (HASH_VIEWS as string[]).includes(hash) ? (hash as View) : "landing";
}

export default function App() {
  const { session, user, signOut, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>(() => viewFromHash());
  const [topicChoice, setTopicChoice] = useState(topics[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [bankTopics, setBankTopics] = useState<BankTopic[]>([]);
  const [bankNotice, setBankNotice] = useState("");
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
  const [cueSequence, setCueSequence] = useState(0);
  const [cueVisible, setCueVisible] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [recordNotice, setRecordNotice] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [deliveryResult, setDeliveryResult] = useState<PresentationResult | null>(null);
  const [judge, setJudge] = useState<JudgeVerdict | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState("");
  const [challenging, setChallenging] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [helpNotice, setHelpNotice] = useState("");
  const pollAttempts = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedTurnIds = useRef(new Set<string>());

  const activePersona = useMemo(
    () => personas.find((candidate) => candidate.key === persona) ?? personas[0],
    [persona],
  );
  const activeTopic = customTopic.trim() || topicChoice;
  const motionTitles = bankTopics.length > 0 ? bankTopics.map((t) => t.title) : topics;
  const learnerTurns = messages.filter((message) => message.speaker === "learner");
  const totalWords = learnerTurns.reduce(
    (count, message) => count + message.content.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const modelStatusLabel = backendState === "ready"
    ? "READY"
    : backendState === "warming"
      ? "WARMING"
      : backendState === "offline"
        ? "OFFLINE"
        : "CHECKING";

  async function refreshBackend() {
    try {
      const health = await checkBackend();
      pollAttempts.current = 0;
      setBackendState(
        health.model_loaded ? "ready" : health.model_available ? "warming" : "offline",
      );
      setBackendMessage(
        health.model_loaded
          ? `Connected to ${health.model}. Your rehearsal runs in this session.`
          : health.model_available
            ? `Warming ${health.model} for your first turn.`
            : `Start Ollama and pull ${health.model} to open the debate room.`,
      );
    } catch {
      pollAttempts.current += 1;
      setBackendState("offline");
      setBackendMessage("Start the Python service and Ollama to connect your AI opponent.");
    }
  }

  useEffect(() => {
    void refreshBackend();
    const initial = viewFromHash();
    if (initial !== view) setView(initial);
    const onHash = () => {
      const next = viewFromHash();
      setView((current) => (current === next ? current : next));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (backendState === "ready" || pollAttempts.current >= 12) return;
    const poll = window.setInterval(() => void refreshBackend(), 2500);
    return () => window.clearInterval(poll);
  }, [backendState]);

  useEffect(() => {
    if (!user || !supabaseConfigured) {
      setBankTopics([]);
      return;
    }
    let active = true;
    void listBankTopics()
      .then((data) => {
        if (!active) return;
        setBankTopics(data);
        if (data.length > 0) setTopicChoice((current) => current || data[0].title);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user]);

  async function saveMotionToBank() {
    const title = customTopic.trim();
    if (!user || title.length < 3) return;
    setBankNotice("");
    try {
      const saved = await addBankTopic(user.id, title.slice(0, 240));
      setBankTopics((current) => [...current, saved]);
      setCustomTopic("");
      setTopicChoice(saved.title);
      setBankNotice("Motion saved to your bank.");
    } catch {
      setBankNotice("Could not save this motion. Check your connection and try again.");
    }
  }

  useEffect(() => {
    const hash = view === "landing" ? "#/" : `#/${view}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
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
    setCueSequence((current) => current + 1);
    setCueVisible(true);
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
        session?.access_token,
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
    if (!cueVisible) return;
    const cueTimer = window.setTimeout(() => setCueVisible(false), 1050);
    return () => window.clearTimeout(cueTimer);
  }, [cueSequence, cueVisible]);

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
    if (view === "arena" && secondsLeft === 0 && !streaming) {
      setRecordNotice("Time — wrapping up with the reply on screen.");
      finishSession();
    }
  }, [view, secondsLeft, streaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!recordId) return;
    messages.forEach((message, index) => {
      if (message.pending || !message.content.trim() || savedTurnIds.current.has(message.id)) return;
      savedTurnIds.current.add(message.id);
      void saveDebateTurn(recordId, { ...message, turn_index: index })
        .catch(() => {
          savedTurnIds.current.delete(message.id);
          setRecordNotice("This turn is still on screen, but it did not sync to your account. Check the connection before ending the rehearsal.");
        });
    });
  }, [messages, recordId]);

  async function startSession() {
    if (startingSession) return;
    setStartingSession(true);
    setRecordNotice("");
    setAnalysis(null);
    setAnalysisError("");
    setDeliveryResult(null);
    setJudge(null);
    setJudgeError("");
    setMessages([]);
    setDraft("");
    setSecondsLeft(duration * 60);
    setStartedAt(Date.now());
    savedTurnIds.current = new Set();
    let nextRecordId: string | null = null;
    if (user && supabaseConfigured) {
      try {
        nextRecordId = await createDebateRecord({
          topic: activeTopic,
          learner_position: position,
          persona,
          difficulty,
        }, duration);
      } catch {
        setRecordNotice("The debate can continue, but this session could not be saved to your account. Check your Supabase setup.");
      }
    }
    setRecordId(nextRecordId);
    setSessionId((current) => current + 1);
    setView("arena");
    setStartingSession(false);
  }

  async function reviewDebate() {
    if (analysisLoading || learnerTurns.length === 0) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    setJudge(null);
    setJudgeError("");
    try {
      const report = await analyzeDebate({
        topic: activeTopic,
        learner_position: position,
        persona,
        difficulty,
      }, messages, session?.access_token);
      setAnalysis(report);
      if (recordId) {
        try {
          await saveDebateAnalysis(recordId, report);
        } catch {
          setAnalysisError("The review is ready, but could not be saved to your learner archive.");
        }
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "The coach could not review this transcript.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function scoreRehearsal() {
    if (judgeLoading || !analysis) return;
    setJudgeLoading(true);
    setJudgeError("");
    try {
      const verdict = await requestJudge(analysis, deliveryResult, session?.access_token);
      setJudge(verdict);
    } catch (error) {
      setJudgeError(error instanceof Error ? error.message : "The judge could not score this rehearsal. Try again.");
    } finally {
      setJudgeLoading(false);
    }
  }

  function finishSession() {
    abortRef.current?.abort();
    setStreaming(false);
    if (recordId) {
      void finishDebateRecord(recordId).catch(() => {
        setRecordNotice("The transcript is saved, but the rehearsal could not be marked complete. It will remain in your archive.");
      });
    }
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
    setChallengeError("");
    await requestOpponentReply(messages, argument);
  }

  function challengeDepth(current: DebateMessage[] = messages) {
    let depth = 0;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].kind === "challenge") depth += 1;
      else break;
    }
    return depth;
  }

  async function requestFollowUp() {
    const latestLearner = [...messages].reverse().find((m) => m.speaker === "learner" && !m.pending);
    const depth = challengeDepth();
    if (challenging || streaming || !latestLearner || depth >= 2 || secondsLeft === 0) return;
    setChallenging(true);
    setChallengeError("");
    try {
      const options: DebateOptions = {
        topic: activeTopic,
        learner_position: position,
        persona,
        difficulty,
      };
      const result = await requestChallenge(options, messages, latestLearner.content, depth, session?.access_token);
      if (result.done || !result.follow_up) {
        setChallengeError("The coach has no further follow-ups on this turn. Make your next case.");
        return;
      }
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        speaker: "opponent",
        content: result.follow_up as string,
        kind: "challenge",
        challengeDepth: result.depth,
        challengeTarget: result.target_sentence ?? undefined,
      }]);
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : "The coach could not ask a follow-up.");
    } finally {
      setChallenging(false);
    }
  }

  function returnHome() {
    abortRef.current?.abort();
    setStreaming(false);
    setView("landing");
    setMessages([]);
    setSessionId(0);
    setRecordId(null);
    setRecordNotice("");
  }

  function openAccount() {
    if (authLoading) return;
    setView(user ? "account" : "auth");
  }

  async function handleSignOut() {
    await signOut();
    setView("landing");
  }

  async function resumeSession() {
    if (recordId) {
      try {
        await resumeDebateRecord(recordId);
      } catch {
        setRecordNotice("Could not update the saved session status. You can keep debating — this transcript stays in the browser.");
      }
    }
    setSecondsLeft((current) => (current > 0 ? current : duration * 60));
    setStartedAt(Date.now());
    setView("arena");
  }

  const elapsed = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;

  return (
    <div className={`app-shell ${view === "setup" ? "app-shell-setup" : ""} ${view === "arena" || view === "verdict" || view === "present" ? "app-shell-room" : ""}`}>
      {view !== "arena" && view !== "verdict" && (
        <Header
          onHome={returnHome}
          onStart={() => setView("setup")}
          onAccount={openAccount}
          accountLabel={authLoading ? "…" : user ? "Learner space" : "Sign in"}
          showNav={view === "landing"}
        />
      )}

      <AnimatePresence mode="wait">
        {view === "auth" && (
          <motion.div key="auth" className="app-auth-view" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading account access…</div>}>
              <AuthView
                onContinueAsGuest={() => setView("setup")}
                onAuthenticated={() => setView("landing")}
              />
            </Suspense>
          </motion.div>
        )}

        {view === "account" && (
          <motion.div key="account" className="app-shell-room" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading your archive…</div>}>
              {authLoading
                ? <div className="inline-notice" role="status">Checking your sign-in…</div>
                : <AccountView onStart={() => setView("setup")} onSignOut={handleSignOut} />}
            </Suspense>
          </motion.div>
        )}

        {view === "landing" && (
          <motion.main key="landing" className="landing" {...pageMotion}>
            <section className="hero-section">
              <div className="hero-copy">
                <h1>The next line<br />is <span className="hero-accent">yours.</span></h1>
                <p className="hero-intro">
                  Step into a live debate rehearsal. Make your case, meet a distinct opponent, and find your next line under pressure.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => setView("setup")}>
                    Open the prompt book <ArrowUpRight size={17} />
                  </button>
                  <a className="text-link" href="#how-it-works">See how it works <ArrowDownRight size={16} /></a>
                </div>
                <div className="hero-footnote"><LockKeyhole size={13} /> Guest practice open · sign in only to save your work</div>
              </div>

              <div className="hero-scene" role="img" aria-label="A sample page from a live debate prompt book">
                <div className="scene-grid" />
                <div className="scene-vertical-label">PROMPT BOOK / ACT I</div>
                <span className="scene-stamp">CUE<br />01</span>
                <motion.div
                  className="case-preview"
                  initial={{ opacity: 0, rotate: 1, y: 18 }}
                  animate={{ opacity: 1, rotate: 0, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="case-topline"><span>VERDICT · REHEARSAL COPY</span><span>ACT I / CUE 01</span></div>
                  <div className="case-art">
                    <div className="prompt-page">
                      <div className="prompt-page-top"><span>THE MOTION</span><span>OPENING / 01</span></div>
                      <span className="prompt-entrance">OPPONENT ENTERS</span>
                      <h2>Should social<br />platforms verify<br />every user?</h2>
                      <div className="prompt-stage-direction">[ The room goes quiet. Your opening begins. ]</div>
                      <div className="prompt-rule" />
                      <div className="prompt-page-bottom"><span>YOUR SIDE / FOR</span><span>THE FLOOR IS YOURS</span></div>
                    </div>
                  </div>
                  <div className="cue-preview-row">
                    <span className="cue-preview-mark"><BookOpenText size={15} /></span>
                    <div><span className="case-label">LIVE CUE / 01</span><b>Your opening argument</b></div>
                    <span className="cue-preview-state"><i /> READY</span>
                  </div>
                  <div className="case-bottomline"><span>STREAMED EXCHANGE</span><span>AI OPPONENT / {modelStatusLabel}</span></div>
                </motion.div>
                <div className="scene-note"><span className="note-arrow">↗</span><span>LIVE DEBATE<br />IN THREE ACTS</span></div>
              </div>
            </section>

            <section className="intro-strip">
              <div className="intro-small">A ROOM THAT ANSWERS BACK</div>
              <p>Every turn changes the scene.<br /><span>Your words stay at centre stage.</span></p>
              <div className="strip-arrow"><ArrowDownRight size={21} /></div>
            </section>

            <section className="format-section" id="how-it-works">
              <div className="section-heading">
                <h2>One motion.<br /><span>Three beats.</span></h2>
                <p className="section-subtitle">A guided rehearsal with a live opponent, a clock you choose, and your own argument on the page.</p>
              </div>
              <div className="cue-ledger" role="list" aria-label="How a rehearsal runs">
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">01</span>
                  <div className="cue-row-main">
                    <h3>Take a side.</h3>
                    <p>Pick a motion, choose for or against, and open in your own words. The room goes quiet — the floor is yours.</p>
                  </div>
                  <span className="cue-row-tag">ENTRANCE CUE</span>
                </motion.article>
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">02</span>
                  <div className="cue-row-main">
                    <h3>Hold the floor.</h3>
                    <p>A distinct opponent listens, probes the weak joint, and answers in real time. One claim at a time — the cue ribbon marks every reply.</p>
                  </div>
                  <span className="cue-row-tag">RESPONSE CUE</span>
                </motion.article>
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">03</span>
                  <div className="cue-row-main">
                    <h3>Read the room.</h3>
                    <p>Close the session and keep the transcript. Review the exchange and carry a sharper line into the next room.</p>
                  </div>
                  <span className="cue-row-tag">FINAL CUE</span>
                </motion.article>
              </div>
              <div className="ledger-tape" aria-hidden="true"><span>YOUR TURN</span><i /><span>OPPONENT CUE</span><i /><span>YOUR TURN</span><b>STREAMED LIVE</b></div>
            </section>

            <section className="opponents-section" id="opponents">
              <div className="opponents-copy">
                <h2>Choose your<br /><span>scene partner.</span></h2>
                <p>Each opponent sees the same motion differently. Choose who you want across the table.</p>
                <button className="button button-outline" onClick={() => setView("setup")}>
                  Choose your opponent <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="opponent-stack">
                {personas.map((person, index) => (
                  <motion.button
                    type="button"
                    className={`opponent-tile tone-${person.color}`}
                    key={person.key}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ delay: index * 0.1, duration: 0.45 }}
                    onClick={() => { setPersona(person.key); setView("setup"); }}
                    aria-label={`Choose ${person.name} — ${person.title}`}
                  >
                    <span className="tile-sigil" aria-hidden="true"><OpponentEmblem persona={person.key} label={`${person.name} emblem`} /></span>
                    <span className="tile-copy"><b>{person.name}</b><small>{person.title} — {person.line}</small></span>
                    <span className="tile-index" aria-hidden="true">0{index + 1}</span>
                    <span className="tile-slash" aria-hidden="true" />
                  </motion.button>
                ))}
                <div className="opponent-stack-caption">AN OPPONENT FOR EVERY BLIND SPOT</div>
              </div>
            </section>

            <section className="closing-section">
              <span className="closing-orbit" />
              <div className="closing-content">
                <h2>Ready for your<br /><span>opening cue?</span></h2>
                <button className="button button-dark" onClick={() => setView("setup")}>
                  Open the prompt book <ArrowUpRight size={17} />
                </button>
                <button className="button button-light" onClick={() => setView("present")}>
                  Practice delivery solo <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="closing-aside">ACT I / MAKE YOUR CASE<br />ACT II / MEET THE COUNTERPOINT<br />ACT III / TAKE IT WITH YOU</div>
            </section>
            <footer className="site-footer"><span>VERDICT<span className="brand-period">.</span></span><span>THINK CLEAR. SPEAK SHARP.</span><span>AI PRACTICE ROOM</span></footer>
          </motion.main>
        )}

        {view === "setup" && (
          <motion.main key="setup" className="setup-page" {...pageMotion}>
            <div className="setup-topline">
              <button className="back-link" onClick={() => setView("landing")}><ArrowLeft size={16} /> Back to introduction</button>
              <StatusTag state={backendState} />
            </div>
            <div className="setup-heading">
              <h1>Set the scene.<br /><span>Choose your side.</span></h1>
              <p>Pick a motion, choose your scene partner, and set the pace for this rehearsal.</p>
            </div>

            <div className="setup-layout">
              <section className="setup-panel motion-panel">
                <div className="panel-heading"><span className="panel-count">A</span><div><h2>Your motion</h2><p>What do you want to make a case for?</p></div></div>
                <div className="topic-list" role="radiogroup" aria-label="Choose a motion">
                  {motionTitles.map((topic, index) => (
                    <button
                      key={topic}
                      role="radio"
                      aria-checked={topicChoice === topic && !customTopic}
                      aria-pressed={topicChoice === topic && !customTopic}
                      className={`topic-option ${topicChoice === topic && !customTopic ? "selected" : ""}`}
                      onClick={() => { setTopicChoice(topic); setCustomTopic(""); }}
                    >
                      <span className="topic-number">0{index + 1}</span><span>{topic}</span>
                      {topicChoice === topic && !customTopic ? <Check size={16} /> : <ArrowUpRight size={14} />}
                    </button>
                  ))}
                </div>
                <label className="custom-topic-label" htmlFor="custom-topic">OR WRITE A CUSTOM MOTION</label>
                <input
                  id="custom-topic"
                  className="custom-topic-input"
                  value={customTopic}
                  onChange={(event) => setCustomTopic(event.target.value)}
                  onFocus={() => setTopicChoice("")}
                  maxLength={240}
                  placeholder="Should we trust an algorithm with hiring?"
                />
                {user && customTopic.trim().length >= 3 && (
                  <button className="bank-save-link" type="button" onClick={() => void saveMotionToBank()}>
                    Save this motion to my bank
                  </button>
                )}
                {bankNotice && <p className="setup-hint" role="status">{bankNotice}</p>}
                <div className="position-row">
                  <span className="setting-label">I'M ARGUING</span>
                  <div className="segmented-control" role="group" aria-label="Your side">
                    <button aria-pressed={position === "for"} className={position === "for" ? "active" : ""} onClick={() => setPosition("for")}>FOR</button>
                    <button aria-pressed={position === "against"} className={position === "against" ? "active" : ""} onClick={() => setPosition("against")}>AGAINST</button>
                  </div>
                </div>
              </section>

              <section className="setup-panel opponent-panel">
                <div className="panel-heading"><span className="panel-count">B</span><div><h2>Across the room</h2><p>Choose the voice that tests you best.</p></div></div>
                <div className="persona-list" role="radiogroup" aria-label="Choose your opponent">
                  {personas.map((person) => (
                    <button
                      key={person.key}
                      role="radio"
                      aria-checked={persona === person.key}
                      aria-pressed={persona === person.key}
                      className={`persona-option tone-${person.color} ${persona === person.key ? "selected" : ""}`}
                      onClick={() => setPersona(person.key)}
                    >
                      <span className="persona-sigil"><OpponentEmblem persona={person.key} label={`${person.name} emblem`} /></span>
                      <span className="persona-copy"><b>{person.name} <em>· {person.title}</em></b><small>{person.line}</small></span>
                      <span className="persona-radio">{persona === person.key && <i />}</span>
                    </button>
                  ))}
                </div>

                <div className="setting-block">
                  <div className="setting-line"><span className="setting-label">REHEARSAL PRESSURE</span><span className="setting-value">{difficultyOptions.find((option) => option.value === difficulty)?.label}</span></div>
                  <div className="difficulty-options" role="radiogroup" aria-label="Rehearsal pressure">
                    {difficultyOptions.map((option, index) => (
                      <button
                        role="radio"
                        aria-checked={difficulty === option.value}
                        aria-pressed={difficulty === option.value}
                        title={option.value === "cross-examination" ? "Cross-examination" : option.label}
                        className={difficulty === option.value ? "selected" : ""} key={option.value} onClick={() => setDifficulty(option.value)}>
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
              <div className="local-note"><LockKeyhole size={14} /><span>Guest practice open — no account needed. Sign in to keep transcripts in your learner archive.</span></div>
              <button className="button button-dark setup-submit" onClick={() => void startSession()} disabled={!activeTopic.trim() || startingSession}>
                {startingSession ? "Setting the table..." : "Call the first cue"} {!startingSession && <ArrowRight size={17} />}
              </button>
            </div>
            {!activeTopic.trim() && (
              <p className="setup-hint" role="status">Choose a motion above or write a custom one to begin.</p>
            )}
            {backendState === "offline" && (
              <div className="backend-help" role="status">
                <div><Radio size={16} /><span>{backendMessage || "The AI opponent is not connected yet."}</span></div>
                <button onClick={() => void refreshBackend()}><RotateCcw size={14} /> Check again</button>
              </div>
            )}
          </motion.main>
        )}

        {view === "arena" && (
          <motion.main key="arena" className="arena-page" {...pageMotion}>
            <header className="arena-header">
              <button className="arena-brand" onClick={returnHome} aria-label="Return home"><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button>
              <div className="arena-session"><span>LIVE REHEARSAL</span><i /> <span>ACT / {String(sessionId).slice(-4).padStart(4, "0")}</span></div>
              <div className="arena-header-actions"><span className={`arena-model model-${backendState}`}><i /> {backendState === "ready" ? "AI OPPONENT READY" : backendState === "warming" ? "AI OPPONENT WARMING" : backendState === "offline" ? "AI OPPONENT OFFLINE" : "CHECKING OPPONENT"}</span><button className="end-button" onClick={finishSession}>End session <X size={15} /></button></div>
            </header>

            <div className="arena-casebar">
              <div><span className="casebar-label">THE MOTION</span><h1>{activeTopic}</h1></div>
              <div className="casebar-side"><span>YOU SPEAK</span><b>{position.toUpperCase()}</b></div>
              <div className={`arena-clock ${secondsLeft < 60 ? "clock-urgent" : ""}`}><TimerReset size={17} /><span>{formatTime(secondsLeft)}</span>{secondsLeft < 60 && secondsLeft > 0 && <span className="clock-warning">Final minute</span>}</div>
            </div>

            <div className="arena-grid">
              <aside className="arena-identity">
                <div className="identity-card">
                  <div className={`identity-portrait tone-${activePersona.color}`}>
                    <span className="portrait-shape"><OpponentEmblem persona={persona} label={`${activePersona.name} emblem`} /></span>
                  </div>
                  <div className="identity-copy"><span>ACROSS THE TABLE</span><h2>{activePersona.name}</h2><p>{activePersona.line}</p></div>
                  <div className="identity-trait"><span>DEBATE STYLE</span><b>{persona === "skeptic" ? "EVIDENCE FIRST" : persona === "strategist" ? "LONG GAME" : "WIDER LENS"}</b></div>
                </div>
                <div className="arena-side-note"><span>YOUR POSITION</span><b>{position === "for" ? "IN FAVOUR" : "AGAINST"}</b><p>Stay with your case. Change your mind only when the argument earns it.</p></div>
                <button className="arena-help" onClick={() => setHelpNotice("Write one clear claim. The opponent will answer that point directly.")}><Sparkles size={14} /> How to make a strong turn</button>
              </aside>

              <section className="transcript-panel" role="region" aria-label="Live debate transcript">
                <div className="transcript-heading"><div><span className="transcript-kicker">LIVE TRANSCRIPT</span><h2>The floor is open.</h2></div><span className="round-counter"><span>CUE</span> {Math.max(1, learnerTurns.length + 1).toString().padStart(2, "0")}</span></div>
                <AnimatePresence initial={false}>
                  {cueVisible && (
                    <motion.div
                      key={cueSequence}
                      className="scene-transition"
                      role="status"
                      initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
                      animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span>ENTRANCE / CUE {cueSequence.toString().padStart(2, "0")}</span>
                      <strong>{activePersona.name} takes the floor</strong>
                      <i>RESPONSE IN PROGRESS</i>
                    </motion.div>
                  )}
                </AnimatePresence>
                {helpNotice && (
                  <div className="inline-notice" role="status"><span>{helpNotice}</span><button onClick={() => setHelpNotice("")}>Dismiss</button></div>
                )}
                {backendMessage && (
                  <div className="inline-notice" role="status"><span>{backendMessage}</span>{backendState === "offline" && <button onClick={() => void refreshBackend()}>Retry connection</button>}</div>
                )}
                {recordNotice && <div className="inline-notice" role="status">{recordNotice}</div>}
                <div className="transcript-scroll">
                  {messages.length === 0 && (
                    <div className="empty-transcript"><span className="empty-marker"><EmptyCueArt label="Opponent preparing an opening statement" /></span><p>The room is set. Your opponent is preparing an opening statement.</p></div>
                  )}
                  {messages.map((message, index) => (
                    <motion.article
                      key={message.id}
                      className={`message-card ${message.speaker === "learner" ? "message-learner" : "message-opponent"} ${message.kind === "challenge" ? "message-challenge" : ""}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <div className="message-meta">
                        <span className={`message-speaker ${message.speaker}`}>
                          {message.speaker === "opponent" && (
                            <span className={`message-emblem tone-${activePersona.color}`} aria-hidden="true">
                              <OpponentEmblem persona={persona} label={`${activePersona.name} emblem`} />
                            </span>
                          )}
                          {message.kind === "challenge"
                            ? `FOLLOW-UP ${message.challengeDepth ?? 1} OF 2`
                            : message.speaker === "learner" ? "YOUR CASE" : activePersona.name.toUpperCase()}
                        </span>
                        <span>TURN {Math.ceil((index + 1) / 2).toString().padStart(2, "0")}</span>
                      </div>
                      {message.challengeTarget && <blockquote className="challenge-target">“{message.challengeTarget}”</blockquote>}
                      <div className="message-body"><MarkdownText text={message.content} />{message.pending && <span className="stream-cursor" />}</div>
                      {message.pending && !message.content && <div className="thinking-label"><LoaderCircle size={14} /> PREPARING A RESPONSE</div>}
                    </motion.article>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="argument-composer" onSubmit={(event) => void submitArgument(event)}>
                  <div className="composer-topline"><span><CornerDownLeft size={13} /> YOUR TURN</span><span>{draft.length} / 1000 · ENTER TO SEND</span></div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.closest("form")?.requestSubmit();
                      }
                    }}
                    placeholder={learnerTurns.length === 0 ? "State your opening case..." : "Answer the point. Make it count."}
                    aria-label="Your argument. Press Enter to send, Shift plus Enter for a new line."
                    rows={3}
                    disabled={streaming || secondsLeft === 0}
                  />
                  {challengeError && <div className="inline-notice" role="status">{challengeError}</div>}
                  <div className="composer-bottom"><span>One claim at a time — aim for 1–2 sentences. Enter sends · Shift + Enter adds a line.</span><button className="challenge-button" type="button" onClick={() => void requestFollowUp()} disabled={challenging || streaming || learnerTurns.length === 0 || challengeDepth() >= 2 || secondsLeft === 0}>{challenging ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={14} />} <span>{challengeDepth() >= 2 ? "Follow-ups done" : "Challenge me"}</span></button><button className="send-button" disabled={!draft.trim() || streaming || secondsLeft === 0} type="submit">{streaming ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />} <span>{streaming ? "Opponent has the floor" : "Make your case"}</span></button></div>
                </form>
              </section>

              <aside className="room-notes">
                <div className="room-note-heading"><span>THE PROMPT BOOK</span><span className="record-dot" /></div>
                <div className={`room-opponent tone-${activePersona.color}`}>
                  <span className="room-opponent-mark" aria-hidden="true"><OpponentEmblem persona={persona} label={`${activePersona.name} emblem`} /></span>
                  <span className="room-opponent-copy"><b>{activePersona.name}</b><small>{activePersona.title}</small></span>
                </div>
                <div className="record-card"><div className="record-number">{learnerTurns.length.toString().padStart(2, "0")}</div><span>YOUR TURNS</span></div>
                <div className="record-card"><div className="record-number">{totalWords.toString().padStart(2, "0")}</div><span>YOUR WORDS</span></div>
                <div className="room-divider" />
                <div className="live-note"><span className="live-note-mark"><Swords size={15} /></span><b>YOUR WORDS SET THE SCENE.</b><p>Your opponent responds to the argument you make, not a preset sequence.</p></div>
                <div className="room-status"><span>OPPONENT STATUS</span><b className={`model-${backendState}`}><i /> {backendState === "ready" ? "CONNECTED" : backendState === "warming" ? "WARMING" : backendState === "offline" ? "OFFLINE" : "CHECKING"}</b></div>
              </aside>
            </div>
            <div className="arena-bottomline"><span>VERDICT / PRACTICE ROOM</span><span>AI OPPONENT STREAMED LIVE</span><span>SESSION LENGTH {duration} MIN</span></div>
          </motion.main>
        )}

        {view === "verdict" && (
          <motion.main key="verdict" className="verdict-page" {...pageMotion}>
            <header className="verdict-header"><button className="arena-brand" onClick={returnHome}><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button><span>REHEARSAL COMPLETE / CASE REVIEW</span></header>
            <section className="verdict-content">
              <div className="verdict-overline"><span className="verdict-seal"><BookOpenText size={22} /></span><span>THE LAST CUE IS CALLED.</span></div>
              <h1>Keep the next<br /><span>line in reach.</span></h1>
              <p className="verdict-summary">You rehearsed with <b>{activePersona.name}</b> on the motion: <b>“{activeTopic}”</b></p>
              <div className="verdict-stats">
                <div><span>YOUR TURNS</span><b>{learnerTurns.length.toString().padStart(2, "0")}</b></div>
                <div><span>YOUR WORDS</span><b>{totalWords.toString().padStart(2, "0")}</b></div>
                <div><span>TIME IN ROOM</span><b>{formatTime(Math.min(elapsed, duration * 60))}</b></div>
              </div>
              <section className="analysis-chamber" aria-labelledby="analysis-heading">
                <div className="analysis-chamber-head">
                  <div><span>ACT IV / THE CASE REVIEW</span><h2 id="analysis-heading">Read the argument.<br /><em>Sharpen the next one.</em></h2></div>
                  {!analysis && <button className="button button-dark" onClick={() => void reviewDebate()} disabled={analysisLoading || learnerTurns.length === 0}>
                    {analysisLoading ? <><LoaderCircle className="spin" size={15} /> Reading your case</> : <><Sparkles size={15} /> Analyze my arguments</>}
                  </button>}
                </div>
                {!analysis && <p className="analysis-intro">A text-based coaching review of clarity, evidence, reasoning, and persuasion. It runs on the Ollama model and does not assess your voice.</p>}
                {analysisError && <div className="analysis-error" role="alert">{analysisError}</div>}
                {analysis && <>
                  <div className="analysis-rubric">
                    {([
                      ["clarity", "Clarity"],
                      ["relevance", "Relevance"],
                      ["evidence_strength", "Evidence"],
                      ["logical_consistency", "Logic"],
                      ["persuasiveness", "Persuasion"],
                    ] as const).map(([key, label]) => (
                      <article className="analysis-rating" key={key}>
                        <span>{label}</span><b>{analysis.ratings[key].score}<small> / 5</small></b><p>{analysis.ratings[key].note}</p>
                      </article>
                    ))}
                  </div>
                  <div className="analysis-coaching-grid">
                    <section className="analysis-coaching-card"><span>WHAT LANDED</span>{analysis.strengths.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                    <section className="analysis-coaching-card"><span>YOUR NEXT MOVE</span>{analysis.next_steps.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                  </div>
                  <section className="analysis-fallacies"><div className="analysis-section-label">LOGIC WATCH / {analysis.fallacies.length.toString().padStart(2, "0")}</div>
                    {analysis.fallacies.length === 0
                      ? <p>No clear examples of the listed fallacies appeared. Keep checking claims against their evidence.</p>
                      : analysis.fallacies.map((item, index) => <article key={`${item.label}-${index}`}><b>{item.label}</b><blockquote>“{item.quote}”</blockquote><p>{item.explanation}</p><small>TRY THIS: {item.revision}</small></article>)}
                  </section>
                  <section className="analysis-counterpoints"><div className="analysis-section-label">FIVE WAYS TO TEST THE CASE</div><div className="counterpoint-grid">
                    {analysis.counterarguments.map((item) => <article key={item.kind}><span>{item.kind.toUpperCase()} COUNTERPOINT</span><p>{item.response}</p><small>ASK: {item.question}</small></article>)}
                  </div></section>
                  <p className="analysis-limit">Coaching estimate from an AI model, based on this transcript only. Scores are not objective measures. Check each observation against what you meant to say.</p>
                </>}
              </section>
              <section className="analysis-chamber" aria-labelledby="delivery-heading">
                <div className="analysis-chamber-head">
                  <div><span>ACT V / DELIVERY REVIEW</span><h2 id="delivery-heading">Hear the delivery.<br /><em>Steady the next one.</em></h2></div>
                </div>
                <p className="analysis-intro">Record or upload a closing take. Delivery states are observable patterns with timestamps, not diagnoses. Audio is discarded after review.</p>
                <Suspense fallback={<div className="inline-notice" role="status">Loading delivery review…</div>}>
                  <PresentationRoom topic={activeTopic} sessionId={recordId} compact onResult={(next) => { setDeliveryResult(next); setJudge(null); setJudgeError(""); }} />
                </Suspense>
              </section>
              <section className="analysis-chamber judge-chamber" aria-labelledby="judge-heading">
                <div className="analysis-chamber-head">
                  <div><span>ACT VI / THE WEIGHTED VERDICT</span><h2 id="judge-heading">Weigh the case.<br /><em>Carry the next line.</em></h2></div>
                  {!judge && <button className="button button-dark" onClick={() => void scoreRehearsal()} disabled={judgeLoading || !analysis}>
                    {judgeLoading ? <><LoaderCircle className="spin" size={15} /> Scoring the rehearsal</> : <><Sparkles size={15} /> Score my rehearsal</>}
                  </button>}
                </div>
                <p className="analysis-intro">A deterministic scoring of this rehearsal on five weighted dimensions: argument 30, evidence 20, logic 20, rebuttal 15, communication 15. {deliveryResult ? "Includes your closing take." : "Add a closing take above to score communication; otherwise it scores neutral."}</p>
                {!analysis && <p className="present-empty" role="status">Run the case review first — scoring builds on its ratings and counterpoints.</p>}
                {judgeError && <div className="analysis-error" role="alert">{judgeError}</div>}
                {judge && <>
                  <div className="judge-overall">
                    <div><span>WEIGHTED OVERALL</span><b>{judge.overall.toFixed(1)}<small> / 5</small></b></div>
                    <p>Argument 30 · Evidence 20 · Logic 20 · Rebuttal 15 · Communication 15. Scores are coaching estimates, not objective measures.</p>
                  </div>
                  <div className="judge-grid">
                    {judge.dimensions.map((dim) => (
                      <article key={dim.key} className="judge-card">
                        <span>{dim.key.toUpperCase()} · {dim.weight_pct}%</span>
                        <b>{dim.score.toFixed(1)}<small> / 5</small></b>
                        <p>{dim.note}</p>
                        {dim.citations.length > 0 && <small className="judge-cites">{dim.citations.map((cite) => `“${cite}”`).join(" · ")}</small>}
                      </article>
                    ))}
                  </div>
                  {judge.gaps.length > 0 && (
                    <div className="judge-gaps">
                      <div className="analysis-section-label">DISCLOSED GAPS / {judge.gaps.length.toString().padStart(2, "0")}</div>
                      {judge.gaps.map((gap) => <p key={gap}>{gap}</p>)}
                    </div>
                  )}
                  <p className="analysis-limit">Deterministic scoring from your case review{deliveryResult ? " and closing take" : ""}. Check each note against what you meant to say.</p>
                  <div className="judge-actions">
                    <button className="button button-light" onClick={() => void scoreRehearsal()} disabled={judgeLoading || !analysis}>
                      {judgeLoading ? <><LoaderCircle className="spin" size={15} /> Re-scoring</> : <>Re-score with current review</>}
                    </button>
                  </div>
                </>}
              </section>
              <div className="verdict-note"><span>WHAT HAPPENS NEXT</span><p>{user ? "Your transcript and any completed argument review are kept in your learner archive." : "Your transcript and review stay in this browser session. Sign in before your next rehearsal to keep its transcript in your learner archive."}</p></div>
              <div className="verdict-actions">
                <button className="button button-dark" onClick={() => void resumeSession()}><RotateCcw size={16} /> Return to the room</button>
                <button className="button button-light" onClick={() => setView("present")}>Practice delivery solo <ArrowUpRight size={16} /></button>
                <button className="button button-light" onClick={() => setView("setup")}>Start a new rehearsal <ArrowUpRight size={16} /></button>
              </div>
            </section>
            <div className="verdict-footer"><span>VERDICT / CASE CLOSED</span><span>AI PRACTICE ROOM</span></div>
          </motion.main>
        )}

        {view === "present" && (
          <motion.main key="present" className="verdict-page" {...pageMotion}>
            <header className="verdict-header"><button className="arena-brand" onClick={returnHome}><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button><span>DELIVERY ROOM / SOLO PRACTICE</span></header>
            <section className="verdict-content">
              <div className="verdict-overline"><span className="verdict-seal"><BookOpenText size={22} /></span><span>THE MIC IS YOURS.</span></div>
              <h1>Steady the<br /><span>next take.</span></h1>
              <p className="verdict-summary">Record or upload without a debate. Review pace, pauses, and tutor drills with timestamps. Audio is discarded after review.</p>
              <Suspense fallback={<div className="inline-notice" role="status">Loading delivery room…</div>}>
                <PresentationRoom />
              </Suspense>
              <div className="verdict-actions">
                <button className="button button-dark" onClick={() => setView("setup")}><ArrowLeft size={16} /> Back to debate setup</button>
              </div>
            </section>
            <div className="verdict-footer"><span>VERDICT / DELIVERY ROOM</span><span>AI PRACTICE ROOM</span></div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

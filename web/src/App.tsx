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
import { loadSessionDigests } from "./services/plan-records";
import type { SessionDigest } from "./services/plan-api";
import { addBankTopic, listBankTopics, type BankTopic } from "./services/topics";
import { loadProfile } from "./services/profiles";
import { difficultyOptions, personas, starterTopics, type PersonaKey } from "./features/debate-catalog";
import { buildRecommendation, hydratePrefs, isOnboardingDone, loadPrefs, preferencesFor } from "./services/learner-prefs";
import type { OnboardingResult } from "./features/onboarding/OnboardingFlow";
import { useAuth } from "./features/auth/AuthProvider";
import { supabaseConfigured } from "./features/auth/supabase";
import { OpponentEmblem } from "./components/OpponentEmblem";
import { EmptyCueArt } from "./components/CueArt";
import { MarkdownText } from "./components/Markdown";
import type { PresentationResult } from "./services/presentation-api";

const AccountView = lazy(() => import("./features/auth/AccountView").then((m) => ({ default: m.AccountView })));
const AuthView = lazy(() => import("./features/auth/AuthView").then((m) => ({ default: m.AuthView })));
const OnboardingFlow = lazy(() => import("./features/onboarding/OnboardingFlow").then((m) => ({ default: m.OnboardingFlow })));
const DashboardView = lazy(() => import("./features/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })));
const PresentationRoom = lazy(() => import("./features/presentation/PresentationRoom").then((m) => ({ default: m.PresentationRoom })));

type View = "landing" | "setup" | "arena" | "verdict" | "auth" | "account" | "present" | "onboarding" | "home";
type BackendState = "checking" | "warming" | "ready" | "offline";

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
            <span className="cta-full">Start a rehearsal</span>
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

const HASH_VIEWS: View[] = ["landing", "setup", "present", "auth", "account", "onboarding", "home"];

const SNAPSHOT_KEY = "verdict-arena-snapshot";
const RECENTS_KEY = "verdict-recent-motions";

type ArenaSnapshot = {
  messages: DebateMessage[];
  draft: string;
  secondsLeft: number;
  duration: number;
  topicChoice: string;
  customTopic: string;
  position: "for" | "against";
  persona: PersonaKey;
  difficulty: DebateOptions["difficulty"];
  sessionId: number;
  startedAt: number;
  recordId: string | null;
  savedAt: number;
};

function loadRecentMotions(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 3) : [];
  } catch {
    return [];
  }
}

function viewFromHash(): View {
  const hash = window.location.hash.replace("#/", "").replace("#", "");
  return (HASH_VIEWS as string[]).includes(hash) ? (hash as View) : "landing";
}

export default function App() {
  const { session, user, signOut, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>(() => viewFromHash());
  const [topicChoice, setTopicChoice] = useState(starterTopics[0]);
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
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<ArenaSnapshot | null>(null);
  const [recentMotions, setRecentMotions] = useState<string[]>(() => loadRecentMotions());
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [deliveryResult, setDeliveryResult] = useState<PresentationResult | null>(null);
  const [judge, setJudge] = useState<JudgeVerdict | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState("");
  const [challenging, setChallenging] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const pollAttempts = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const savedTurnIds = useRef(new Set<string>());
  const routedForRef = useRef<string | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);
  // Digests the memory agent turns into the opponent's private brief.
  const memoryRef = useRef<SessionDigest[]>([]);

  const activePersona = useMemo(
    () => personas.find((candidate) => candidate.key === persona) ?? personas[0],
    [persona],
  );
  const activeTopic = customTopic.trim() || topicChoice;
  const motionTitles = bankTopics.length > 0 ? bankTopics.map((t) => t.title) : starterTopics;
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
      setPrefsReady(true);
      return;
    }
    let active = true;
    setPrefsReady(false);
    void listBankTopics()
      .then((data) => {
        if (!active) return;
        setBankTopics(data);
        if (data.length > 0) setTopicChoice((current) => current || data[0].title);
      })
      .catch(() => {});
    void loadProfile(user.id)
      .then((profile) => {
        if (!active) return;
        hydratePrefs(user.id, profile ?? null);
        if (profile?.display_name) setLearnerName(profile.display_name);
      })
      .catch(() => {
        // Offline or unmigrated: the cached answers still stand in.
      })
      .finally(() => {
        if (active) setPrefsReady(true);
      });
    return () => { active = false; };
  }, [user]);

  // A signed-in learner lands on the dashboard, or in onboarding on a first visit.
  useEffect(() => {
    if (authLoading || !user || !supabaseConfigured || !prefsReady) return;
    if (routedForRef.current === user.id) return;
    routedForRef.current = user.id;
    setView(isOnboardingDone(user.id) ? "home" : "onboarding");
  }, [authLoading, user, prefsReady]);

  useEffect(() => {
    if (user && view === "landing") setView("home");
  }, [user, view]);

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

  // The learner's own answers, read fresh so a change in Learner space applies to the next turn.
  function learnerAim() {
    if (!user || !supabaseConfigured) return null;
    return preferencesFor(loadPrefs(user.id));
  }

  async function requestOpponentReply(
    history: DebateMessage[],
    learnerArgument: string | null,
  ) {
    const options: DebateOptions = {
      topic: activeTopic,
      learner_position: position,
      persona,
      difficulty,
      preferences: learnerAim(),
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
        memoryRef.current,
        (corrected) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === replyId ? { ...message, content: corrected } : message,
            ),
          );
        },
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
    if (view !== "arena") return;
    const snapshot: ArenaSnapshot = {
      messages, draft, secondsLeft, duration, topicChoice, customTopic,
      position, persona, difficulty, sessionId, startedAt, recordId,
      savedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      /* Private browsing or quota — the live session is unaffected. */
    }
  }, [view, messages, draft, secondsLeft, duration, topicChoice, customTopic, position, persona, difficulty, sessionId, startedAt, recordId]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ArenaSnapshot>;
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setSavedSnapshot(parsed as ArenaSnapshot);
      }
    } catch {
      /* A corrupt snapshot is the same as no snapshot. */
    }
  }, []);

  useEffect(() => {
    if (view !== "arena" || learnerTurns.length === 0) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [view, learnerTurns.length]);

  useEffect(() => {
    if (!confirmEnd) return;
    const timer = window.setTimeout(() => setConfirmEnd(false), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmEnd]);

  useEffect(() => {
    if (view !== "arena") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    composerRef.current?.focus({ preventScroll: true });
  }, [view, sessionId]);

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

  async function startSession(prefill?: {
    topic: string;
    position: "for" | "against";
    persona: PersonaKey;
    difficulty: DebateOptions["difficulty"];
    duration: number;
  }) {
    if (startingSession) return;
    const chosenTopic = (prefill?.topic ?? activeTopic).trim();
    const chosenDuration = prefill?.duration ?? duration;
    if (!chosenTopic) return;
    setStartingSession(true);
    setRecordNotice("");
    setAnalysis(null);
    setAnalysisError("");
    setDeliveryResult(null);
    setJudge(null);
    setJudgeError("");
    setMessages([]);
    setDraft("");
    if (prefill) {
      setPosition(prefill.position);
      setPersona(prefill.persona);
      setDifficulty(prefill.difficulty);
      setDuration(prefill.duration);
      if (motionTitles.includes(prefill.topic)) {
        setTopicChoice(prefill.topic);
        setCustomTopic("");
      } else {
        setTopicChoice("");
        setCustomTopic(prefill.topic);
      }
    }
    setSecondsLeft(chosenDuration * 60);
    setStartedAt(Date.now());
    savedTurnIds.current = new Set();
    let nextRecordId: string | null = null;
    memoryRef.current = [];
    if (user && supabaseConfigured) {
      try {
        nextRecordId = await createDebateRecord({
          topic: chosenTopic,
          learner_position: prefill?.position ?? position,
          persona: prefill?.persona ?? persona,
          difficulty: prefill?.difficulty ?? difficulty,
        }, chosenDuration);
      } catch {
        setRecordNotice("The debate can continue, but this session could not be saved to your account. Check your Supabase setup.");
      }
      try {
        // One bounded read of recent rehearsals so the opponent can press a known weak spot.
        memoryRef.current = await loadSessionDigests(12);
      } catch {
        memoryRef.current = [];
      }
    }
    setRecordId(nextRecordId);
    setSessionId((current) => current + 1);
    const recent = chosenTopic.slice(0, 240);
    if (recent) {
      setRecentMotions((current) => {
        const next = [recent, ...current.filter((item) => item !== recent)].slice(0, 3);
        try {
          window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
        } catch {
          /* Recents are a convenience — the session starts regardless. */
        }
        return next;
      });
    }
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
      // The weighted verdict is deterministic, so show it without a second click.
      if (report.ratings) void runJudge(report, deliveryResult);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "The coach could not review this transcript.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function runJudge(report: AnalysisReport | null, delivery: PresentationResult | null) {
    if (!report?.ratings) return;
    setJudgeLoading(true);
    setJudgeError("");
    try {
      const verdict = await requestJudge(report, delivery, session?.access_token);
      setJudge(verdict);
    } catch (error) {
      setJudgeError(error instanceof Error ? error.message : "The judge could not score this rehearsal. Try again.");
    } finally {
      setJudgeLoading(false);
    }
  }

  function clearSnapshot() {
    try {
      window.sessionStorage.removeItem(SNAPSHOT_KEY);
    } catch {
      /* Nothing to clear. */
    }
    setSavedSnapshot(null);
  }

  function requestEndSession() {
    if (learnerTurns.length === 0 || confirmEnd) {
      setConfirmEnd(false);
      finishSession();
      return;
    }
    setConfirmEnd(true);
  }

  function finishSession() {
    abortRef.current?.abort();
    setStreaming(false);
    setConfirmEnd(false);
    clearSnapshot();
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
        preferences: learnerAim(),
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

  function resumeSnapshot(snapshot: ArenaSnapshot) {
    const remaining = Math.max(0, snapshot.secondsLeft - Math.floor((Date.now() - snapshot.savedAt) / 1000));
    if (remaining <= 0 || snapshot.messages.length === 0) {
      clearSnapshot();
      return;
    }
    setTopicChoice(snapshot.topicChoice);
    setCustomTopic(snapshot.customTopic);
    setPosition(snapshot.position);
    setPersona(snapshot.persona);
    setDifficulty(snapshot.difficulty);
    setDuration(snapshot.duration);
    setSecondsLeft(remaining);
    setMessages(snapshot.messages.map((message) => ({ ...message, pending: false })));
    savedTurnIds.current = new Set(snapshot.messages.map((message) => message.id));
    setDraft(snapshot.draft);
    setSessionId(snapshot.sessionId);
    setStartedAt(snapshot.startedAt);
    setRecordId(snapshot.recordId);
    setStreaming(false);
    setCueVisible(false);
    setRecordNotice("");
    setSavedSnapshot(null);
    setView("arena");
  }

  function applyRecentMotion(title: string) {
    if (motionTitles.includes(title)) {
      setTopicChoice(title);
      setCustomTopic("");
    } else {
      setTopicChoice("");
      setCustomTopic(title);
    }
  }

  function returnHome() {
    abortRef.current?.abort();
    setStreaming(false);
    setConfirmEnd(false);
    setView(user ? "home" : "landing");
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
    routedForRef.current = null;
    setPrefsReady(false);
    setLearnerName(null);
    setView("landing");
  }

  function completeOnboarding(result: OnboardingResult) {
    if (result.profile.display_name) setLearnerName(result.profile.display_name);
    const recommendation = buildRecommendation(result.prefs.experience, result.prefs);
    setPersona(recommendation.persona);
    setDifficulty(recommendation.difficulty);
    setDuration(recommendation.duration);
    setSecondsLeft(recommendation.duration * 60);
    setView(result.destination === "delivery" ? "present" : "home");
  }

  function skipOnboarding() {
    setView(user ? "home" : "landing");
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
      {view !== "arena" && view !== "verdict" && view !== "onboarding" && (
        <Header
          onHome={returnHome}
          onStart={() => setView("setup")}
          onAccount={openAccount}
          accountLabel={authLoading ? "…" : user ? (learnerName ? learnerName.split(/\s+/)[0] : "Learner space") : "Sign in"}
          showNav={view === "landing"}
        />
      )}

      <AnimatePresence mode="wait">
        {view === "auth" && (
          <motion.div key="auth" className="app-auth-view" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading account access…</div>}>
              <AuthView
                onContinueAsGuest={() => setView("setup")}
                onAuthenticated={() => setView("onboarding")}
              />
            </Suspense>
          </motion.div>
        )}

        {view === "onboarding" && (
          <motion.div key="onboarding" className="app-onboarding-view" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Setting up your room…</div>}>
              {authLoading
                ? <div className="inline-notice" role="status">Checking your sign-in…</div>
                : user
                  ? <OnboardingFlow userId={user.id} onComplete={completeOnboarding} onSkip={skipOnboarding} />
                  : <AuthView onContinueAsGuest={() => setView("setup")} onAuthenticated={() => setView("onboarding")} />}
            </Suspense>
          </motion.div>
        )}

        {view === "home" && (
          <motion.div key="home" className="app-shell-room" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading your dashboard…</div>}>
              {authLoading
                ? <div className="inline-notice" role="status">Checking your sign-in…</div>
                : user
                  ? (
                    <DashboardView
                      userId={user.id}
                      displayName={learnerName}
                      resume={savedSnapshot && savedSnapshot.messages.length > 0 ? {
                        turns: savedSnapshot.messages.filter((message) => message.speaker === "learner").length,
                        topic: savedSnapshot.customTopic.trim() || savedSnapshot.topicChoice,
                        onResume: () => resumeSnapshot(savedSnapshot),
                        onDiscard: clearSnapshot,
                      } : null}
                      onLaunch={(prefill) => void startSession(prefill)}
                      onNavigate={(next) => setView(next)}
                    />
                  )
                  : <AuthView onContinueAsGuest={() => setView("setup")} onAuthenticated={() => setView("onboarding")} />}
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
                <h1>Test your argument<br /><span className="hero-accent">before the room does.</span></h1>
                <p className="hero-intro">
                  Pick a motion and a side, debate a live AI opponent in your own words, then read a plain-language review of what you argued and how you said it.
                </p>
                {savedSnapshot && savedSnapshot.messages.length > 0 && (
                  <div className="resume-banner" role="status">
                    <div><span>REHEARSAL IN PROGRESS</span><p>{savedSnapshot.messages.filter((message) => message.speaker === "learner").length} of your turns on “{(savedSnapshot.customTopic.trim() || savedSnapshot.topicChoice).slice(0, 80)}” are still here.</p></div>
                    <div className="resume-actions"><button className="button button-dark" onClick={() => resumeSnapshot(savedSnapshot)}>Resume rehearsal</button><button className="button" onClick={clearSnapshot}>Discard</button></div>
                  </div>
                )}
                <div className="hero-actions">
                  <button className="button button-primary" onClick={() => setView("setup")}>
                    Start a rehearsal <ArrowUpRight size={17} />
                  </button>
                  <a className="text-link" href="#how-it-works">See how it works <ArrowDownRight size={16} /></a>
                </div>
                <div className="hero-footnote"><LockKeyhole size={13} /> No account needed — sign in only to save your work</div>
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
              </div>
            </section>

            <section className="format-section" id="how-it-works">
              <div className="section-heading">
                <h2>How a rehearsal<br /><span>runs.</span></h2>
                <p className="section-subtitle">Three steps, and you set every one of them: the motion, the opponent, the pressure, and the clock.</p>
              </div>
              <div className="format-outcomes">
                <span><b>A live opponent</b> that answers your actual argument</span>
                <span><b>An argument review</b> across five criteria</span>
                <span><b>A weighted verdict</b> plus drills for your delivery</span>
              </div>
              <div className="cue-ledger" role="list" aria-label="How a rehearsal runs">
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">01</span>
                  <div className="cue-row-main">
                    <h3>Set it up.</h3>
                    <p>Pick a motion, choose for or against, then choose who argues against you and how long the round runs.</p>
                  </div>
                </motion.article>
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">02</span>
                  <div className="cue-row-main">
                    <h3>Argue it out.</h3>
                    <p>Write one claim at a time. Your opponent replies as you watch, and presses wherever your case is thinnest.</p>
                  </div>
                </motion.article>
                <motion.article className="cue-row" role="listitem" whileHover={{ x: 4 }} transition={{ duration: 0.22 }}>
                  <span className="cue-row-index" aria-hidden="true">03</span>
                  <div className="cue-row-main">
                    <h3>Read the review.</h3>
                    <p>Get scores for your argument, the counterpoints you missed, and the one thing to fix next.</p>
                  </div>
                </motion.article>
              </div>
            </section>

            <section className="opponents-section" id="opponents">
              <div className="opponents-copy">
                <h2>Choose who is<br /><span>across the table.</span></h2>
                <p>Each opponent argues the same motion differently. Pick one here and you land straight in the setup with them chosen.</p>
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
              </div>
            </section>

            <section className="closing-section">
              <div className="closing-content">
                <h2>Ready to make<br /><span>your case?</span></h2>
                <p className="closing-note">Rehearse against an opponent, or practise a closing take on your own.</p>
                <div className="closing-actions">
                  <button className="button button-dark" onClick={() => setView("setup")}>
                    Start a rehearsal <ArrowUpRight size={17} />
                  </button>
                  <button className="button button-light" onClick={() => setView("present")}>
                    Practice delivery solo <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </section>
            <footer className="site-footer"><span>VERDICT<span className="brand-period">.</span></span><span>THINK CLEAR. SPEAK SHARP.</span><span>AI PRACTICE ROOM</span></footer>
          </motion.main>
        )}

        {view === "setup" && (
          <motion.main key="setup" className="setup-page" {...pageMotion}>
            <div className="setup-topline">
              <button className="back-link" onClick={returnHome}><ArrowLeft size={16} /> Back</button>
              <StatusTag state={backendState} />
            </div>
            <div className="setup-heading">
              <h1>{learnerName ? `Set up your debate, ${learnerName.split(/\s+/)[0]}.` : "Set up your debate."}</h1>
              <p>{learnerName ? "Picked for your level — change anything before you step in." : "Two quick choices, then you are in the room. You can change anything in the next round."}</p>
              <div className="setup-progress" role="status" aria-label="Setup summary">
                <span className={activeTopic.trim() ? "is-set" : "is-missing"}>MOTION · {activeTopic.trim() ? "SET" : "CHOOSE ONE"}</span>
                <span className="is-set">SIDE · {position.toUpperCase()}</span>
                <span className="is-set">OPPONENT · {activePersona.name.replace("The ", "").toUpperCase()}</span>
                <span className="is-set">DIFFICULTY · {difficultyOptions.find((option) => option.value === difficulty)?.label.toUpperCase()} · {duration} MIN</span>
              </div>
            </div>

            <div className="setup-layout">
              <section className="setup-panel motion-panel">
                <div className="panel-heading"><span className="panel-count">1</span><div><h2>Your motion</h2><p>Pick a topic, or write your own.</p></div></div>
                {recentMotions.length > 0 && (
                  <div className="recent-motions">
                    <span>RECENT</span>
                    {recentMotions.map((recent) => (
                      <button key={recent} type="button" onClick={() => applyRecentMotion(recent)} title={recent}>
                        {recent.length > 48 ? `${recent.slice(0, 48)}…` : recent}
                      </button>
                    ))}
                  </div>
                )}
                <div className="topic-list" role="radiogroup" aria-label="Choose a motion">
                  {motionTitles.map((topic, index) => (
                    <button
                      key={topic}
                      role="radio"
                      aria-checked={topicChoice === topic && !customTopic}
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
                  placeholder="Should we trust an algorithm with hiring?"
                />
                {user && customTopic.trim().length >= 3 && (
                  <button className="bank-save-link" type="button" onClick={() => void saveMotionToBank()}>
                    Save this motion to my bank
                  </button>
                )}
                {bankNotice && <p className="setup-hint" role="status">{bankNotice}</p>}
                <div className="position-row">
                  <span className="setting-label">YOUR SIDE</span>
                  <div className="segmented-control" role="group" aria-label="Your side">
                    <button aria-pressed={position === "for"} className={position === "for" ? "active" : ""} onClick={() => setPosition("for")}>FOR</button>
                    <button aria-pressed={position === "against"} className={position === "against" ? "active" : ""} onClick={() => setPosition("against")}>AGAINST</button>
                  </div>
                </div>
              </section>

              <a className="setup-continue" href="#setup-opponent">Next: your opponent <ArrowDownRight size={15} /></a>
              <section className="setup-panel opponent-panel" id="setup-opponent">
                <div className="panel-heading"><span className="panel-count">2</span><div><h2>Your opponent</h2><p>Each one attacks a case differently.</p></div></div>
                <div className="persona-list" role="radiogroup" aria-label="Choose your opponent">
                  {personas.map((person) => (
                    <button
                      key={person.key}
                      role="radio"
                      aria-checked={persona === person.key}
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
                  <div className="setting-line"><span className="setting-label">DIFFICULTY</span></div>
                  <div className="difficulty-options" role="radiogroup" aria-label="Rehearsal pressure">
                    {difficultyOptions.map((option, index) => (
                      <button
                        role="radio"
                        aria-checked={difficulty === option.value}
                        title={option.label}
                        className={difficulty === option.value ? "selected" : ""} key={option.value} onClick={() => setDifficulty(option.value)}>
                        <span>0{index + 1}</span><b>{option.label}</b><small>{option.detail}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-block duration-setting">
                  <div className="setting-line"><span className="setting-label">LENGTH</span><span className="setting-value"><Clock3 size={14} /> {duration} MIN</span></div>
                  <input type="range" min="2" max="10" step="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} aria-label="Debate duration in minutes" />
                  <div className="range-labels"><span>2 MIN</span><span>10 MIN</span></div>
                </div>
              </section>
            </div>

            <div className="setup-bottom">
              <div className="local-note"><LockKeyhole size={14} /><span>No account needed. Sign in to keep this transcript in your archive.</span></div>
              <button className="button button-dark setup-submit" onClick={() => void startSession()} disabled={!activeTopic.trim() || startingSession}>
                {startingSession ? "Setting up..." : "Start rehearsal"} {!startingSession && <ArrowRight size={17} />}
              </button>
            </div>
            {!activeTopic.trim() && (
              <p className="setup-hint" role="status">Choose a motion above, or write your own, to begin.</p>
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
              <div className="arena-header-actions"><span className={`arena-model model-${backendState}`}><i /> {backendState === "ready" ? "OPPONENT READY" : backendState === "warming" ? "OPPONENT WARMING" : backendState === "offline" ? "OPPONENT OFFLINE" : "CHECKING OPPONENT"}</span><button className={`end-button${confirmEnd ? " armed" : ""}`} onClick={requestEndSession}>{confirmEnd ? "Tap again to end" : "End session"} <X size={15} /></button></div>
            </header>

            <div className="arena-statusbar" role="status" aria-label="Session status">
              <span className="statusbar-motion">{activeTopic}</span>
              <span className="statusbar-side">{position === "for" ? "FOR" : "AGAINST"}</span>
              <span className="statusbar-turn">TURN {Math.max(1, learnerTurns.length + 1).toString().padStart(2, "0")}</span>
              <span className={`statusbar-clock ${secondsLeft < 60 ? "clock-urgent" : ""}`}><i aria-hidden="true" />{formatTime(secondsLeft)}</span>
            </div>

            <div className="arena-casebar">
              <div><span className="casebar-label">MOTION</span><h1>{activeTopic}</h1></div>
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
                <div className="arena-side-note"><span>YOUR SIDE</span><b>{position === "for" ? "FOR" : "AGAINST"}</b><p>Stay with your case. Change your mind only when an argument earns it.</p></div>
                <div className="arena-tip"><Swords size={14} /><p>One claim at a time, with a reason attached. Your opponent answers the point you just made.</p></div>
              </aside>

              <section className="transcript-panel" role="region" aria-label="Live debate transcript">
                <div className="transcript-heading"><div><h2>The debate</h2></div><span className="round-counter"><span>TURN</span> {Math.max(1, learnerTurns.length + 1).toString().padStart(2, "0")}</span></div>
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
                      <span>RESPONSE {cueSequence.toString().padStart(2, "0")}</span>
                      <strong>{activePersona.name} is answering</strong>
                      <i>WRITING A REPLY</i>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    ref={composerRef}
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
                  <div className="composer-bottom"><span>One claim at a time — aim for 1–2 sentences. Enter sends · Shift + Enter adds a line.</span><button className="challenge-button" type="button" onClick={() => void requestFollowUp()} disabled={challenging || streaming || learnerTurns.length === 0 || challengeDepth() >= 2 || secondsLeft === 0} title={learnerTurns.length === 0 ? "Make your case first — follow-ups unlock after your opening turn" : "Ask the coach to press your latest point"}>{challenging ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={14} />} <span>{challengeDepth() >= 2 ? "Follow-ups done" : learnerTurns.length === 0 ? "Make a case first" : "Ask a follow-up"}</span></button><button className="send-button" disabled={!draft.trim() || streaming || secondsLeft === 0} type="submit">{streaming ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />} <span>{streaming ? "Opponent is replying" : "Make your case"}</span></button></div>
                </form>
              </section>

              <aside className="room-notes">
                <div className={`room-opponent tone-${activePersona.color}`}>
                  <span className="room-opponent-mark" aria-hidden="true"><OpponentEmblem persona={persona} label={`${activePersona.name} emblem`} /></span>
                  <span className="room-opponent-copy"><b>{activePersona.name}</b><small>{activePersona.title}</small></span>
                </div>
                <div className="record-card"><div className="record-number">{learnerTurns.length.toString().padStart(2, "0")}</div><span>YOUR TURNS</span></div>
                <div className="record-card"><div className="record-number">{totalWords.toString().padStart(2, "0")}</div><span>YOUR WORDS</span></div>
                {!user && <div className="room-guest"><span>GUEST REHEARSAL</span><p>This transcript stays in this browser. Sign in to keep it in your archive.</p></div>}
              </aside>
            </div>
            <div className="arena-bottomline"><span>VERDICT / PRACTICE ROOM</span><span>AI OPPONENT STREAMED LIVE</span><span>SESSION LENGTH {duration} MIN</span></div>
          </motion.main>
        )}

        {view === "verdict" && (
          <motion.main key="verdict" className="verdict-page" {...pageMotion}>
            <header className="verdict-header"><button className="arena-brand" onClick={returnHome}><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button><span>REHEARSAL COMPLETE / CASE REVIEW</span></header>
            <section className="verdict-content">
              <h1>Your rehearsal<br /><span>is in the book.</span></h1>
              <p className="verdict-summary">You argued <b>{position === "for" ? "for" : "against"}</b> the motion <b>“{activeTopic}”</b> against <b>{activePersona.name}</b>.</p>
              <div className="verdict-stats">
                <div><span>YOUR TURNS</span><b>{learnerTurns.length.toString().padStart(2, "0")}</b></div>
                <div><span>YOUR WORDS</span><b>{totalWords.toString().padStart(2, "0")}</b></div>
                <div><span>TIME IN ROOM</span><b>{formatTime(Math.min(elapsed, duration * 60))}</b></div>
              </div>
              <section className="review-block" aria-labelledby="review-heading">
                <div className="review-head">
                  <h2 id="review-heading">{analysis ? "Your review" : "Review your argument"}</h2>
                  {!analysis && (
                    <button className="button button-dark" onClick={() => void reviewDebate()} disabled={analysisLoading || learnerTurns.length === 0}>
                      {analysisLoading ? <><LoaderCircle className="spin" size={15} /> Reading your case</> : <><Sparkles size={15} /> Start the review</>}
                    </button>
                  )}
                </div>
                {!analysis && (
                  <p className="review-intro">
                    {learnerTurns.length === 0
                      ? "This rehearsal has no turns to review. Run a round with at least one argument to get scores."
                      : "Five scores for your argument, the counterpoints you missed, and one thing to fix next. It reads your words only — your voice is reviewed separately under Delivery."}
                  </p>
                )}
                {analysisLoading && <p className="review-intro" role="status"><LoaderCircle className="spin" size={14} /> Reading your case. This runs on a local model, so give it a moment.</p>}
                {analysisError && <div className="analysis-error" role="alert">{analysisError}</div>}
                {(analysis?.gaps ?? []).length > 0 && (
                  <div className="inline-notice" role="status">
                    <span>Partial review — {analysis?.gaps.join(" ")} The finished sections are below; running it again may complete the rest.</span>
                    <button onClick={() => void reviewDebate()}>Retry review</button>
                  </div>
                )}

                {analysis && <>
                  {judgeLoading && !judge && <p className="review-intro" role="status"><LoaderCircle className="spin" size={14} /> Weighing your scores.</p>}
                  {judgeError && (
                    <div className="analysis-error" role="alert">
                      {judgeError}
                      <button className="button button-light" type="button" onClick={() => void runJudge(analysis, deliveryResult)}>Score it again</button>
                    </div>
                  )}
                  {judge && (
                    <div className="score-summary">
                      <div className="score-figure">
                        <span>WEIGHTED SCORE</span>
                        <b>{judge.overall.toFixed(1)}<small> / 5</small></b>
                        <p>{deliveryResult ? "Includes your closing take." : "Record a closing take under Delivery to score communication."}</p>
                      </div>
                      <div className="score-bars">
                        {judge.dimensions.map((dim) => (
                          <div className="score-bar" key={dim.key}>
                            <span>{dim.key.replaceAll("_", " ")}</span>
                            <div className="score-track" role="img" aria-label={`${dim.key.replaceAll("_", " ")} scores ${dim.score.toFixed(1)} of 5`}><i style={{ width: `${Math.min(100, dim.score / 5 * 100)}%` }} /></div>
                            <b>{dim.score.toFixed(1)}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(analysis.strengths.length > 0 || analysis.next_steps.length > 0) && (
                    <div className="analysis-coaching-grid">
                      <section className="analysis-coaching-card"><span>WHAT WORKED</span>{analysis.strengths.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                      <section className="analysis-coaching-card"><span>DO THIS NEXT</span>{analysis.next_steps.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                    </div>
                  )}

                  {analysis.ratings && (
                    <details className="disclosure">
                      <summary>
                        Argument scores
                        <span>clarity {analysis.ratings?.clarity?.score ?? "–"} · relevance {analysis.ratings?.relevance?.score ?? "–"} · evidence {analysis.ratings?.evidence_strength?.score ?? "–"} · logic {analysis.ratings?.logical_consistency?.score ?? "–"} · persuasion {analysis.ratings?.persuasiveness?.score ?? "–"}</span>
                      </summary>
                      <div className="analysis-rubric">
                        {([
                          ["clarity", "Clarity"],
                          ["relevance", "Relevance"],
                          ["evidence_strength", "Evidence"],
                          ["logical_consistency", "Logic"],
                          ["persuasiveness", "Persuasion"],
                        ] as const).map(([key, label]) => (
                          <article className="analysis-rating" key={key}>
                            <span>{label}</span><b>{analysis.ratings?.[key]?.score ?? "–"}<small> / 5</small></b><p>{analysis.ratings?.[key]?.note}</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}

                  <details className="disclosure">
                    <summary>Logic watch<span>{analysis.fallacies.length === 0 ? "no clear examples" : `${analysis.fallacies.length} to review`}</span></summary>
                    <section className="analysis-fallacies">
                      {analysis.fallacies.length === 0
                        ? <p>No clear examples of the listed fallacies appeared. Keep checking claims against their evidence.</p>
                        : analysis.fallacies.map((item, index) => <article key={`${item.label}-${index}`}><b>{item.label}</b><blockquote>“{item.quote}”</blockquote><p>{item.explanation}</p><small>TRY THIS: {item.revision}</small></article>)}
                    </section>
                  </details>

                  {analysis.counterarguments.length > 0 && (
                    <details className="disclosure">
                      <summary>Counterpoints to test your case<span>{analysis.counterarguments.length} angles</span></summary>
                      <section className="analysis-counterpoints"><div className="counterpoint-grid">
                        {analysis.counterarguments.map((item) => <article key={item.kind}><span>{item.kind.toUpperCase()}</span><p>{item.response}</p><small>ASK: {item.question}</small></article>)}
                      </div></section>
                    </details>
                  )}

                  {judge && (
                    <details className="disclosure">
                      <summary>How the score is weighted<span>argument 30 · evidence 20 · logic 20 · rebuttal 15 · communication 15</span></summary>
                      <div className="judge-grid">
                        {judge.dimensions.map((dim) => (
                          <article key={dim.key} className="judge-card">
                            <span>{dim.key.replaceAll("_", " ")} · {dim.weight_pct}%</span>
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
                    </details>
                  )}

                  <details className="disclosure">
                    <summary>Read the full transcript<span>{messages.length} turns</span></summary>
                    <div className="transcript-recap">
                      {messages.map((message) => (
                        <article key={message.id} className={`recap-turn ${message.speaker}`}>
                          <span>{message.speaker === "learner" ? "YOU" : activePersona.name.toUpperCase()}</span>
                          <div><MarkdownText text={message.content} compact /></div>
                        </article>
                      ))}
                    </div>
                  </details>

                  <p className="analysis-limit">Coaching estimate from an AI model, based only on this transcript. Scores are not objective measures — check each observation against what you meant to say.</p>
                </>}
              </section>
              <details className="disclosure" open={deliveryResult !== null}>
                <summary>Delivery review<span>{deliveryResult ? "closing take reviewed" : "record a closing take"}</span></summary>
                <div className="delivery-body">
                  <p className="analysis-intro">Record or upload a closing take. Pace, fillers, and pauses are observable patterns with timestamps, not diagnoses. Your audio is discarded after the review.</p>
                  <Suspense fallback={<div className="inline-notice" role="status">Loading delivery review…</div>}>
                    <PresentationRoom topic={activeTopic} sessionId={recordId} compact onResult={(next) => { setDeliveryResult(next); void runJudge(analysis, next); }} />
                  </Suspense>
                  <button className="text-link step-aside" type="button" onClick={() => setView("present")}>Or practise a take on its own <ArrowUpRight size={15} /></button>
                </div>
              </details>
              <div className="verdict-note"><span>WHAT HAPPENS NEXT</span><p>{user ? "This transcript, its review, and any completed delivery take stay in your learner archive." : "This transcript and review stay in this browser session. Sign in before your next rehearsal to keep its transcript in your archive."}</p></div>
              <div className="verdict-actions">
                <button className="button button-dark" onClick={() => setView("setup")}>Start a new rehearsal <ArrowUpRight size={16} /></button>
                <button className="button button-light" onClick={() => void resumeSession()}><RotateCcw size={16} /> Return to the room</button>
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

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
  Mic,
  Send,
  Sparkles,
  Swords,
  TimerReset,
  X,
} from "lucide-react";
import { Component, Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  streamOpponentReply,
  streamAnalysis,
  analyzeDebate,
  loadModelStatus,
  requestChallenge,
  requestJudge,
  type AnalysisReport,
  type DebateMessage,
  type DebateOptions,
  type JudgeVerdict,
  type ModelStatus,
  type TurnDiagnostics,
} from "./services/debate-api";
import { createDebateRecord, deleteDebateAnalysis, finishDebateRecord, loadDebateVerdictRank, resumeDebateRecord, saveDebateAnalysis, saveDebateTurn, saveDebateVerdict, type DebateRecord, type DebateRecordTurn } from "./services/debate-records";
import { generateAndSaveLearningPlan, loadSessionDigests } from "./services/plan-records";
import type { SessionDigest } from "./services/plan-api";
import { addBankTopic, listBankTopics, type BankTopic } from "./services/topics";
import { loadProfile } from "./services/profiles";
import { cacheApplicationSettings, loadApplicationSettings, normalizeApplicationSettings, type ApplicationSettings } from "./services/app-settings";
import { difficultyFor, difficultyOptions, personaFor, personas, starterTopics, type DifficultyKey, type PersonaKey } from "./features/debate-catalog";
import { buildRecommendation, hydratePrefs, isOnboardingDone, loadPrefs, orderedStarterTopics, preferencesFor } from "./services/learner-prefs";
import type { OnboardingResult } from "./features/onboarding/OnboardingFlow";
import { useAuth } from "./features/auth/AuthProvider";
import { supabaseConfigured } from "./features/auth/supabase";
import { OpponentEmblem } from "./components/OpponentEmblem";
import { EmptyCueArt } from "./components/CueArt";
import { MarkdownText } from "./components/Markdown";
import type { PresentationResult } from "./services/presentation-api";
import { stripControlMarkers } from "./utils/text";
import { PracticeHeader, PracticeHome, PublicWelcome } from "./features/home/PracticeHome";
import "./features/voice/voice.css";

const AccountView = lazy(() => import("./features/auth/AccountView").then((m) => ({ default: m.AccountView })));
const AuthView = lazy(() => import("./features/auth/AuthView").then((m) => ({ default: m.AuthView })));
const OnboardingFlow = lazy(() => import("./features/onboarding/OnboardingFlow").then((m) => ({ default: m.OnboardingFlow })));
const DashboardView = lazy(() => import("./features/dashboard/DashboardView").then((m) => ({ default: m.DashboardView })));
const PresentationRoom = lazy(() => import("./features/presentation/PresentationRoom").then((m) => ({ default: m.PresentationRoom })));
const VoiceRoom = lazy(() => import("./features/voice/VoiceRoom").then((m) => ({ default: m.VoiceRoom })));
const SettingsView = lazy(() => import("./features/settings/SettingsView").then((m) => ({ default: m.SettingsView })));

/**
 * The voice room is a separate chunk that opens a socket and touches audio
 * devices. If it throws while mounting, the arena must stay usable: without
 * this boundary the whole page goes blank.
 */
class VoiceRoomBoundary extends Component<{ onClose: () => void; children: ReactNode }, { failed: boolean }> {
  state: { failed: boolean } = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Voice room failed to start", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="inline-notice" role="alert">
        The voice room could not start on this device. Typed turns still work.{" "}
        <button className="dash-text-link" type="button" onClick={this.props.onClose}>Close</button>
      </div>
    );
  }
}

type View = "landing" | "setup" | "arena" | "verdict" | "auth" | "account" | "settings" | "present" | "onboarding" | "home";

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

function formatOrdinal(value: number) {
  const tail = value % 100;
  const suffix = tail >= 11 && tail <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th";
  return `${value}${suffix}`;
}

function diagnosticsLabel(diagnostics: TurnDiagnostics) {
  if (diagnostics.redirect_reason === "guard") return "ON MOTION";
  if (diagnostics.redirect_reason === "review" || (!diagnostics.verified && diagnostics.fallback)) {
    return "RECOVERED";
  }
  return "CHECKED";
}

function diagnosticsTitle(diagnostics: TurnDiagnostics) {
  if (diagnostics.redirect_reason === "guard") {
    return "This turn asked for something outside the debate, so the opponent stayed in character and returned to the motion.";
  }
  if (diagnostics.redirect_reason === "review" || (!diagnostics.verified && diagnostics.fallback)) {
    return "The drafted reply did not pass review, so the opponent answered with a short question on the motion instead.";
  }
  return "This turn passed the deterministic form checks: length, private-context leakage, engagement with your latest point, and a closing question. It is not a fact-check.";
}

function diagnosticsTime(milliseconds: number) {
  return milliseconds < 1000 ? "<1S" : `${Math.round(milliseconds / 1000)}S`;
}

function turnNumberFor(messages: DebateMessage[], index: number) {
  const learnerTurns = messages
    .slice(0, index + 1)
    .filter((message) => message.speaker === "learner").length;
  return Math.max(1, learnerTurns);
}

function turnErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (
    !message ||
    /failed to fetch|load failed|network|aborted|ended before the final response|returned an empty reply|streaming is not available/i.test(
      message,
    )
  ) {
    return "That turn didn't come through. Check your connection and try again.";
  }
  return message;
}

function Header({
  onHome,
  onStart,
  onAccount,
  onSettings,
  accountLabel,
  showNav = true,
  showCta = true,
}: {
  onHome: () => void;
  onStart: () => void;
  onAccount: () => void;
  onSettings: () => void;
  accountLabel: string;
  showNav?: boolean;
  showCta?: boolean;
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
            </nav>
          )}
          <button className="header-account-link" onClick={onSettings}>Settings</button>
          <button className="header-account-link" onClick={onAccount}>{accountLabel}</button>
          {showCta && (
            <button className="header-cta" onClick={onStart}>
              <span className="cta-full">Start a rehearsal</span>
              <span className="cta-short">Start</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          )}
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

const HASH_VIEWS: View[] = ["landing", "setup", "present", "auth", "account", "settings", "onboarding", "home"];
const PROTECTED_VIEWS = new Set<View>(["setup", "arena", "verdict", "present", "account", "settings", "onboarding", "home"]);
const SETTINGS_SECTION_IDS = new Set([
  "settings-profile",
  "settings-practice",
  "settings-coach",
  "settings-appearance",
  "settings-data",
]);

const SNAPSHOT_KEY = "verdict-arena-snapshot";
const RECENTS_KEY = "verdict-recent-motions";
const SCORE_DIMENSION_ORDER = ["argument", "evidence", "logical", "rebuttal", "communication"] as const;
const SCORE_DIMENSION_LABELS = {
  argument: "ARGUMENT QUALITY",
  evidence: "EVIDENCE & SUPPORT",
  logical: "LOGIC",
  rebuttal: "REBUTTAL",
  communication: "DELIVERY",
} as const;
type ScoreKey = (typeof SCORE_DIMENSION_ORDER)[number];
type SetupMode = "fresh" | "recommended" | "focused" | "rematch";
type PracticeFocus = {
  key: ScoreKey;
  label: string;
  reason: string;
  persona: PersonaKey;
  difficulty: DifficultyKey;
  duration: number;
};

const PRACTICE_FOCUS: Record<ScoreKey, Omit<PracticeFocus, "reason">> = {
  argument: { key: "argument", label: "argument quality", persona: "strategist", difficulty: "challenge", duration: 5 },
  evidence: { key: "evidence", label: "evidence", persona: "skeptic", difficulty: "cross-examination", duration: 4 },
  logical: { key: "logical", label: "logic", persona: "skeptic", difficulty: "cross-examination", duration: 4 },
  rebuttal: { key: "rebuttal", label: "rebuttal", persona: "strategist", difficulty: "cross-examination", duration: 4 },
  communication: { key: "communication", label: "delivery", persona: "diplomat", difficulty: "challenge", duration: 4 },
};

const RATING_TO_SCORE: Record<string, ScoreKey> = {
  clarity: "argument",
  relevance: "argument",
  evidence_strength: "evidence",
  logical_consistency: "logical",
  persuasiveness: "communication",
};

function focusFromScores(
  scores: Partial<Record<ScoreKey, number>>,
  nextStep?: string,
): PracticeFocus | null {
  const ranked = SCORE_DIMENSION_ORDER.map((key) => ({ key, score: scores[key] })).filter(
    (entry): entry is { key: ScoreKey; score: number } => typeof entry.score === "number",
  );
  if (ranked.length === 0) return null;
  const weakest = ranked.reduce((current, entry) => (entry.score < current.score ? entry : current));
  const base = PRACTICE_FOCUS[weakest.key];
  return {
    ...base,
    reason: `Your lowest score in this review was ${base.label} (${Math.round(weakest.score * 20)}/100). This round keeps the same motion and side so you can work on it directly.${nextStep ? ` The review's next step: ${nextStep}` : ""}`,
  };
}

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
  continuation?: boolean;
  continuedHistoryCount?: number;
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
  if (SETTINGS_SECTION_IDS.has(hash)) return "settings";
  return (HASH_VIEWS as string[]).includes(hash) ? (hash as View) : "landing";
}

function isPasswordRecoveryCallback() {
  return /(?:[?#&])type=recovery(?:[=&]|$)/i.test(`${window.location.search}${window.location.hash}`);
}

function isSupabaseAuthCallback() {
  return /(?:access_token|refresh_token)=/i.test(window.location.hash) || new URLSearchParams(window.location.search).has("code");
}

function requiresAccount(view: View) {
  return PROTECTED_VIEWS.has(view);
}

function readPendingAuthDestination(): View | null {
  try {
    const destination = new URLSearchParams(window.location.search).get("next")
      ?? window.sessionStorage.getItem("verdict-auth-destination");
    return destination && PROTECTED_VIEWS.has(destination as View) ? destination as View : null;
  } catch {
    return null;
  }
}

function VerdictScoreSkeleton() {
  return (
    <div className="score-summary verdict-skeleton-score" aria-hidden="true">
      <div className="score-figure"><span>WEIGHTED SCORE</span><i className="verdict-skeleton-value" /><i className="verdict-skeleton-copy" /></div>
      <div className="score-bars">
        {["ARGUMENT QUALITY", "EVIDENCE & SUPPORT", "LOGIC", "REBUTTAL", "DELIVERY"].map((label) => (
          <div className="score-bar" key={label}><span>{label}</span><i className="verdict-skeleton-track" /><i className="verdict-skeleton-number" /></div>
        ))}
      </div>
    </div>
  );
}

function VerdictScoreUnavailable() {
  return (
    <div className="score-summary verdict-score-unavailable">
      <div className="score-figure"><span>WEIGHTED SCORE</span><b>—<small> / 100</small></b><p>A weighted score is not available for this review.</p></div>
      <div className="score-bars">
        {["CASE STRUCTURE", "EVIDENCE & SUPPORT", "REBUTTAL", "PERSUASION", "DELIVERY"].map((label) => (
          <div className="score-bar is-unrated" key={label}><span>{label}</span><div className="score-track is-unrated" /><b>—</b></div>
        ))}
      </div>
    </div>
  );
}

function VerdictLoadingPreview() {
  return (
    <div className="verdict-loading-preview" aria-hidden="true">
      <div className="verdict-review-columns">
        <VerdictScoreSkeleton />
        <div className="analysis-coaching-grid">
          {["WHAT WORKED WELL", "TOP AREAS TO IMPROVE"].map((label) => (
            <section className="analysis-coaching-card verdict-skeleton-card" key={label}>
              <span>{label}</span><i /><i /><i />
            </section>
          ))}
        </div>
      </div>
      <div className="verdict-skeleton-disclosures">
        {["Argument scores", "Logic watch", "Counterpoints", "Score weights", "Transcript", "Delivery review"].map((label) => (
          <div className="verdict-skeleton-disclosure" key={label}><span>{label}</span><i /></div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { session, user, signOut, loading: authLoading } = useAuth();
  const [appSettings, setAppSettings] = useState<ApplicationSettings>(() => loadApplicationSettings("guest"));
  const [authCallbackPending, setAuthCallbackPending] = useState(() => isSupabaseAuthCallback());
  const [authRecoveryFlow, setAuthRecoveryFlow] = useState(() => isPasswordRecoveryCallback());
  const [view, setView] = useState<View>(() => isPasswordRecoveryCallback() ? "auth" : viewFromHash());
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [authDestination, setAuthDestination] = useState<View | null>(() => {
    const initial = viewFromHash();
    return requiresAccount(initial) ? initial : readPendingAuthDestination();
  });
  const theme = appSettings.theme;
  const [topicChoice, setTopicChoice] = useState(starterTopics[0]);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3 | 4>(1);
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
  const [turnError, setTurnError] = useState("");
  const [sessionId, setSessionId] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [cueSequence, setCueSequence] = useState(0);
  const [cueVisible, setCueVisible] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [accountFocusId, setAccountFocusId] = useState<string | null>(null);
  const [accountStartSection, setAccountStartSection] = useState<"analysis" | "plan">("analysis");
  const [continuation, setContinuation] = useState(false);
  const [continuedHistoryCount, setContinuedHistoryCount] = useState(0);
  const [recordNotice, setRecordNotice] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  // One last point after the clock, chosen by the learner when a draft exists.
  const [graceTurn, setGraceTurn] = useState(false);
  const graceOfferedRef = useRef(false);
  const [setupMode, setSetupMode] = useState<SetupMode>("fresh");
  const [setupFocus, setSetupFocus] = useState<PracticeFocus | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ArenaSnapshot | null>(null);
  const [recentMotions, setRecentMotions] = useState<string[]>(() => loadRecentMotions());
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [authPurpose, setAuthPurpose] = useState<"voice" | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisSaved, setAnalysisSaved] = useState(false);
  const [planUpdateStatus, setPlanUpdateStatus] = useState<"idle" | "updating" | "updated" | "failed">("idle");
  const [planUpdateError, setPlanUpdateError] = useState("");
  const [deliveryResult, setDeliveryResult] = useState<PresentationResult | null>(null);
  const [judge, setJudge] = useState<JudgeVerdict | null>(null);
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [judgeError, setJudgeError] = useState("");
  const [verdictRank, setVerdictRank] = useState<{ rank: number; total: number } | null>(null);
  const [verdictRankLoading, setVerdictRankLoading] = useState(false);
  const [pendingArchiveVerdict, setPendingArchiveVerdict] = useState<{ record: DebateRecord; turns: DebateMessage[]; analysis: AnalysisReport | null; verdict: JudgeVerdict | null; delivery: PresentationResult | null } | null>(null);
  const [challenging, setChallenging] = useState(false);
  const [challengeError, setChallengeError] = useState("");
  const [challengeDone, setChallengeDone] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // The room's own toggle: a session choice seeded from the permanent setting.
  const [streamReplies, setStreamReplies] = useState(() => loadApplicationSettings("guest").streamReplies);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ status: "unknown" });
  const [modelChecking, setModelChecking] = useState(false);
  const clockPausedRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottomRef = useRef(true);
  const lastTurnRef = useRef<{ history: DebateMessage[]; latest: string | null } | null>(null);
  const pendingResumeRef = useRef<string | null>(null);
  const reviewInFlightRef = useRef(false);
  const judgeSeqRef = useRef(0);
  const planUpdateInFlightRef = useRef(false);
  const savedTurnIds = useRef(new Set<string>());
  const routedForRef = useRef<string | null>(null);
  const pendingVoiceStartRef = useRef<"resume" | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);
  // Digests the memory agent turns into the opponent's private brief.
  const memoryRef = useRef<SessionDigest[]>([]);
  const memoryLoadedRef = useRef(false);

  function rememberAuthDestination(destination: View | null) {
    setAuthDestination(destination);
    try {
      if (destination) window.sessionStorage.setItem("verdict-auth-destination", destination);
      else window.sessionStorage.removeItem("verdict-auth-destination");
    } catch {
      // The in-memory destination remains available when storage is blocked.
    }
  }

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
  const lastLearnerMessage = [...messages].reverse().find((message) => message.speaker === "learner" && message.content.trim());
  const nextPracticeFocus = useMemo(() => {
    const scores: Partial<Record<ScoreKey, number>> = {};
    if (judge) {
      for (const dimension of judge.dimensions) {
        if ((SCORE_DIMENSION_ORDER as readonly string[]).includes(dimension.key)) {
          scores[dimension.key as ScoreKey] = dimension.score;
        }
      }
    } else if (analysis?.ratings) {
      for (const [rating, value] of Object.entries(analysis.ratings)) {
        const key = RATING_TO_SCORE[rating];
        if (key && typeof value?.score === "number") scores[key] = value.score;
      }
    }
    return focusFromScores(scores, analysis?.next_steps?.[0]);
  }, [judge, analysis]);
  const unavailableJudgeDimensions = judge
    ? SCORE_DIMENSION_ORDER.filter((key) => !judge.dimensions.some((dimension) => dimension.key === key)).map((key) => SCORE_DIMENSION_LABELS[key].toLowerCase())
    : [];
  const verdictComputing = analysisLoading || judgeLoading;
  useEffect(() => {
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
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "new" ? "light" : "dark";
  }, [theme]);

  useEffect(() => {
    setAppSettings(loadApplicationSettings(user?.id ?? "guest"));
  }, [user?.id]);

  // The permanent settings switch is the default; the room toggle lasts a session.
  useEffect(() => {
    setStreamReplies(appSettings.streamReplies);
  }, [appSettings.streamReplies]);

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
        if (profile?.app_settings) {
          const nextSettings = normalizeApplicationSettings(profile.app_settings);
          cacheApplicationSettings(user.id, nextSettings);
          setAppSettings(nextSettings);
        }
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

  // After auth resolves, land in the requested protected screen or the learner's home.
  useEffect(() => {
    if (authLoading || authRecoveryFlow || !user || !supabaseConfigured || !prefsReady) return;
    if (pendingVoiceStartRef.current === "resume") {
      pendingVoiceStartRef.current = null;
      routedForRef.current = user.id;
      setAuthPurpose(null);
      setView("arena");
      setVoiceOpen(true);
      return;
    }
    if (routedForRef.current === user.id) return;
    routedForRef.current = user.id;
    if (authDestination) {
      setView(authDestination);
      rememberAuthDestination(null);
    } else if (view === "landing" || view === "auth") {
      setView(theme === "new" || isOnboardingDone(user.id) ? "home" : "onboarding");
    }
  }, [authLoading, authRecoveryFlow, user, prefsReady, theme, view, authDestination]);

  useEffect(() => {
    if (authLoading || user || !requiresAccount(view)) return;
    setAuthDestination((current) => {
      const destination = current ?? view;
      try { window.sessionStorage.setItem("verdict-auth-destination", destination); } catch { /* memory fallback */ }
      return destination;
    });
    setAuthPurpose(null);
    setView("landing");
  }, [authLoading, user, view]);

  function updateApplicationSettings(next: ApplicationSettings) {
    const normalized = normalizeApplicationSettings(next);
    cacheApplicationSettings(user?.id ?? "guest", normalized);
    setAppSettings(normalized);
  }

  function rememberStreamReplies(value: boolean) {
    updateApplicationSettings({ ...appSettings, streamReplies: value });
  }

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

  async function checkModel() {
    if (modelChecking) return;
    setModelChecking(true);
    try {
      setModelStatus(await loadModelStatus());
    } finally {
      setModelChecking(false);
    }
  }

  // The setup and arena paths tell the learner when the model is simply not running.
  useEffect(() => {
    if (view === "setup" || view === "arena") void checkModel();
  }, [view]);

  // The clock measures the learner's speaking time, so drafting time is not charged.
  useEffect(() => {
    clockPausedRef.current = streaming || challenging;
  }, [streaming, challenging]);

  useEffect(() => {
    if (authCallbackPending) return;
    const sectionHash = window.location.hash.replace(/^#/, "");
    if (view === "settings" && SETTINGS_SECTION_IDS.has(sectionHash)) {
      window.requestAnimationFrame(() => document.getElementById(sectionHash)?.scrollIntoView({ block: "start" }));
      return;
    }
    const hash = view === "landing" ? "#/" : `#/${view}`;
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
    window.scrollTo(0, 0);
  }, [view, authCallbackPending]);

  useEffect(() => {
    if (authLoading || !authCallbackPending) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("next");
    const route = view === "landing" ? "#/" : `#/${view}`;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${route}`);
    setAuthCallbackPending(false);
  }, [authLoading, authCallbackPending, view]);

  // The learner's own answers, read fresh so a change in Learner space applies to the next turn.
  function learnerAim() {
    if (!user || !supabaseConfigured) return null;
    return preferencesFor(loadPrefs(user.id));
  }

  async function requestOpponentReply(
    history: DebateMessage[],
    learnerArgument: string | null,
  ) {
    const applicationSettings = loadApplicationSettings(user?.id ?? "guest");
    if (applicationSettings.usePracticeHistory && user && supabaseConfigured && !memoryLoadedRef.current) {
      try {
        memoryRef.current = await loadSessionDigests(12);
      } catch {
        memoryRef.current = [];
      }
      memoryLoadedRef.current = true;
    }
    const options: DebateOptions = {
      topic: activeTopic,
      learner_position: position,
      persona,
      difficulty,
      preferences: learnerAim(),
      adaptive_tactics: applicationSettings.adaptiveTactics,
      reply_length: applicationSettings.replyLength,
    };
    const replyId = crypto.randomUUID();
    lastTurnRef.current = { history, latest: learnerArgument };
    stickToBottomRef.current = true;
    setCueSequence((current) => current + 1);
    setCueVisible(true);
    const controller = new AbortController();
    abortRef.current = controller;
    setTurnError("");
    setStreaming(true);
    setMessages((current) => [
      ...current,
      { id: replyId, speaker: "opponent", content: "", pending: true },
    ]);

    let bufferedDiagnostics: DebateMessage["diagnostics"];
    try {
      const reply = await streamOpponentReply(
        options,
        history,
        learnerArgument,
        session?.access_token,
        (delta) => {
          // Skip mode still reads the whole stream; it just commits once at the end.
          if (!streamReplies) return;
          setMessages((current) =>
            current.map((message) =>
              message.id === replyId
                ? { ...message, content: message.content + delta }
                : message,
            ),
          );
        },
        controller.signal,
        applicationSettings.usePracticeHistory ? memoryRef.current : [],
        (diagnostics) => {
          // Skip mode commits the reply and its checks together at the end.
          if (!streamReplies) {
            bufferedDiagnostics = diagnostics;
            return;
          }
          setMessages((current) =>
            current.map((message) =>
              message.id === replyId ? { ...message, diagnostics } : message,
            ),
          );
        },
      );
      if (!streamReplies) {
        setMessages((current) =>
          current.map((message) =>
            message.id === replyId
              ? { ...message, content: reply, ...(bufferedDiagnostics ? { diagnostics: bufferedDiagnostics } : {}) }
              : message,
          ),
        );
      }
      lastTurnRef.current = null;
      setMessages((current) =>
        current.map((message) =>
          message.id === replyId ? { ...message, pending: false } : message,
        ),
      );
      setTurnError("");
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== replyId));
      if (controller.signal.aborted) return;
      setTurnError(turnErrorMessage(error));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function retryLastTurn() {
    const lastTurn = lastTurnRef.current;
    if (!lastTurn || streaming) return;
    stickToBottomRef.current = true;
    void requestOpponentReply(lastTurn.history, lastTurn.latest);
  }

  useEffect(() => {
    if (!cueVisible) return;
    const cueTimer = window.setTimeout(() => setCueVisible(false), 1050);
    return () => window.clearTimeout(cueTimer);
  }, [cueSequence, cueVisible]);

  useEffect(() => {
    // The affirmative (For) side opens. When the learner chose Against, the
    // opponent is For and makes the opening statement; otherwise the learner
    // gets the first turn.
    if (view === "arena" && sessionId > 0 && messages.length === 0 && position === "against") {
      void requestOpponentReply([], null);
    }
  }, [view, sessionId, position]);

  // A restored transcript can end on the learner's turn when the tab closed
  // mid-reply. Ask the opponent to finish that turn once, instead of leaving it
  // hanging or pretending a partial stream was a full answer.
  useEffect(() => {
    const latest = pendingResumeRef.current;
    if (view !== "arena" || !latest || streaming) return;
    const completed = messages.filter((message) => !message.pending);
    const last = completed[completed.length - 1];
    if (!last || last.speaker !== "learner" || last.content !== latest) return;
    pendingResumeRef.current = null;
    void requestOpponentReply(completed.slice(0, -1), latest);
  }, [view, sessionId, streaming, messages]);

  useEffect(() => {
    if (view !== "arena" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      if (clockPausedRef.current) return;
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  useEffect(() => {
    if (view !== "arena") {
      setGraceTurn(false);
      graceOfferedRef.current = false;
    }
  }, [view]);

  useEffect(() => {
    if (view !== "arena" || secondsLeft > 0 || streaming) return;
    // If a point is already in the composer, offer one grace turn instead of
    // cutting the learner off mid-sentence. The clock stays at zero.
    if (!graceOfferedRef.current && draft.trim() && learnerTurns.length > 0) {
      graceOfferedRef.current = true;
      setGraceTurn(true);
      setRecordNotice("Time — one last point. Send it, or review now.");
      return;
    }
    if (graceTurn) return;
    setRecordNotice("Time — wrapping up with the reply on screen.");
    finishSession();
  }, [view, secondsLeft, streaming, draft, graceTurn, learnerTurns.length]);

  function handleTranscriptScroll() {
    const element = transcriptRef.current;
    if (!element) return;
    const nearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 72;
    stickToBottomRef.current = nearBottom;
    if (nearBottom) setShowJumpToLatest(false);
    else if (messages.length > 0) setShowJumpToLatest(true);
  }

  function jumpToLatest() {
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function persistArenaSnapshot() {
    if (view !== "arena") return null;
    // A partial stream must never be restored later as if it were a full turn.
    const completed = messages.filter(
      (message) => !message.pending && message.content.trim(),
    );
    if (!completed.some((message) => message.speaker === "learner")) return null;
    const snapshot: ArenaSnapshot = {
      messages: completed, draft, secondsLeft, duration, topicChoice, customTopic,
      position, persona, difficulty, sessionId, startedAt, recordId, continuation, continuedHistoryCount,
      savedAt: Date.now(),
    };
    try {
      window.sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch {
      /* Private browsing or quota — the live session is unaffected. */
    }
    return snapshot;
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({
      behavior: streaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, streaming]);

  useEffect(() => {
    persistArenaSnapshot();
  }, [view, messages, draft, secondsLeft, duration, topicChoice, customTopic, position, persona, difficulty, sessionId, startedAt, recordId, continuation, continuedHistoryCount]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ArenaSnapshot>;
      const messages = Array.isArray(parsed.messages)
        ? parsed.messages.filter((message) => !message.pending && message.content.trim())
        : [];
      if (messages.some((message) => message.speaker === "learner")) {
        setSavedSnapshot({ ...(parsed as ArenaSnapshot), messages });
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
  }, openVoiceAfterStart = false) {
    if (startingSession) return;
    const chosenTopic = (prefill?.topic ?? activeTopic).trim();
    const chosenDuration = prefill?.duration ?? duration;
    if (!chosenTopic) return;
    abortRef.current?.abort();
    clearSnapshot();
    setVoiceOpen(false);
    lastTurnRef.current = null;
    pendingResumeRef.current = null;
    setStartingSession(true);
    setTurnError("");
    setChallengeError("");
    setChallengeDone(false);
    setShowJumpToLatest(false);
    setCueVisible(false);
    setRecordNotice("");
    setAnalysis(null);
    setAnalysisComplete(false);
    setAnalysisError("");
    setAnalysisSaved(false);
    setPlanUpdateStatus("idle");
    setPlanUpdateError("");
    setDeliveryResult(null);
    setJudge(null);
    setVerdictRank(null);
    setVerdictRankLoading(false);
    setJudgeError("");
    setMessages([]);
    setRecordId(null);
    setContinuation(false);
    setContinuedHistoryCount(0);
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
    setEndedAt(0);
    savedTurnIds.current = new Set();
    let nextRecordId: string | null = null;
    memoryRef.current = [];
    memoryLoadedRef.current = false;
    if (user && supabaseConfigured) {
      const recordInput = {
          topic: chosenTopic,
          learner_position: prefill?.position ?? position,
          persona: prefill?.persona ?? persona,
          difficulty: prefill?.difficulty ?? difficulty,
        };
      if (openVoiceAfterStart) {
        void createDebateRecord(recordInput, chosenDuration)
          .then((id) => setRecordId(id))
          .catch(() => setRecordNotice("Voice debate is running, but this session could not be saved to your account."));
      } else {
        try {
          nextRecordId = await createDebateRecord(recordInput, chosenDuration);
        } catch {
          setRecordNotice("The debate can continue, but this session could not be saved to your account. Check your Supabase setup.");
        }
      }
      if (!openVoiceAfterStart && loadApplicationSettings(user.id).usePracticeHistory) {
        try {
          memoryRef.current = await loadSessionDigests(12);
        } catch {
          memoryRef.current = [];
        }
        memoryLoadedRef.current = true;
      }
    }
    if (!openVoiceAfterStart) setRecordId(nextRecordId);
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
    setVoiceOpen(openVoiceAfterStart);
    setStartingSession(false);
  }

  const sampleMotion = "Should public transit be free for everyone?";

  function openAuth(mode: "sign-in" | "sign-up", destination?: View | null) {
    setAuthMode(mode);
    if (destination !== undefined) rememberAuthDestination(destination);
    routedForRef.current = null;
    setAuthPurpose(null);
    pendingVoiceStartRef.current = null;
    setView("auth");
  }

  function seedSetup(mode: SetupMode) {
    if (!user) return;
    const learnerPrefs = loadPrefs(user.id);
    const recommendation = buildRecommendation(learnerPrefs.experience, learnerPrefs);
    const orderedTopics = orderedStarterTopics(starterTopics, learnerPrefs);
    pendingVoiceStartRef.current = null;
    setAuthPurpose(null);
    setTopicChoice(orderedTopics[0] ?? starterTopics[0]);
    setCustomTopic("");
    setPosition("for");
    setPersona(recommendation.persona);
    setDifficulty(recommendation.difficulty);
    setDuration(recommendation.duration);
    setSecondsLeft(recommendation.duration * 60);
    setSetupStep(1);
    setSetupMode(mode);
    setSetupFocus(null);
    setView("setup");
  }

  function openPracticeDebate() {
    if (!user) {
      openAuth("sign-up", "setup");
      return;
    }
    seedSetup("fresh");
  }

  // The verdict's one recommendation: keep the motion and side, change the
  // opponent and pressure so the weakest score is what the round tests.
  function openFocusedRound() {
    if (!nextPracticeFocus) {
      openRematch();
      return;
    }
    applyRecentMotion(activeTopic);
    setPosition(position);
    setPersona(nextPracticeFocus.persona);
    setDifficulty(nextPracticeFocus.difficulty);
    setDuration(nextPracticeFocus.duration);
    setSecondsLeft(nextPracticeFocus.duration * 60);
    setSetupFocus(nextPracticeFocus);
    setSetupMode("focused");
    setSetupStep(1);
    setView("setup");
    window.scrollTo(0, 0);
  }

  function openRematch() {
    applyRecentMotion(activeTopic);
    setSecondsLeft(duration * 60);
    setSetupFocus(null);
    setSetupMode("rematch");
    setSetupStep(1);
    setView("setup");
    window.scrollTo(0, 0);
  }

  function clearSetupCarry() {
    seedSetup("fresh");
    window.scrollTo(0, 0);
  }

  function openAnalysis() {
    if (!user) {
      setAccountStartSection("analysis");
      openAuth("sign-up", "account");
      return;
    }
    pendingVoiceStartRef.current = null;
    setAuthPurpose(null);
    setAccountFocusId(null);
    setAccountStartSection("analysis");
    setView("account");
  }

  function openPlan() {
    if (!user) {
      setAccountStartSection("plan");
      openAuth("sign-up", "account");
      return;
    }
    pendingVoiceStartRef.current = null;
    setAuthPurpose(null);
    setAccountFocusId(null);
    setAccountStartSection("plan");
    setView("account");
  }

  async function updatePlanFromSavedWork() {
    if (!user || !recordId || planUpdateInFlightRef.current) return;
    planUpdateInFlightRef.current = true;
    setPlanUpdateStatus("updating");
    setPlanUpdateError("");
    try {
      const profile = await loadProfile(user.id).catch(() => null);
      const currentPrefs = loadPrefs(user.id);
      await generateAndSaveLearningPlan(user.id, {
        goals: profile?.goals ?? null,
        experience: profile?.experience ?? currentPrefs.experience,
        preferences: preferencesFor(currentPrefs),
      }, session?.access_token);
      setPlanUpdateStatus("updated");
    } catch (error) {
      setPlanUpdateStatus("failed");
      setPlanUpdateError(error instanceof Error ? error.message : "The practice plan could not be updated.");
    } finally {
      planUpdateInFlightRef.current = false;
    }
  }

  async function reviewDebate() {
    if (analysisLoading || reviewInFlightRef.current || learnerTurns.length === 0) return;
    reviewInFlightRef.current = true;
    setAnalysisLoading(true);
    setAnalysisComplete(false);
    setAnalysisError("");
    setAnalysisSaved(false);
    setJudge(null);
    setVerdictRank(null);
    setVerdictRankLoading(false);
    setJudgeError("");
    try {
      const report = await streamAnalysis({
        topic: activeTopic,
        learner_position: position,
        persona,
        difficulty,
      }, messages, session?.access_token, (partial) => {
        setAnalysis(partial);
        if (partial.ratings) void runJudge(partial, null, messages, null);
      });
      setAnalysis(report);
      setAnalysisComplete(true);
      let reviewSaved = false;
      if (recordId) {
        try {
          await saveDebateAnalysis(recordId, report);
          reviewSaved = true;
          setAnalysisSaved(true);
        } catch {
          setAnalysisError("The review is ready, but could not be saved to your learner archive.");
        }
      }
      // The weighted verdict is deterministic and does not depend on the plan refresh.
      // Start it first; the slower plan call then runs in the background.
      if (report.ratings) void runJudge(report, deliveryResult);
      if (user && recordId && reviewSaved) {
        void updatePlanFromSavedWork();
      } else if (user && recordId) {
        setPlanUpdateStatus("failed");
        setPlanUpdateError("The review could not be saved, so the practice plan was not updated.");
      }
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "The coach could not review this transcript.");
    } finally {
      reviewInFlightRef.current = false;
      setAnalysisLoading(false);
    }
  }

  async function runJudge(report: AnalysisReport | null, delivery: PresentationResult | null, debateTurns = messages, targetRecordId = recordId) {
    if (!report?.ratings) return;
    const sequence = ++judgeSeqRef.current;
    setJudgeLoading(true);
    setJudgeError("");
    if (delivery?.transcript.trim()) {
      setJudge(null);
      setVerdictRank(null);
    }
    if (targetRecordId) {
      setVerdictRank(null);
      setVerdictRankLoading(true);
    }
    try {
      let scoredReport = report;
      if (delivery?.transcript.trim()) {
        scoredReport = await analyzeDebate({
          topic: activeTopic,
          learner_position: position,
          persona,
          difficulty,
        }, debateTurns, session?.access_token, delivery.transcript);
        setAnalysis(scoredReport);
        setAnalysisComplete(true);
        if (targetRecordId) {
          try {
            await saveDebateAnalysis(targetRecordId, scoredReport);
            setAnalysisSaved(true);
          } catch {
            setAnalysisError("The closing take was scored, but the updated review could not be saved to your archive.");
          }
        }
      }
      const verdict = await requestJudge(scoredReport, delivery, debateTurns, session?.access_token);
      if (sequence !== judgeSeqRef.current) return;
      setJudge(verdict);
      if (targetRecordId) {
        let verdictSaved = false;
        setVerdictRankLoading(true);
        try {
          await saveDebateVerdict(targetRecordId, verdict);
          verdictSaved = true;
        } catch {
          setJudgeError("The score is ready, but could not be saved to your archive. Try scoring it again.");
        }
        if (verdictSaved) {
          try {
            const rank = await loadDebateVerdictRank(targetRecordId);
            if (sequence === judgeSeqRef.current) setVerdictRank(rank);
          } catch {
            if (sequence === judgeSeqRef.current) setVerdictRank(null);
          }
        }
        if (sequence === judgeSeqRef.current) setVerdictRankLoading(false);
      }
    } catch (error) {
      if (sequence !== judgeSeqRef.current) return;
      setJudgeError(error instanceof Error ? error.message : "The judge could not score this rehearsal. Try again.");
    } finally {
      if (sequence === judgeSeqRef.current) {
        setJudgeLoading(false);
        setVerdictRankLoading(false);
      }
    }
  }

  function openArchivedVerdict(record: DebateRecord, turns: DebateRecordTurn[], report: AnalysisReport | null, savedVerdict: JudgeVerdict | null, delivery: PresentationResult | null) {
    const debateTurns: DebateMessage[] = turns.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker,
      content: turn.content,
      kind: turn.kind,
      challengeDepth: turn.challenge_depth ?? undefined,
      challengeTarget: turn.challenge_target ?? undefined,
    }));
    applyRecentMotion(record.topic);
    setPosition(record.learner_position);
    setPersona(record.persona);
    setDifficulty(record.difficulty);
    setDuration(record.duration_minutes);
    setSecondsLeft(record.duration_minutes * 60);
    setMessages(debateTurns);
    setRecordId(record.id);
    setStartedAt(new Date(record.started_at).getTime());
    setEndedAt(record.finished_at ? new Date(record.finished_at).getTime() : Date.now());
    setAnalysis(report);
    setAnalysisComplete(Boolean(report));
    setAnalysisSaved(Boolean(report));
    setAnalysisLoading(false);
    setAnalysisError("");
    setJudge(savedVerdict);
    setVerdictRank(null);
    setVerdictRankLoading(Boolean(savedVerdict));
    if (savedVerdict) {
      void loadDebateVerdictRank(record.id)
        .then(setVerdictRank)
        .catch(() => setVerdictRank(null))
        .finally(() => setVerdictRankLoading(false));
    }
    setJudgeLoading(false);
    setJudgeError("");
    setPlanUpdateStatus("idle");
    setPlanUpdateError("");
    setDeliveryResult(delivery);
    setPendingArchiveVerdict({ record, turns: debateTurns, analysis: report, verdict: savedVerdict, delivery });
    setView("verdict");
  }

  useEffect(() => {
    if (!pendingArchiveVerdict || view !== "verdict") return;
    const pending = pendingArchiveVerdict;
    setPendingArchiveVerdict(null);
    if (pending.analysis) {
      if (!pending.verdict && pending.analysis.ratings) {
        void runJudge(pending.analysis, pending.delivery, pending.turns, pending.record.id);
      }
    } else if (pending.turns.some((turn) => turn.speaker === "learner")) {
      void reviewDebate();
    }
  }, [pendingArchiveVerdict, view]);

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
    setEndedAt(Date.now());
    abortRef.current?.abort();
    setStreaming(false);
    setConfirmEnd(false);
    setGraceTurn(false);
    graceOfferedRef.current = false;
    setChallengeDone(false);
    setShowJumpToLatest(false);
    lastTurnRef.current = null;
    pendingResumeRef.current = null;
    clearSnapshot();
    if (recordId) {
      void finishDebateRecord(recordId).catch(() => {
        setRecordNotice("The transcript is saved, but the rehearsal could not be marked complete. It will remain in your archive.");
      });
    }
    setView("verdict");
    if (user && recordId && learnerTurns.length > 0) void reviewDebate();
  }

  async function submitArgument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const argument = draft.trim();
    if (!argument || streaming || (secondsLeft === 0 && !graceTurn)) return;
    const learnerMessage: DebateMessage = {
      id: crypto.randomUUID(),
      speaker: "learner",
      content: argument,
    };
    stickToBottomRef.current = true;
    setShowJumpToLatest(false);
    setChallengeDone(false);
    setMessages((current) => [...current, learnerMessage]);
    setDraft("");
    setChallengeError("");
    await requestOpponentReply(messages, argument);
    if (graceTurn) {
      // Let the render with the grace turn land before the verdict reads the
      // transcript, so the last point is part of the review.
      setGraceTurn(false);
    }
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
    if (challengeDone || challenging || streaming || !latestLearner || depth >= 2 || secondsLeft === 0) return;
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
        setChallengeDone(true);
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
    const restored = snapshot.messages.filter(
      (message) => !message.pending && message.content.trim(),
    );
    if (remaining <= 0 || !restored.some((message) => message.speaker === "learner")) {
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
    setMessages(
      restored.map((message) => ({
        ...message,
        content: stripControlMarkers(message.content),
        pending: false,
      })),
    );
    const last = restored[restored.length - 1];
    pendingResumeRef.current = last.speaker === "learner" ? last.content : null;
    savedTurnIds.current = new Set(restored.map((message) => message.id));
    setDraft(snapshot.draft);
    setSessionId(snapshot.sessionId);
    setStartedAt(snapshot.startedAt);
    setEndedAt(0);
    setRecordId(snapshot.recordId);
    setContinuation(snapshot.continuation ?? false);
    setContinuedHistoryCount(Math.min(snapshot.continuedHistoryCount ?? 0, restored.length));
    setStreaming(false);
    setCueVisible(false);
    setTurnError("");
    setChallengeError("");
    setChallengeDone(false);
    setShowJumpToLatest(false);
    setRecordNotice("");
    setSavedSnapshot(null);
    stickToBottomRef.current = true;
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
    pendingVoiceStartRef.current = null;
    setAuthPurpose(null);
    const snapshot = persistArenaSnapshot();
    abortRef.current?.abort();
    setStreaming(false);
    setConfirmEnd(false);
    setGraceTurn(false);
    graceOfferedRef.current = false;
    lastTurnRef.current = null;
    pendingResumeRef.current = null;
    if (snapshot) setSavedSnapshot(snapshot);
    setTurnError("");
    setChallengeError("");
    setChallengeDone(false);
    setShowJumpToLatest(false);
    setAccountFocusId(null);
    setView(user ? "home" : "landing");
    setMessages([]);
    setSessionId(0);
    setRecordId(null);
    setContinuation(false);
    setContinuedHistoryCount(0);
    setRecordNotice("");
  }

  function openAccount() {
    if (authLoading) return;
    setAccountFocusId(null);
    if (user) setView("account");
    else openAuth("sign-in", "account");
  }

  function openSettings() {
    if (user) setView("settings");
    else openAuth("sign-in", "settings");
  }

  function openDeliveryPractice() {
    if (user) setView("present");
    else openAuth("sign-up", "present");
  }

  async function handleSignOut() {
    await signOut();
    setAccountFocusId(null);
    routedForRef.current = null;
    setPrefsReady(false);
    setLearnerName(null);
    setView("landing");
  }

  function completeOnboarding(result: OnboardingResult) {
    if (result.profile.display_name) setLearnerName(result.profile.display_name);
    if (result.destination === "delivery") {
      setView("present");
      return;
    }
    // The onboarding answers just picked a room; open it ready to start rather
    // than sending the learner to a dashboard to find the same setup again.
    seedSetup("recommended");
  }

  function skipOnboarding() {
    setView(user ? "home" : "landing");
  }

  async function continueSavedDebate(record: DebateRecord, turns: DebateRecordTurn[]) {
    if (startingSession) return;
    setStartingSession(true);
    abortRef.current?.abort();
    clearSnapshot();
    const restoredMessages: DebateMessage[] = turns.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker,
      content: stripControlMarkers(turn.content),
      kind: turn.kind === "challenge" ? "challenge" : undefined,
      challengeDepth: turn.challenge_depth ?? undefined,
      challengeTarget: turn.challenge_target ?? undefined,
    }));
    setTopicChoice(motionTitles.includes(record.topic) ? record.topic : "");
    setCustomTopic(motionTitles.includes(record.topic) ? "" : record.topic);
    setPosition(record.learner_position);
    setPersona(record.persona);
    setDifficulty(record.difficulty);
    setDuration(record.duration_minutes);
    setSecondsLeft(record.duration_minutes * 60);
    setStartedAt(Date.now());
    setEndedAt(0);
    setMessages(restoredMessages);
    setDraft("");
    setAnalysis(null);
    setAnalysisComplete(false);
    setAnalysisError("");
    setAnalysisSaved(false);
    setPlanUpdateStatus("idle");
    setPlanUpdateError("");
    setDeliveryResult(null);
    setJudge(null);
    setVerdictRank(null);
    setVerdictRankLoading(false);
    setJudgeError("");
    setConfirmEnd(false);
    setStreaming(false);
    setCueVisible(false);
    setTurnError("");
    setChallengeError("");
    setChallengeDone(false);
    setShowJumpToLatest(false);
    lastTurnRef.current = null;
    pendingResumeRef.current = null;
    stickToBottomRef.current = true;
    setContinuation(true);
    setContinuedHistoryCount(restoredMessages.length);
    setRecordId(record.id);
    savedTurnIds.current = new Set(restoredMessages.map((message) => message.id));
    memoryRef.current = [];
    memoryLoadedRef.current = false;
    if (user && supabaseConfigured && loadApplicationSettings(user.id).usePracticeHistory) {
      try {
        memoryRef.current = await loadSessionDigests(12);
      } catch {
        memoryRef.current = [];
      }
      memoryLoadedRef.current = true;
    }
    let notice = "";
    try {
      await resumeDebateRecord(record.id);
    } catch {
      notice = "The conversation is loaded, but its archive status could not be updated.";
    }
    try {
      await deleteDebateAnalysis(record.id);
    } catch {
      notice = "The conversation is loaded, but its earlier case review could not be cleared. Review again when you finish.";
    }
    setRecordNotice(notice);
    setSessionId((current) => current + 1);
    setView("arena");
    setStartingSession(false);
  }

  // Freeze the room clock when the rehearsal ends; the review can take a while,
  // and its wait must not be reported as time the learner spent in the room.
  const endedOrNow = endedAt || Date.now();
  const elapsed = startedAt ? Math.max(0, Math.floor((endedOrNow - startedAt) / 1000)) : 0;
  const modelOffline = modelStatus.status === "model_unavailable";

  if (requiresAccount(view) && authLoading) {
    return <div className="protected-route-loading" role="status">Checking your sign-in…</div>;
  }

  if (requiresAccount(view) && !user) {
    return (
      <div className="app-shell">
        <PublicWelcome
          onSignIn={() => openAuth("sign-in")}
          onRegister={() => openAuth("sign-up")}
          onStart={() => openAuth("sign-up", "setup")}
          accountAvailable={supabaseConfigured}
        />
      </div>
    );
  }

  return (
    <div className={`app-shell ${view === "setup" ? "app-shell-setup" : ""} ${view === "arena" || view === "verdict" || view === "present" ? "app-shell-room" : ""}`}>
      {view !== "arena" && view !== "verdict" && view !== "onboarding" && view !== "landing" && view !== "auth" && (
        theme === "new" ? (
          <PracticeHeader
            active={view === "settings" ? "settings" : view === "present" ? "delivery" : view === "account" ? accountStartSection : "debate"}
            onHome={returnHome}
            onDebate={openPracticeDebate}
            onAnalysis={openAnalysis}
            onPlan={openPlan}
            onDelivery={openDeliveryPractice}
            onSettings={openSettings}
          />
        ) : (
          <Header
            onHome={returnHome}
            onStart={openPracticeDebate}
            onAccount={view === "account" ? returnHome : openAccount}
            onSettings={openSettings}
            accountLabel={view === "account" ? "Dashboard" : authLoading ? "…" : user ? (learnerName ? learnerName.split(/\s+/)[0] : "Learner space") : "Sign in"}
            showCta={view !== "setup"}
          />
        )
      )}

      <AnimatePresence mode="wait">
        {view === "auth" && (
          <motion.div key="auth" className="app-auth-view" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading account access…</div>}>
              <AuthView
                purpose={authPurpose}
                initialMode={authMode}
                initialRecovering={authRecoveryFlow}
                redirectTo={authDestination ? `${window.location.origin}/?next=${encodeURIComponent(authDestination)}` : window.location.origin}
                onRecoveryChange={setAuthRecoveryFlow}
                onBack={() => {
                  rememberAuthDestination(null);
                  pendingVoiceStartRef.current = null;
                  setAuthRecoveryFlow(false);
                  setAuthPurpose(null);
                  setView("landing");
                }}
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
                  : null}
            </Suspense>
          </motion.div>
        )}

        {view === "home" && theme === "new" && (
          <motion.div key="home-new" className="app-shell-room" {...pageMotion}>
            <PracticeHome
              userId={user?.id ?? null}
              authLoading={authLoading}
              resume={savedSnapshot && savedSnapshot.messages.length > 0 ? {
                turns: savedSnapshot.messages.filter((message) => message.speaker === "learner").length,
                topic: savedSnapshot.customTopic.trim() || savedSnapshot.topicChoice,
                onResume: () => resumeSnapshot(savedSnapshot),
                onDiscard: clearSnapshot,
              } : null}
              onDebate={openPracticeDebate}
              onAnalysis={openAnalysis}
              onPlan={openPlan}
              onDelivery={openDeliveryPractice}
              onArchive={openAnalysis}
              onOpenRecord={(recordIdToOpen) => {
                setAccountFocusId(recordIdToOpen);
                setAccountStartSection("analysis");
                setView("account");
              }}
            />
          </motion.div>
        )}

        {view === "home" && theme === "classic" && (
          <motion.div key="home" className="app-shell-room" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading your dashboard…</div>}>
              {authLoading
                ? <div className="inline-notice" role="status">Checking your sign-in…</div>
                : user
                  ? (
                    <DashboardView
                      userId={user.id}
                      accessToken={session?.access_token}
                      displayName={learnerName}
                      resume={savedSnapshot && savedSnapshot.messages.length > 0 ? {
                        turns: savedSnapshot.messages.filter((message) => message.speaker === "learner").length,
                        topic: savedSnapshot.customTopic.trim() || savedSnapshot.topicChoice,
                        onResume: () => resumeSnapshot(savedSnapshot),
                        onDiscard: clearSnapshot,
                      } : null}
                      onLaunch={(prefill) => void startSession(prefill)}
                      onNavigate={(next) => {
                        if (next === "account") setAccountFocusId(null);
                        setView(next);
                      }}
                      onOpenRecord={(recordIdToOpen) => {
                        setAccountFocusId(recordIdToOpen);
                        setView("account");
                      }}
                    />
                  )
                  : null}
            </Suspense>
          </motion.div>
        )}

        {view === "settings" && (
          <motion.div key="settings" className="app-shell-room" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading settings…</div>}>
              <SettingsView settings={appSettings} onChange={updateApplicationSettings} onSignIn={() => setView("auth")} onSignOut={handleSignOut} />
            </Suspense>
          </motion.div>
        )}

        {view === "account" && (
          <motion.div key="account" className="app-shell-room" {...pageMotion}>
            <Suspense fallback={<div className="inline-notice" role="status">Loading your archive…</div>}>
              {authLoading
                ? <div className="inline-notice" role="status">Checking your sign-in…</div>
                : (
                  <AccountView
                    onStart={openPracticeDebate}
                    onDelivery={openDeliveryPractice}
                    onContinue={(record, turns) => void continueSavedDebate(record, turns)}
                    onViewVerdict={openArchivedVerdict}
                    onSignOut={handleSignOut}
                    focusRecordId={accountFocusId}
                    onFocusConsumed={() => setAccountFocusId(null)}
                    theme={theme}
                    initialSection={accountStartSection === "plan" ? "plan" : "progress"}
                  />
                )}
            </Suspense>
          </motion.div>
        )}

        {view === "landing" && (
          <motion.div key="landing" {...pageMotion}>
            <PublicWelcome
              onSignIn={() => openAuth("sign-in")}
              onRegister={() => openAuth("sign-up")}
              onStart={() => openAuth("sign-up", "setup")}
              accountAvailable={supabaseConfigured}
            />
          </motion.div>
        )}

        {view === "setup" && (
          <motion.main key="setup" className="setup-page fixture-page" {...pageMotion}>
            <div className="setup-heading">
              <h1>{learnerName ? `Set up your debate, ${learnerName.split(/\s+/)[0]}.` : "Set up your debate."}</h1>
              <p>{learnerName ? "Chosen for your level. Adjust any detail before you step in." : "Choose a motion, side and opponent, then set the pace. Change anything before you begin."}</p>
              {setupMode !== "fresh" && (
                <div className={`setup-carry is-${setupMode}`} role="status">
                  <div className="setup-carry-copy">
                    <span>{setupMode === "focused" ? "FOCUSED ROUND" : setupMode === "rematch" ? "REMATCH" : "YOUR ROOM IS SET"}</span>
                    <p>
                      {setupMode === "focused"
                        ? setupFocus?.reason ?? "The round keeps your last motion and side."
                        : setupMode === "rematch"
                          ? "Same motion, side, opponent, and pressure as the round you just finished."
                          : "Built from your onboarding answers. Change any detail below before you start."}
                    </p>
                  </div>
                  <div className="setup-carry-terms" aria-label="Current room">
                    <b>{personaFor(persona).name}</b>
                    <small>{difficultyFor(difficulty).label} · {duration} min</small>
                  </div>
                  <button type="button" className="setup-carry-clear" onClick={clearSetupCarry}>
                    {setupMode === "focused" ? "Clear focus" : setupMode === "rematch" ? "Start fresh" : "Adjust from scratch"}
                  </button>
                </div>
              )}
              <nav className="fixture-steps" aria-label="Debate setup steps">
                {(["Motion", "Side", "Opponent", "Round"] as const).map((label, index) => (
                  <Fragment key={label}>
                    {index > 0 && <span className="fixture-connector" aria-hidden="true" />}
                    <button
                      type="button"
                      className={setupStep === index + 1 ? "current" : setupStep > index + 1 ? "complete" : "upcoming"}
                      aria-current={setupStep === index + 1 ? "step" : undefined}
                      aria-label={`Go to step ${index + 1}: ${label}`}
                      onClick={() => {
                        setSetupStep((index + 1) as 1 | 2 | 3 | 4);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <i aria-hidden="true">{index + 1}</i>
                      <span>{label}</span>
                    </button>
                  </Fragment>
                ))}
              </nav>
              {modelOffline && (
                <div className="inline-notice" role="status">
                  <span>Before you start: {modelStatus.hint ?? "The practice model is not running."} Nothing is wrong with your setup — the room simply cannot open a case yet.</span>
                  <button type="button" onClick={() => void checkModel()} disabled={modelChecking}>{modelChecking ? "Checking…" : "Check again"}</button>
                </div>
              )}
            </div>

            <div className={`setup-layout fixture-layout step-${setupStep}`}>
              {setupStep === 1 && <>
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
                      <span className="topic-number">{(index + 1).toString().padStart(2, "0")}</span><span>{topic}</span>
                      {topicChoice === topic && !customTopic ? <Check size={16} /> : <ArrowUpRight size={14} />}
                    </button>
                  ))}
                </div>
                <label className="custom-topic-label" htmlFor="custom-topic">OR WRITE YOUR OWN</label>
                <input
                  id="custom-topic"
                  className="custom-topic-input"
                  value={customTopic}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCustomTopic(value);
                    if (value.trim()) setTopicChoice("");
                  }}
                  maxLength={240}
                  placeholder={sampleMotion}
                />
                {user && customTopic.trim().length >= 3 && (
                  <button className="bank-save-link" type="button" onClick={() => void saveMotionToBank()}>
                    Save this motion to my bank
                  </button>
                )}
                {bankNotice && <p className="setup-hint" role="status">{bankNotice}</p>}
              </section>
              </>}
              {setupStep === 2 && <section className="setup-panel motion-panel">
                <div className="panel-heading"><span className="panel-count">2</span><div><h2>Choose your side.</h2><p>Argue for or against the motion.</p></div></div>
                <div className="fixture-side-options" role="group" aria-label="Your side">
                  <button className={position === "for" ? "selected" : ""} aria-pressed={position === "for"} onClick={() => setPosition("for")}><b>For</b><span>Defend the motion and build the affirmative case.</span></button>
                  <button className={position === "against" ? "selected" : ""} aria-pressed={position === "against"} onClick={() => setPosition("against")}><b>Against</b><span>Challenge the motion and argue the opposition.</span></button>
                </div>
              </section>}
              {setupStep === 3 && <>
              <section className="setup-panel opponent-panel" id="setup-opponent">
                <div className="panel-heading"><span className="panel-count">3</span><div><h2>Your opponent</h2><p>Each one attacks a case differently.</p></div></div>
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

              </section>
              </>}
              {setupStep === 4 && <section className="setup-panel opponent-panel round-panel">
                <div className="panel-heading"><span className="panel-count">4</span><div><h2>Set the round.</h2><p>Choose how hard and how long to practise.</p></div></div>
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
              </section>}
              <aside className="fixture-summary" aria-label="Your match summary"><h2>Your match</h2><dl><div><dt>Side</dt><dd>{position === "for" ? "For" : "Against"}</dd></div><div><dt>Opponent</dt><dd>{activePersona.name}</dd></div><div><dt>Pressure</dt><dd>{difficultyOptions.find((option) => option.value === difficulty)?.label}</dd></div><div><dt>Length</dt><dd>{duration} minutes</dd></div></dl></aside>
            </div>

            <div className="setup-bottom">
              {setupStep === 1 && <button className="fixture-back" type="button" onClick={returnHome}><ArrowLeft size={18} />Back</button>}
              {setupStep > 1 && <button className="fixture-back" type="button" onClick={() => { setSetupStep((step) => (step - 1) as 1 | 2 | 3 | 4); window.scrollTo(0, 0); }}><ArrowLeft size={18} />Back</button>}
              {setupStep < 4 && <button className="button button-dark setup-submit" type="button" disabled={setupStep === 1 && !activeTopic.trim()} onClick={() => { setSetupStep((step) => (step + 1) as 1 | 2 | 3 | 4); window.scrollTo(0, 0); }}>Continue <ArrowRight size={17} /></button>}
              {setupStep === 4 && <div className="setup-submit-actions">
                <button className="button button-light setup-submit setup-submit-voice" type="button" onClick={() => void startSession(undefined, true)} disabled={!activeTopic.trim() || startingSession}>
                  {startingSession ? "Setting up..." : "Start with voice"} {!startingSession && <Mic size={16} />}
                </button>
                <button className="button button-dark setup-submit" type="button" onClick={() => void startSession()} disabled={!activeTopic.trim() || startingSession}>
                  {startingSession ? "Setting up..." : "Start rehearsal"} {!startingSession && <ArrowRight size={17} />}
                </button>
              </div>}
            </div>
            {setupStep < 4 && <div className="fixture-next-cue"><span>NEXT</span><b>{["", "Choose your side.", "Meet your opponent.", "Set the round."][setupStep]}</b><small>{["", "Argue for or against the motion.", "Choose the voice that will challenge your case.", "Set the pressure and length of your rehearsal."][setupStep]}</small></div>}
            {!activeTopic.trim() && (
              <p className="setup-hint" role="status">Choose a motion above, or write your own, to begin.</p>
            )}
          </motion.main>
        )}

        {view === "arena" && (
          <motion.main key="arena" className="arena-page" {...pageMotion}>
            <header className="arena-header">
              <button className="arena-brand" onClick={returnHome} aria-label="Return home"><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button>
              <div className="arena-session"><span>{continuation ? "CONTINUED REHEARSAL" : "LIVE REHEARSAL"}</span><i /> <span>ACT / {String(sessionId).slice(-4).padStart(4, "0")}</span></div>
              <div className="arena-header-actions"><button className="voice-open-button" onClick={() => setVoiceOpen(true)} aria-label="Open voice debate" aria-haspopup="dialog"><Mic size={14} /> Voice</button><button className="pause-button" type="button" onClick={returnHome} title="Save this round and return home. Resume it from your dashboard.">Save &amp; leave</button><button className={`end-button${confirmEnd ? " armed" : ""}`} onClick={requestEndSession}>{confirmEnd ? "Tap again to finish" : "Finish & review"} <X size={15} /></button></div>
            </header>

            {voiceOpen && (
              <VoiceRoomBoundary onClose={() => setVoiceOpen(false)}>
                <Suspense fallback={<div className="inline-notice" role="status">Opening the voice room…</div>}>
                  <VoiceRoom
                    topic={activeTopic}
                    position={position}
                    persona={persona}
                    difficulty={difficulty}
                    preferences={learnerAim()}
                    streamReplies={streamReplies}
                    streamRepliesDefault={appSettings.streamReplies}
                    onStreamRepliesChange={setStreamReplies}
                    onRememberStreamReplies={() => rememberStreamReplies(streamReplies)}
                    onTypeInstead={() => {
                      setVoiceOpen(false);
                      window.setTimeout(() => composerRef.current?.focus(), 80);
                    }}
                    accessToken={session?.access_token}
                    history={messages
                      .filter((message) => !message.pending && message.content.trim())
                      .slice(-200)
                      .map(({ speaker, content }) => ({ speaker, content }))}
                    onTurn={(speaker, content) =>
                      setMessages((current) => [...current, { id: crypto.randomUUID(), speaker, content }])
                    }
                    onClose={() => setVoiceOpen(false)}
                    onSignIn={() => {
                      setVoiceOpen(false);
                      routedForRef.current = null;
                      pendingVoiceStartRef.current = "resume";
                      setAuthPurpose("voice");
                      setView("auth");
                    }}
                  />
                </Suspense>
              </VoiceRoomBoundary>
            )}

            <div className="arena-statusbar" role="status" aria-label="Session status">
              <span className="statusbar-motion">{activeTopic}</span>
              <span className="statusbar-side">{position === "for" ? "FOR" : "AGAINST"}</span>
              <span className="statusbar-turn">TURN {Math.max(1, learnerTurns.length).toString().padStart(2, "0")}</span>
              <span className={`statusbar-clock ${secondsLeft < 60 ? "clock-urgent" : ""}`}><i aria-hidden="true" />{formatTime(secondsLeft)}</span>
            </div>

            {continuation && <div className="continuation-banner" role="status"><b>CONTINUATION</b><span>Earlier turns are loaded below. This round has a fresh clock, and new turns will join the same archive.</span></div>}

            <div className="arena-casebar">
              <div>
                <span className="casebar-label">MOTION</span><h1>{activeTopic}</h1>
                {(streaming || challenging) && <p className="casebar-pause">Clock paused while your opponent works</p>}
              </div>
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
                <div className="transcript-heading"><div><h2>The debate</h2>{continuation && <p>Earlier turns from your archive are part of this conversation.</p>}</div><div className="transcript-heading-actions"><button type="button" className={`stream-toggle${streamReplies ? " is-on" : ""}`} aria-pressed={streamReplies} onClick={() => setStreamReplies((value) => !value)} title="This session only: show the reply sentence by sentence as it is written. Turn off to wait for the full, checked reply.">{streamReplies ? "Live reply" : "Full reply"}</button>{streamReplies !== appSettings.streamReplies && <button type="button" className="stream-save" onClick={() => rememberStreamReplies(streamReplies)} title="Save this as your default for future rounds">Remember</button>}<span className="round-counter"><span>TURN</span> {Math.max(1, learnerTurns.length).toString().padStart(2, "0")}</span></div></div>
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
                      <span aria-hidden="true">RESPONSE {cueSequence.toString().padStart(2, "0")}</span>
                      <strong aria-hidden="true">{activePersona.name} is answering</strong>
                      <i aria-hidden="true">WRITING A REPLY</i>
                    </motion.div>
                  )}
                </AnimatePresence>
                {modelOffline && (
                  <div className="inline-notice" role="status">
                    <span>The practice model is not running, so your opponent cannot reply. {modelStatus.hint}</span>
                    <button type="button" onClick={() => void checkModel()} disabled={modelChecking}>{modelChecking ? "Checking…" : "Check again"}</button>
                  </div>
                )}
                {turnError && (
                  <div className="inline-notice" role="alert">
                    <span>{turnError}</span>
                    {lastTurnRef.current && !streaming && (
                      <button type="button" onClick={retryLastTurn}>Retry turn</button>
                    )}
                  </div>
                )}
                {recordNotice && <div className="inline-notice" role="status">{recordNotice}</div>}
                <div
                  ref={transcriptRef}
                  onScroll={handleTranscriptScroll}
                  className="transcript-scroll"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions text"
                  aria-busy={streaming || challenging}
                >
                  {messages.length === 0 && (
                    <div className="empty-transcript"><span className="empty-marker"><EmptyCueArt label={modelOffline ? "Waiting for the model" : position === "against" ? "Opponent preparing an opening statement" : "Your opening statement"} /></span><p>{modelOffline ? "The model is not running, so there is no opening statement yet. Start it using the message above, then retry the turn." : position === "against" ? "Your opponent opens from the For side. You will respond when they finish." : "You open from the For side. Make your opening case when you’re ready."}</p></div>
                  )}
                  {messages.map((message, index) => (
                    <motion.article
                      key={message.id}
                      className={`message-card ${message.speaker === "learner" ? "message-learner" : "message-opponent"} ${message.kind === "challenge" ? "message-challenge" : ""} ${continuation && index < continuedHistoryCount ? "message-history" : ""}`}
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
                        <span>TURN {turnNumberFor(messages, index).toString().padStart(2, "0")}</span>
                        {continuation && index === 0 && <span className="history-marker">{continuedHistoryCount > 0 ? "SAVED TRANSCRIPT" : "NEW ROUND"}</span>}
                        {continuation && continuedHistoryCount > 0 && index === continuedHistoryCount && <span className="history-marker">NEW ROUND</span>}
                      </div>
                      {message.challengeTarget && <blockquote className="challenge-target">“{message.challengeTarget}”</blockquote>}
                      <div className="message-body"><MarkdownText text={message.content} />{message.pending && <span className="stream-cursor" />}</div>
                      {message.pending && !message.content && <div className="thinking-label"><LoaderCircle size={14} /> DRAFTING, THEN CHECKING</div>}
                      {message.diagnostics && (
                        <div className="message-diagnostics" title={diagnosticsTitle(message.diagnostics)}>
                          <span>{diagnosticsLabel(message.diagnostics)}</span>
                          <span>{message.diagnostics.reply_words} WORDS</span>
                          {message.diagnostics.tactic && <span>{message.diagnostics.tactic.replaceAll("_", " ").toUpperCase()}</span>}
                          {message.diagnostics.redirect_reason !== "guard" && (
                            <span>{diagnosticsTime(message.diagnostics.model_ms)} DRAFT + REVIEW</span>
                          )}
                          {message.diagnostics.context_turns > 0 && <span>{message.diagnostics.context_turns} TURNS IN CONTEXT</span>}
                          {message.diagnostics.summarized_turns > 0 && <span>{message.diagnostics.summarized_turns} EARLIER TURNS CONDENSED</span>}
                        </div>
                      )}
                    </motion.article>
                  ))}
                  {continuation && continuedHistoryCount === messages.length && <div className="history-boundary">NEW ROUND · CONTINUE BELOW</div>}
                  <div ref={bottomRef} />
                </div>
                {showJumpToLatest && (
                  <button type="button" className="jump-to-latest" onClick={jumpToLatest}>
                    <ArrowDownRight size={14} aria-hidden="true" /> Jump to newest
                  </button>
                )}
                {secondsLeft <= 60 && secondsLeft > 0 && !streaming && (
                  <div className="final-minute" role="status">
                    <span><Clock3 size={14} aria-hidden="true" /> Final minute — finish when your point is made.</span>
                    <button type="button" onClick={requestEndSession}>{confirmEnd ? "Tap again to finish" : "Finish & review"}</button>
                  </div>
                )}
                {graceTurn && secondsLeft === 0 && (
                  <div className="final-minute is-time-up" role="status">
                    <span><Clock3 size={14} aria-hidden="true" /> Time — send your final point, or review now.</span>
                    <button type="button" onClick={finishSession}>Review now</button>
                  </div>
                )}
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
                    disabled={streaming || (secondsLeft === 0 && !graceTurn)}
                  />
                  {challengeError && <div className="inline-notice" role="status">{challengeError}</div>}
                  <div className="composer-bottom">
                    <span>One claim at a time — aim for 1–2 sentences. Enter sends · Shift + Enter adds a line.</span>
                    <button
                      className="challenge-button"
                      type="button"
                      onClick={() => void requestFollowUp()}
                      disabled={
                        challenging ||
                        streaming ||
                        learnerTurns.length === 0 ||
                        challengeDepth() >= 2 ||
                        challengeDone ||
                        secondsLeft === 0
                      }
                      title={
                        learnerTurns.length === 0
                          ? "Make your case first — follow-ups unlock after your opening turn"
                          : challengeDepth() >= 2
                            ? "Two follow-ups is the limit for this turn"
                            : challengeDone
                              ? "The coach has no further question on this turn. Make your next case."
                              : "Ask the coach to press your latest point"
                      }
                    >
                      {challenging ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={14} />}
                      <span>
                        {challengeDepth() >= 2
                          ? "Follow-ups done"
                          : challengeDone
                            ? "No follow-up here"
                            : learnerTurns.length === 0
                              ? "Make a case first"
                              : "Ask a follow-up"}
                      </span>
                    </button>
                    <button className="send-button" disabled={!draft.trim() || streaming || (secondsLeft === 0 && !graceTurn)} type="submit">
                      {streaming ? <LoaderCircle size={16} className="spin" /> : <Send size={15} />}
                      <span>{streaming ? "Drafting and reviewing" : "Make your case"}</span>
                    </button>
                  </div>
                </form>
              </section>

              <aside className="room-notes">
                <div className={`room-opponent tone-${activePersona.color}`}>
                  <span className="room-opponent-mark" aria-hidden="true"><OpponentEmblem persona={persona} label={`${activePersona.name} emblem`} /></span>
                  <span className="room-opponent-copy"><b>{activePersona.name}</b><small>{activePersona.title}</small></span>
                </div>
                <div className="record-card"><div className="record-number">{learnerTurns.length.toString().padStart(2, "0")}</div><span>YOUR TURNS</span></div>
                <div className="record-card"><div className="record-number">{totalWords.toString().padStart(2, "0")}</div><span>YOUR WORDS</span></div>
              </aside>
            </div>
            <div className="arena-bottomline"><span>VERDICT / PRACTICE ROOM</span><span>AI RESPONSE / FINAL AFTER REVIEW</span><span>SESSION LENGTH {duration} MIN</span></div>
          </motion.main>
        )}

        {view === "verdict" && (
          <motion.main key="verdict" className="verdict-page" {...pageMotion}>
            <header className={`verdict-header verdict-header-review${analysisLoading || judgeLoading ? " is-computing" : ""}`}>
              <button className="arena-brand" type="button" onClick={returnHome} aria-label="Verdict home"><span className="brand-mark"><BookOpenText size={16} /></span><span>VERDICT<span className="brand-period">.</span></span></button>
              <span className="verdict-header-title">DEBATE REVIEW <i aria-hidden="true">—</i> {analysisLoading || judgeLoading ? "IN PROGRESS" : "COMPLETED"}</span>
            </header>
            <section className="verdict-content verdict-content-review">
              <div className="verdict-heading-row">
                <h1>YOUR REHEARSAL<br /><span>IS IN THE BOOK</span><i className="verdict-heading-period">.</i></h1>
                <span className="verdict-heading-note">{analysisLoading || judgeLoading ? <>REVIEW<br />IN PROGRESS</> : <>COMPLETED DEBATE<br />REVIEW</>}</span>
              </div>
              <p className="verdict-summary"><b>Motion:</b> {activeTopic}<span className="verdict-summary-divider" aria-hidden="true" /> <b>Your side:</b> {position === "for" ? "For" : "Against"}<span className="verdict-summary-divider" aria-hidden="true" /> <b>Opponent:</b> {activePersona.name}</p>
              {verdictComputing && (
                <div className="verdict-context" role="status">
                  <span>REVIEWING THIS ROUND</span>
                  <p><b>{activeTopic}</b> · {position === "for" ? "For" : "Against"} · {activePersona.name} · {learnerTurns.length} {learnerTurns.length === 1 ? "turn" : "turns"}</p>
                  {lastLearnerMessage && <blockquote>“{lastLearnerMessage.content.slice(0, 180)}”</blockquote>}
                </div>
              )}
              <div className="verdict-stats">
                <div><span>OVERALL SCORE</span>{judge ? <b>{Math.round(judge.overall * 20)}<small> / 100</small></b> : verdictComputing ? <i className="verdict-stat-skeleton" aria-hidden="true" /> : <b>—</b>}</div>
                <div><span>WEIGHTED RANK</span>{verdictRank ? <b aria-label={`${formatOrdinal(verdictRank.rank)} out of ${verdictRank.total} among your saved verdicts`}>{formatOrdinal(verdictRank.rank)}<small> of {verdictRank.total}</small></b> : verdictRankLoading || verdictComputing ? <i className="verdict-stat-skeleton" aria-hidden="true" /> : <b>—</b>}</div>
                <div><span>DEBATE TIME</span><b>{formatTime(Math.min(elapsed, duration * 60))}</b></div>
              </div>
              <section className="review-block verdict-review-block" aria-label="Argument review">
                {!analysis && !analysisLoading && <div className="review-head">
                  <h2>Review your argument</h2>
                  {!analysis && (
                    <button className="button button-dark" onClick={() => void reviewDebate()} disabled={analysisLoading || learnerTurns.length === 0}>
                      {analysisLoading ? <><LoaderCircle className="spin" size={15} /> Reading your case</> : <><Sparkles size={15} /> Start the review</>}
                    </button>
                  )}
                </div>}
                {!analysis && !analysisLoading && (
                  <p className="review-intro">
                    {learnerTurns.length === 0
                      ? "This rehearsal has no turns to review. Run a round with at least one argument to get scores."
                      : "Five scores for your argument, the counterpoints you missed, and one thing to fix next. It reads your words only — your voice is reviewed separately under Delivery."}
                  </p>
                )}
                {analysisLoading && !analysis && <p className="review-intro verdict-computing-status" role="status"><LoaderCircle className="spin" size={14} /> Building your review. Scores and observations will appear as they’re ready.</p>}
                {analysisLoading && !analysis && <VerdictLoadingPreview />}
                {analysisError && (
                  <div className="analysis-error" role="alert">
                    {analysisError}
                    {user && recordId && !analysisSaved && <button className="button button-light" type="button" onClick={() => void reviewDebate()} disabled={analysisLoading}>Retry review</button>}
                  </div>
                )}
                {user && recordId && planUpdateStatus !== "idle" && (
                  <div className={`plan-refresh-message is-${planUpdateStatus}`} role={planUpdateStatus === "failed" ? "alert" : "status"}>
                    {planUpdateStatus === "updating" && <><LoaderCircle className="spin" size={14} /> Refreshing your practice plan from this saved review…</>}
                    {planUpdateStatus === "updated" && <><Check size={14} /> Practice plan refreshed using the latest saved review and available history.</>}
                    {planUpdateStatus === "failed" && <>
                      <span>{planUpdateError}</span>
                      {analysisSaved
                        ? <button className="button button-light" type="button" onClick={() => void updatePlanFromSavedWork()} disabled={planUpdateInFlightRef.current}>Retry plan update</button>
                        : <button className="button button-light" type="button" onClick={() => void reviewDebate()} disabled={analysisLoading}>Retry review</button>}
                    </>}
                  </div>
                )}
                {(analysis?.gaps ?? []).length > 0 && (
                  <div className="inline-notice" role="status">
                    <span>Partial review — {analysis?.gaps.join(" ")} The finished sections are below; running it again may complete the rest.</span>
                    <button onClick={() => void reviewDebate()}>Retry review</button>
                  </div>
                )}
                {analysis?.truncated && (
                  <div className="inline-notice" role="status">
                    <span>This review scored your latest {analysis.reviewed_turns} of {analysis.total_turns} turns. Earlier turns are condensed context, not part of the score.</span>
                  </div>
                )}

                {analysis && !analysisComplete && analysisLoading && (
                  <p className="review-intro verdict-computing-status" role="status">
                    <LoaderCircle className="spin" size={14} /> {analysis.ratings ? "Rubric scores are ready." : "Your review is still building."} Still checking fallacies and counterpoints.
                  </p>
                )}

                  {analysis && <>
                  {!judge && !judgeError && verdictComputing && analysisComplete && <p className="review-intro verdict-computing-status" role="status"><LoaderCircle className="spin" size={14} /> {analysisLoading ? "Updating your review and scorecard." : deliveryResult ? "Scoring your opening, replies, and closing take." : "Weighing the finished sections."}</p>}
                  {judgeError && (
                    <div className="analysis-error" role="alert">
                      {judgeError}
                      <button className="button button-light" type="button" onClick={() => void runJudge(analysis, deliveryResult)}>Score it again</button>
                    </div>
                  )}
                  <div className="verdict-review-columns">
                  {!judge && (verdictComputing ? <VerdictScoreSkeleton /> : <VerdictScoreUnavailable />)}
                  {judge && (
                    <div className="score-summary">
                      <div className="score-figure">
                        <span>WEIGHTED SCORE</span>
                        <b>{Math.round(judge.overall * 20)}<small> / 100</small></b>
                        <p>{unavailableJudgeDimensions.length > 0
                          ? `Argument quality blends clarity, relevance, and persuasion. ${unavailableJudgeDimensions.join(" and ")} ${unavailableJudgeDimensions.length === 1 ? "is" : "are"} not scored yet; weights are rescaled to 100%.`
                          : "Argument quality blends clarity, relevance, and persuasion. Includes your closing take."}</p>
                      </div>
                      <div className="score-bars">
                        {SCORE_DIMENSION_ORDER.map((key) => {
                          const dim = judge.dimensions.find((dimension) => dimension.key === key);
                          return <div className={`score-bar${dim ? "" : " is-unrated"}`} key={key}>
                            <span>{SCORE_DIMENSION_LABELS[key]}</span>
                            {dim
                              ? <div className="score-track" role="img" aria-label={`${key} scores ${Math.round(dim.score * 20)} of 100`}><i style={{ width: `${Math.min(100, dim.score / 5 * 100)}%` }} /></div>
                              : <div className="score-track is-unrated" role="img" aria-label={`${key} not scored yet`} />}
                            <b>{dim ? Math.round(dim.score * 20) : "—"}</b>
                          </div>
                        })}
                      </div>
                    </div>
                  )}

                  {(analysis.strengths.length > 0 || analysis.next_steps.length > 0) && (
                    <div className="analysis-coaching-grid">
                      {analysis.strengths.length > 0 && (
                        <section className="analysis-coaching-card"><span>WHAT WORKED WELL</span>{analysis.strengths.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                      )}
                      {analysis.next_steps.length > 0 && (
                        <section className="analysis-coaching-card is-next"><span>TOP AREAS TO IMPROVE</span>{analysis.next_steps.map((item, index) => <p key={`${index}-${item}`}>{item}</p>)}</section>
                      )}
                    </div>
                  )}
                  </div>

                  <details className="disclosure verdict-delivery-step" open={deliveryResult !== null}>
                    <summary className="verdict-delivery-summary">
                      <span className="verdict-delivery-copy">
                        <strong>Delivery review</strong>
                        <small>{deliveryResult
                          ? judgeLoading ? "Closing take reviewed. Updating your final weighted score…" : judgeError ? "Closing take reviewed. Retry scoring to refresh your final weighted score." : "Closing take reviewed. Your weighted score now includes delivery."
                          : "Record a closing take to score delivery and complete your final weighted score."}</small>
                      </span>
                      <span className="verdict-delivery-action">{deliveryResult ? judgeLoading ? "UPDATING" : judgeError ? "RETRY SCORE" : judge ? "FINAL SCORE READY" : "REVIEW TAKE" : "COMPLETE FINAL SCORE"}</span>
                    </summary>
                    <div className="delivery-body">
                      <p className="analysis-intro">Record or upload a closing take. Pace, fillers, and pauses are observable patterns with timestamps, not diagnoses. Your audio is discarded after the review.</p>
                      <Suspense fallback={<div className="inline-notice" role="status">Loading delivery review…</div>}>
                        <PresentationRoom key={`${recordId ?? "new"}-${deliveryResult ? "saved" : "empty"}`} topic={activeTopic} sessionId={recordId} compact initialResult={deliveryResult} onResult={(next) => { setDeliveryResult(next); void runJudge(analysis, next); }} />
                      </Suspense>
                      <button className="text-link step-aside" type="button" onClick={openDeliveryPractice}>Or practise a take on its own <ArrowUpRight size={15} /></button>
                    </div>
                  </details>

                  {analysis.ratings && (
                    <details className="disclosure">
                      <summary>Argument scores</summary>
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

                  {analysisComplete && (
                    <details className="disclosure">
                      <summary>Logic watch</summary>
                      <section className="analysis-fallacies">
                        {analysis.fallacies.length === 0
                          ? <p>No clear examples of the listed fallacies appeared. Keep checking claims against their evidence.</p>
                          : analysis.fallacies.map((item, index) => <article key={`${item.label}-${index}`}><b>{item.label}</b><blockquote>“{item.quote}”</blockquote><p>{item.explanation}</p><small>TRY THIS: {item.revision}</small></article>)}
                      </section>
                    </details>
                  )}

                  {analysisComplete && analysis.counterarguments.length > 0 && (
                    <details className="disclosure">
                      <summary>Counterpoints</summary>
                      <section className="analysis-counterpoints"><div className="counterpoint-grid">
                        {analysis.counterarguments.map((item) => <article key={item.kind}><span>{item.kind.toUpperCase()}</span><p>{item.response}</p><small>ASK: {item.question}</small></article>)}
                      </div></section>
                    </details>
                  )}

                  {judge && (
                    <details className="disclosure">
                      <summary>Score weights</summary>
                      <div className="judge-grid">
                        {judge.dimensions.map((dim) => (
                          <article key={dim.key} className="judge-card">
                            <span>{SCORE_DIMENSION_LABELS[dim.key]} · {dim.weight_pct}%</span>
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
                    <summary>Transcript</summary>
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
              <div className="verdict-note"><span>WHAT HAPPENS NEXT</span><p>Your lowest score shapes the recommended round below. Rematch keeps every term; a focused round keeps the motion and side and changes the pressure.</p></div>
              <div className="verdict-next">
                <span>RECOMMENDED NEXT</span>
                <h2>{nextPracticeFocus ? `Work on ${nextPracticeFocus.label}.` : "Run the round again with one change."}</h2>
                <p>{nextPracticeFocus?.reason ?? "This review did not have enough scored turns to name a focus. A rematch keeps the same room so you can test a different case."}</p>
                <div className="verdict-actions">
                  {nextPracticeFocus ? (
                    <button className="button button-dark" onClick={openFocusedRound}>Practice {nextPracticeFocus.label} <ArrowRight size={16} /></button>
                  ) : (
                    <button className="button button-dark" onClick={() => setView("setup")}>Run another rehearsal <ArrowRight size={16} /></button>
                  )}
                  <button className="button button-light" onClick={openRematch}>Rematch this round</button>
                  <button className="text-link" type="button" onClick={openPlan}>Revise my plan <ArrowRight size={15} /></button>
                  {!deliveryResult && <button className="text-link" type="button" onClick={openDeliveryPractice}>Practise delivery instead <ArrowUpRight size={15} /></button>}
                </div>
              </div>
            </section>
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
                <button className="button button-dark" onClick={openPracticeDebate}>Start a debate <ArrowRight size={16} /></button>
                <button className="button button-light" onClick={returnHome}>Back home</button>
              </div>
            </section>
            <div className="verdict-footer"><span>VERDICT / DELIVERY ROOM</span><span>AI PRACTICE ROOM</span></div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, Bot, Check, ChevronDown, ChevronUp, Cpu, Download, History, LoaderCircle, MessageSquareText, Printer, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { EmptyCueArt } from "../../components/CueArt";
import { MarkdownText } from "../../components/Markdown";
import { deleteDebateRecord, listDebateRecords, loadDebateAnalysis, loadDebateRecord, loadDebateVerdict, type DebateRecord, type DebateRecordTurn } from "../../services/debate-records";
import { loadAppCapabilities, type AnalysisReport, type JudgeVerdict } from "../../services/debate-api";
import { listPresentationFeedbacks, loadPresentationFeedbackForSession, type PresentationFeedback } from "../../services/presentation-records";
import type { PresentationResult } from "../../services/presentation-api";
import { requestPlan } from "../../services/plan-api";
import { completePlanDrill, listLearningPlans, listPlanDrillCompletions, loadSessionDigests, saveLearningPlan, uncompletePlanDrill, type StoredPlan } from "../../services/plan-records";
import { buildArchiveCsv, deleteAccount, deleteAllPracticeData, downloadCsvFile } from "../../services/account-data";
import { emptyProfile, loadProfile, saveProfile, type LearnerProfile } from "../../services/profiles";
import { cacheApplicationSettings, loadApplicationSettings, LOCAL_MODEL_OPTIONS, normalizeApplicationSettings, type ApplicationSettings } from "../../services/app-settings";
import type { ThemePreference } from "../../services/app-settings";
import { difficultyFor, personaFor, personas } from "../debate-catalog";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  PURPOSE_OPTIONS,
  buildRecommendation,
  emptyPrefs,
  firstPracticeCue,
  focusLabels,
  goalLine,
  hasAnswers,
  loadPrefs,
  markOnboardingDone,
  preferencesFor,
  prefsToProfileFields,
  purposeLine,
  savePrefs,
  stampPrefs,
  type FocusKey,
  type LearnerPrefs,
} from "../../services/learner-prefs";
import { useAuth } from "./AuthProvider";
import "./account.css";

type TabKey = "archive" | "progress" | "plan" | "settings";
type ReviewPoint = { at: string; label: string; score: number };
type PracticeProgress = {
  sessions: number;
  completed: number;
  streakDays: number;
  avgOverall: number | null;
  avgDims: { key: string; score: number }[];
  fillerFirst: number | null;
  fillerLast: number | null;
  deliveries: number;
  weeks: { label: string; count: number }[];
  reviewTrend: ReviewPoint[];
};

const PROGRESS_CACHE_PREFIX = "verdict.practice-analysis.v1";

function progressCacheKey(userId: string) {
  return `${PROGRESS_CACHE_PREFIX}:${userId}`;
}

function readCachedProgress(userId: string): PracticeProgress | null {
  try {
    const raw = window.localStorage.getItem(progressCacheKey(userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as PracticeProgress;
    if (
      typeof value.sessions !== "number" ||
      typeof value.completed !== "number" ||
      !Array.isArray(value.avgDims) ||
      !Array.isArray(value.weeks) ||
      !Array.isArray(value.reviewTrend)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function cacheProgress(userId: string, progress: PracticeProgress) {
  try {
    window.localStorage.setItem(progressCacheKey(userId), JSON.stringify(progress));
  } catch {
    /* A full or unavailable cache must not interrupt analysis. */
  }
}

function clearCachedProgress(userId: string) {
  try {
    window.localStorage.removeItem(progressCacheKey(userId));
  } catch {
    /* Cache cleanup must not interrupt account work. */
  }
}

// The tab a learner most likely wants first, given what they said practice is for.
function recommendedTab(prefs: LearnerPrefs): TabKey {
  if (prefs.goal === "structure" || prefs.goal === "evidence") return "plan";
  const competitive = prefs.purpose === "competition" || prefs.goal === "win" || prefs.goal === "hostile";
  const delivery = prefs.focus.includes("delivery") || prefs.focus.includes("confidence") || prefs.goal === "nerves";
  return competitive || delivery ? "progress" : "archive";
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "progress", label: "Progress" },
  { key: "plan", label: "Plan" },
  { key: "settings", label: "Settings" },
  { key: "archive", label: "Archive" },
];

const DIMENSION_LABELS: Record<string, string> = {
  argument: "Argument",
  evidence: "Evidence",
  logical: "Logic",
  rebuttal: "Rebuttal",
  communication: "Communication",
};

function opponentName(key: string) {
  return personas.find((person) => person.key === key)?.name ?? "Your opponent";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountView({ onStart, onDelivery, onContinue, onViewVerdict, onSignOut, focusRecordId, onFocusConsumed, theme = "classic", initialSection = "progress", onApplicationSettingsChange }: {
  onStart: () => void;
  onDelivery: () => void;
  onContinue: (session: DebateRecord, turns: DebateRecordTurn[]) => void;
  onViewVerdict: (session: DebateRecord, turns: DebateRecordTurn[], analysis: AnalysisReport | null, verdict: JudgeVerdict | null, delivery: PresentationResult | null) => void;
  onSignOut: () => Promise<void>;
  focusRecordId?: string | null;
  onFocusConsumed?: () => void;
  theme?: ThemePreference;
  initialSection?: "progress" | "plan";
  onApplicationSettingsChange?: (next: ApplicationSettings) => void;
}) {
  const newTheme = theme === "new";
  const { user, session } = useAuth();
  const [records, setRecords] = useState<DebateRecord[]>([]);
  const [selected, setSelected] = useState<{ session: DebateRecord; turns: DebateRecordTurn[]; analysis: AnalysisReport | null; verdict: JudgeVerdict | null; delivery: PresentationResult | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile>(emptyProfile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [appSettings, setAppSettings] = useState<ApplicationSettings>(() => loadApplicationSettings(user?.id ?? "guest"));
  const [appSettingsReady, setAppSettingsReady] = useState(!user);
  const [savingAppSettings, setSavingAppSettings] = useState(false);
  const [appSettingsNotice, setAppSettingsNotice] = useState("");
  const [layaStatus, setLayaStatus] = useState<"checking" | "available" | "unavailable" | "unknown">("checking");
  const [prefs, setPrefs] = useState<LearnerPrefs>(() => (user ? loadPrefs(user.id) : emptyPrefs()));
  // The learner space opens on progress: the first useful thing to see is
  // whether the practice is actually moving.
  const [tab, setTab] = useState<TabKey>(initialSection);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const detailRef = useRef<HTMLElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const focusHandledRef = useRef<string | null>(null);
  const tabTouchedRef = useRef(false);
  const [storedPlan, setStoredPlan] = useState<StoredPlan | null>(null);
  const [completedDrills, setCompletedDrills] = useState<Set<number>>(new Set());
  const [drillBusy, setDrillBusy] = useState<number | null>(null);
  const [planNotice, setPlanNotice] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [dataBusy, setDataBusy] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState<"data" | "account" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [progress, setProgress] = useState<PracticeProgress | null>(() => user ? readCachedProgress(user.id) : null);
  const [progressOwnerId, setProgressOwnerId] = useState<string | null>(user?.id ?? null);
  const [progressLoading, setProgressLoading] = useState(() => Boolean(user && !readCachedProgress(user.id)));
  const [progressError, setProgressError] = useState("");
  const [deliveryTakes, setDeliveryTakes] = useState<PresentationFeedback[]>([]);
  const progressRefreshInFlightRef = useRef<string | null>(null);
  const currentProgressUserRef = useRef<string | null>(user?.id ?? null);

  const recommendation = useMemo(() => buildRecommendation(profile.experience, prefs), [profile.experience, prefs]);
  const setupComplete = hasAnswers(prefs);
  const recommended = useMemo(() => recommendedTab(prefs), [prefs]);
  const visibleRecords = showAllRecords ? records : records.slice(0, 5);
  const visibleTabs = TABS;
  const shownCount = Math.min(5, records.length);
  const introLine = useMemo(() => {
    if (!setupComplete) return "Two minutes in your room tunes your opponent, your pressure, and the cue waiting on your dashboard.";
    const parts = [
      purposeLine(prefs),
      goalLine(prefs.goal) && `working on ${goalLine(prefs.goal)}`,
      focusLabels(prefs.focus).length > 0 && `focused on ${focusLabels(prefs.focus).join(" and ").toLowerCase()}`,
    ];
    return `${parts.filter(Boolean).join(" · ")}.`;
  }, [prefs, setupComplete]);
  const rankedDimensions = (progress?.avgDims ?? []).slice().sort((a, b) => b.score - a.score);
  const planHasNewerPractice = Boolean(storedPlan && records[0] && new Date(records[0].started_at) > new Date(storedPlan.created_at));
  const reviewTrend = progress?.reviewTrend ?? [];
  const reviewChartCoordinates = reviewTrend.map((point, index) => ({
    ...point,
    x: reviewTrend.length === 1 ? 306 : 40 + (index / (reviewTrend.length - 1)) * 520,
    y: 18 + ((5 - Math.max(0, Math.min(5, point.score))) / 5) * 112,
  }));
  const reviewChange = reviewTrend.length > 1
    ? reviewTrend[reviewTrend.length - 1].score - reviewTrend[0].score
    : null;

  useEffect(() => {
    tabTouchedRef.current = true;
    setTab(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const userId = user?.id ?? null;
    currentProgressUserRef.current = userId;
    const cached = userId ? readCachedProgress(userId) : null;
    setProgressOwnerId(userId);
    setProgress(cached);
    setProgressError("");
    setProgressLoading(Boolean(userId && !cached));
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user && newTheme) {
      setRecords([]);
      setLoading(false);
      setError("");
      setAppSettingsReady(true);
      return () => { active = false; };
    }
    setLoading(true);
    void listDebateRecords()
      .then((data) => { if (active) setRecords(data); })
      .catch(() => { if (active) setError("Your archive didn't load. Try again in a moment."); })
      .finally(() => { if (active) setLoading(false); });
    if (user) {
      void loadProfile(user.id)
        .then((data) => {
          if (!active || !data) return;
          setProfile(data);
          // No saved settings is not the same as saved defaults: leave the
          // learner's current theme and local cache untouched.
          if (data.app_settings) {
            const nextSettings = normalizeApplicationSettings(data.app_settings);
            setAppSettings(nextSettings);
            cacheApplicationSettings(user.id, nextSettings);
            onApplicationSettingsChange?.(nextSettings);
          }
        })
        .catch(() => {})
        .finally(() => { if (active) setAppSettingsReady(true); });
    } else {
      setAppSettingsReady(true);
    }
    return () => { active = false; };
  }, [user, newTheme]);

  useEffect(() => {
    if (tab === "progress") {
      void loadPlan();
      if (!loading) void loadProgress();
    }
    else if (tab === "plan") void loadPlan();
  }, [tab, loading]);

  useEffect(() => {
    if (!focusRecordId || loading) return;
    if (focusHandledRef.current === focusRecordId) return;
    const index = records.findIndex((record) => record.id === focusRecordId);
    if (index < 0) {
      onFocusConsumed?.();
      return;
    }
    focusHandledRef.current = focusRecordId;
    // Opening a saved rehearsal means the archive, whatever tab we started on.
    tabTouchedRef.current = true;
    setTab("archive");
    if (index >= 5) setShowAllRecords(true);
    void openRecord(focusRecordId).finally(() => onFocusConsumed?.());
  }, [focusRecordId, loading, records]);

  useEffect(() => {
    if (!selected) return;
    const index = records.findIndex((record) => record.id === selected.session.id);
    if (index >= 5) setShowAllRecords(true);
  }, [selected, records]);

  useEffect(() => {
    if (!selected || !window.matchMedia("(max-width: 900px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  useEffect(() => {
    if (!dangerConfirm) return;
    const timer = window.setTimeout(() => setDangerConfirm(null), 6000);
    return () => window.clearTimeout(timer);
  }, [dangerConfirm]);

  useEffect(() => {
    const planId = storedPlan?.id;
    if (!planId) {
      setCompletedDrills(new Set());
      return;
    }
    let active = true;
    void listPlanDrillCompletions(planId)
      .then((rows) => {
        if (active) setCompletedDrills(new Set(rows.map((row) => row.drill_index)));
      })
      .catch(() => {
        /* Completion tracking is additive; the plan still renders. */
      });
    return () => {
      active = false;
    };
  }, [storedPlan?.id]);

  useEffect(() => {
    if (tab !== "settings" || loading) return;
    let active = true;
    setLayaStatus("checking");
    void loadAppCapabilities()
      .then((capabilities) => {
        if (active) setLayaStatus(capabilities.adaptive_tactics_available ? "available" : "unavailable");
      })
      .catch(() => { if (active) setLayaStatus("unknown"); });
    return () => { active = false; };
  }, [tab]);

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? visibleTabs.length - 1
        : event.key === "ArrowLeft"
          ? (index - 1 + visibleTabs.length) % visibleTabs.length
          : (index + 1) % visibleTabs.length;
    selectTab(visibleTabs[next].key);
    document.getElementById(`account-tab-${visibleTabs[next].key}`)?.focus();
  }

  function selectTab(next: TabKey) {
    tabTouchedRef.current = true;
    setTab(next);
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    window.requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function openRecord(recordId: string) {
    if (loadingRecord) return;
    setLoadingRecord(recordId);
    setError("");
    try {
      const [record, analysis, verdict, delivery] = await Promise.all([
        loadDebateRecord(recordId),
        loadDebateAnalysis(recordId),
        loadDebateVerdict(recordId),
        loadPresentationFeedbackForSession(recordId),
      ]);
      setConfirmDelete(false);
      setSelected({ ...record, analysis, verdict, delivery });
    } catch {
      setError("We could not open this rehearsal. Check your connection and try again.");
    } finally {
      setLoadingRecord("");
    }
  }

  function reload() {
    setError("");
    setLoading(true);
    void listDebateRecords()
      .then((data) => setRecords(data))
      .catch(() => setError("Your archive didn't load. Try again in a moment."))
      .finally(() => setLoading(false));
  }

  // The browser copy is written first, so a failed sync still leaves the learner set up.
  async function saveSetup() {
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setProfileNotice("");
    const stamped = stampPrefs({ ...prefs, experience: profile.experience });
    setPrefs(stamped);
    savePrefs(user.id, stamped);
    markOnboardingDone(user.id);
    try {
      await saveProfile(user.id, {
        ...profile,
        display_name: profile.display_name?.trim() || null,
        goals: profile.goals?.trim().slice(0, 500) || null,
        ...prefsToProfileFields(stamped),
      });
      setProfileNotice("Saved. Your dashboard, first cue, and session setup follow these answers.");
    } catch {
      setProfileNotice("Saved on this device only. Your account could not be reached, so try again to sync it.");
    } finally {
      setSavingProfile(false);
    }
  }

  function updateAppSettings(patch: Partial<ApplicationSettings>) {
    const next = { ...appSettings, ...patch };
    setAppSettings(next);
    // Keep the app-level copy in step so Voice and Delivery use this choice
    // immediately, while "Save app settings" still writes it to the account.
    onApplicationSettingsChange?.(next);
  }

  async function saveApplicationSettings() {
    if (!user || !appSettingsReady || savingAppSettings || savingProfile) return;
    setSavingAppSettings(true);
    setAppSettingsNotice("");
    const cached = cacheApplicationSettings(user.id, appSettings);
    try {
      await saveProfile(user.id, { ...profile, app_settings: appSettings });
      setProfile((current) => ({ ...current, app_settings: appSettings }));
      setAppSettingsNotice(cached
        ? "Saved to your account. These choices will apply to your next debate turn."
        : "Saved to your account. Browser storage is unavailable, so changes may take a moment to reach the debate room.");
    } catch {
      setAppSettingsNotice(cached
        ? "Saved on this device, but account sync failed. Check your connection and try again."
        : "Could not save these settings. Check your connection and browser storage, then try again.");
    } finally {
      setSavingAppSettings(false);
    }
  }

  function toggleFocus(key: FocusKey) {
    setPrefs((current) => ({
      ...current,
      focus: current.focus.includes(key)
        ? current.focus.filter((value) => value !== key)
        : [...current.focus, key].slice(0, 3),
    }));
  }

  function dayKey(value: string) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function currentStreak(days: Set<string>) {
    let streak = 0;
    const cursor = new Date();
    if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  async function loadPlan() {
    if (planLoaded || planLoading) return;
    if (!user) {
      setStoredPlan(null);
      setPlanLoaded(true);
      return;
    }
    setPlanError("");
    setPlanLoaded(true);
    setPlanLoading(true);
    try {
      const saved = await listLearningPlans(1);
      setStoredPlan(saved[0] ?? null);
    } catch {
      setPlanError("Your plan didn't load. Try again in a moment.");
      setPlanLoaded(false);
    } finally {
      setPlanLoading(false);
    }
  }

  async function buildPlan() {
    if (!user || planLoading) return;
    setPlanLoading(true);
    setPlanError("");
    try {
      const digests = await loadSessionDigests(12);
      const result = await requestPlan(
        {
          goals: profile.goals,
          experience: profile.experience,
          digests,
          preferences: preferencesFor(prefs),
          model: appSettings.model,
        },
        session?.access_token,
      );
      const created = await saveLearningPlan(user.id, result.plan, digests.length).catch(() => null);
      setStoredPlan({
        id: created?.id ?? "",
        plan: result.plan,
        created_at: created?.created_at ?? new Date().toISOString(),
        sessions_considered: digests.length,
      });
      setCompletedDrills(new Set());
      setPlanNotice("");
      setPlanLoaded(true);
      if (!created) setPlanError("The plan is ready, but it could not be saved to your account.");
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "The coach could not build your plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  async function loadProgress() {
    if (!user) {
      setProgressOwnerId(null);
      setProgress({ sessions: 0, completed: 0, streakDays: 0, avgOverall: null, avgDims: [], fillerFirst: null, fillerLast: null, deliveries: 0, weeks: [], reviewTrend: [] });
      setProgressLoading(false);
      return;
    }
    const userId = user.id;
    if (progressRefreshInFlightRef.current === userId) return;
    const cached = progressOwnerId === userId ? progress : readCachedProgress(userId);
    const hasSnapshot = Boolean(cached);
    if (cached && progressOwnerId !== userId) {
      setProgressOwnerId(userId);
      setProgress(cached);
    }
    if (!hasSnapshot) setProgressLoading(true);
    setProgressError("");
    progressRefreshInFlightRef.current = userId;
    try {
      const sessions = records;
      const withAnalysis = await Promise.all(
        sessions.slice(0, 12).map(async (session) => {
          try {
            const analysis = await loadDebateAnalysis(session.id);
            return { session, analysis };
          } catch {
            return { session, analysis: null };
          }
        }),
      );
      const overalls: number[] = [];
      const dimSums: Record<string, { total: number; count: number }> = {};
      const oneDecimal = (value: number) => Math.round(value * 10) / 10;
      for (const { analysis } of withAnalysis) {
        const ratings = analysis?.ratings;
        if (!ratings) continue;
        // The dashboard judge uses only these three rubric dimensions when no turns or delivery are supplied.
        const argument = oneDecimal((ratings.clarity.score + ratings.relevance.score + ratings.persuasiveness.score) / 3);
        const dimensions = [
          { key: "argument", score: argument },
          { key: "evidence", score: ratings.evidence_strength.score },
          { key: "logical", score: ratings.logical_consistency.score },
        ];
        overalls.push(oneDecimal((argument * 30 + ratings.evidence_strength.score * 20 + ratings.logical_consistency.score * 20) / 70));
        for (const dim of dimensions) {
          dimSums[dim.key] = dimSums[dim.key] ?? { total: 0, count: 0 };
          dimSums[dim.key].total += dim.score;
          dimSums[dim.key].count += 1;
        }
      }
      let fillers: { first: number | null; last: number | null; deliveries: number } = { first: null, last: null, deliveries: 0 };
      try {
        const feedbacks = await listPresentationFeedbacks(20);
        setDeliveryTakes(feedbacks.slice(0, 3));
        const rates = feedbacks.map((f) => f.signals.filler_rate_per_100w).filter((r) => typeof r === "number");
        fillers = {
          first: rates.length > 0 ? rates[rates.length - 1] : null,
          last: rates.length > 0 ? rates[0] : null,
          deliveries: feedbacks.length,
        };
      } catch {
        /* Delivery history is optional. */
      }
      const days = new Set(sessions.map((s) => dayKey(s.started_at)));
      const weeks: { label: string; count: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        const start = new Date(date);
        start.setDate(start.getDate() - 6);
        const count = sessions.filter((s) => {
          const t = new Date(s.started_at);
          return t >= start && t <= date;
        }).length;
        weeks.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count });
      }
      const nextProgress: PracticeProgress = {
        sessions: sessions.length,
        completed: sessions.filter((s) => s.status === "completed").length,
        streakDays: currentStreak(days),
        avgOverall: overalls.length > 0 ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length * 10) / 10 : null,
        avgDims: Object.entries(dimSums).map(([key, v]) => ({ key, score: Math.round(v.total / v.count * 10) / 10 })),
        fillerFirst: fillers.first,
        fillerLast: fillers.last,
        deliveries: fillers.deliveries,
        weeks,
        reviewTrend: withAnalysis
          .filter(({ session: record, analysis }) => record.status === "completed" && analysis?.ratings)
          .map(({ session: record, analysis }) => {
            const ratings = Object.values(analysis?.ratings ?? {});
            const values = ratings.map((rating) => rating.score).filter((score) => typeof score === "number");
            return values.length
              ? { at: record.started_at, label: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(record.started_at)), score: values.reduce((sum, score) => sum + score, 0) / values.length }
              : null;
          })
          .filter((point): point is ReviewPoint => point !== null)
          .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
          .slice(-8),
      };
      cacheProgress(userId, nextProgress);
      if (currentProgressUserRef.current === userId) {
        setProgressOwnerId(userId);
        setProgress(nextProgress);
      }
    } catch {
      if (currentProgressUserRef.current === userId && !hasSnapshot) setProgressError("Your trends didn't load. Try again in a moment.");
    } finally {
      if (progressRefreshInFlightRef.current === userId) progressRefreshInFlightRef.current = null;
      if (currentProgressUserRef.current === userId && !hasSnapshot) setProgressLoading(false);
    }
  }

  async function downloadCsv() {
    if (exporting) return;
    setExporting(true);
    setDataNotice("");
    try {
      downloadCsvFile(await buildArchiveCsv());
      setDataNotice("Your archive is downloading. It includes transcripts, reviews, and delivery takes.");
    } catch {
      setDataNotice("The export could not be built. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }

  async function toggleDrill(index: number) {
    const planId = storedPlan?.id;
    if (!planId || drillBusy !== null) return;
    const done = completedDrills.has(index);
    setDrillBusy(index);
    setPlanNotice("");
    try {
      if (done) await uncompletePlanDrill(planId, index);
      else await completePlanDrill(planId, index);
      setCompletedDrills((current) => {
        const next = new Set(current);
        if (done) next.delete(index);
        else next.add(index);
        return next;
      });
    } catch {
      setPlanNotice("That completion did not save. Check your connection and try again.");
    } finally {
      setDrillBusy(null);
    }
  }

  async function removeSelectedRecord() {
    if (!selected || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const sessionId = selected.session.id;
    setDeleting(true);
    setError("");
    try {
      await deleteDebateRecord(sessionId);
      setRecords((current) => current.filter((record) => record.id !== sessionId));
      if (user) clearCachedProgress(user.id);
      setProgress(null);
      setSelected(null);
      setConfirmDelete(false);
    } catch {
      setError("That rehearsal could not be deleted. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function removeAllPracticeData() {
    if (!user || dataBusy) return;
    if (dangerConfirm !== "data") {
      setDangerConfirm("data");
      return;
    }
    setDataBusy(true);
    setDataNotice("");
    try {
      await deleteAllPracticeData(user.id);
      clearCachedProgress(user.id);
      setRecords([]);
      setSelected(null);
      setShowAllRecords(false);
      setProgress(null);
      setStoredPlan(null);
      setCompletedDrills(new Set());
      setDangerConfirm(null);
      setDataNotice("All saved practice data was deleted. Your profile and sign-in remain.");
    } catch {
      setDataNotice("Practice data could not be fully deleted. Check your connection and try again.");
    } finally {
      setDataBusy(false);
    }
  }

  async function removeAccount() {
    if (!user || dataBusy) return;
    if (dangerConfirm !== "account") {
      setDangerConfirm("account");
      return;
    }
    setDataBusy(true);
    setDataNotice("");
    try {
      await deleteAccount();
      await onSignOut();
    } catch (error) {
      setDataNotice(error instanceof Error ? error.message : "The account could not be deleted.");
      setDangerConfirm(null);
    } finally {
      setDataBusy(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      await onSignOut();
    } catch {
      setError("We could not sign you out. Check your connection and try again.");
      setSigningOut(false);
    }
  }

  return (
    <main className={`account-page${newTheme ? " account-page-new" : ""}`}>
      <header className="account-head">
        <div className="account-head-copy">
          <h1>{newTheme ? "Your progress, in focus." : <>Your practice, <em>kept in reach.</em></>}</h1>
          <p className={`account-intro-line${setupComplete ? "" : " is-open"}`}>{newTheme ? "See what is working, what to sharpen next, and how your practice is changing." : introLine}</p>
          <p className="account-intro-mail">{user?.email ?? "Learner account"}</p>
        </div>
        {user && <div className="account-head-actions">
          <button className="account-signout" onClick={() => void signOut()} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>}
      </header>

      {!newTheme && <section className="account-overview" aria-label="Recent rehearsal summary">
        <div><span>SAVED SESSIONS</span><b>{loading ? "–" : records.length.toString().padStart(2, "0")}</b><small>Most recent 30</small></div>
        <div><span>COMPLETED</span><b>{loading ? "–" : records.filter((record) => record.status === "completed").length.toString().padStart(2, "0")}</b><small>In recent records</small></div>
        <div><span>IN PROGRESS</span><b>{loading ? "–" : records.filter((record) => record.status === "in_progress").length.toString().padStart(2, "0")}</b><small>Can be continued</small></div>
        <div><span>LATEST REHEARSAL</span><b className="account-latest">{loading ? "Loading" : records[0] ? formatDate(records[0].started_at) : "Not yet"}</b><small>{records[0]?.topic ?? "Your first session will appear here"}</small></div>
      </section>}

      <div ref={tabsRef} className="account-tabs" role="tablist" aria-label="Account sections">
        {visibleTabs.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`account-tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`account-panel-${item.key}`}
            tabIndex={tab === item.key ? 0 : -1}
            className={tab === item.key ? "active" : ""}
            onKeyDown={(event) => handleTabKey(event, index)}
            onClick={() => selectTab(item.key)}
          >
            {newTheme && item.key === "progress" ? "Analysis" : item.label}
            {item.key === recommended && <span className="tab-flag">For you</span>}
          </button>
        ))}
      </div>

      {tab === "plan" && (
        <section className="account-plan" role="tabpanel" id="account-panel-plan" aria-labelledby="account-tab-plan">
          <div className="archive-heading">
            <div><h2 id="plan-heading">Practice plan</h2><p>Diagnosed from your saved sessions, then drafted and checked by the coaching agent.</p></div>
            <span>{storedPlan ? `${storedPlan.sessions_considered} SESSIONS` : "--"}</span>
          </div>

          {planLoading && <div className="archive-loading"><LoaderCircle className="spin" size={18} /> Reading your sessions and drafting drills</div>}

          {!planLoading && !storedPlan && !planError && (
            <div className="archive-empty">
              <EmptyCueArt label="No plan yet" />
              <div><b>Turn your archive into drills.</b><p>Your weakest criteria, a drill for each one, and a four-week rhythm — grounded only in reviews you already have. Rebuilding after every few rehearsals keeps it honest.</p></div>
              <button className="button button-dark" onClick={() => void buildPlan()} disabled={!user}>Build my plan <Sparkles size={15} /></button>
            </div>
          )}

          {storedPlan && (
            <div className="plan-body">
              <div className="plan-head">
                <h3>{storedPlan.plan.headline}</h3>
                <p>{storedPlan.plan.summary}</p>
                <small>{formatDate(storedPlan.created_at)} · {storedPlan.sessions_considered} session{storedPlan.sessions_considered === 1 ? "" : "s"} considered</small>
                <div className="plan-next-rehearsal">
                  <span>NEXT REHEARSAL</span>
                  <b>{storedPlan.plan.next_session}</b>
                </div>
              </div>

              <div className="plan-block plan-focus-block">
                <div className="plan-block-heading"><span>WHAT YOUR RECORD SHOWS</span><small>{storedPlan.plan.weak_spots.length} FOCUS AREAS</small></div>
                <div className="plan-focus-list">
                {storedPlan.plan.weak_spots.map((spot) => (
                  <article className="plan-spot" key={spot.key}>
                    <b>{spot.label}</b>
                    <p>{spot.evidence}</p>
                    <div className="plan-spot-action"><span>FIRST STEP</span><em>{spot.first_step}</em></div>
                  </article>
                ))}
                </div>
              </div>

              <div className="plan-block plan-drills-block">
                <div className="plan-block-heading"><span>DRILLS</span><small>{completedDrills.size} OF {storedPlan.plan.drills.length} DONE</small></div>
                <div className="plan-drill-progress" role="progressbar" aria-label="Practice drills completed" aria-valuemin={0} aria-valuemax={storedPlan.plan.drills.length} aria-valuenow={completedDrills.size}>
                  <i style={{ transform: `scaleX(${storedPlan.plan.drills.length ? completedDrills.size / storedPlan.plan.drills.length : 0})` }} />
                </div>
                <div className="plan-drill-list">
                {storedPlan.plan.drills.map((drill, index) => {
                  const done = completedDrills.has(index);
                  return (
                    <article className={`plan-drill${done ? " is-done" : ""}`} key={`${index}-${drill.title}`}>
                      <span className="plan-drill-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                      <div><b>{drill.title}</b><span>{drill.minutes} MIN · {drill.weak_spot.replaceAll("_", " ").toUpperCase()}</span></div>
                      <ol>{drill.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                      <p className="plan-check"><Check size={13} /> {drill.success_check}</p>
                      <button
                        type="button"
                        className={`plan-drill-done${done ? " is-done" : ""}`}
                        onClick={() => void toggleDrill(index)}
                        disabled={!storedPlan.id || drillBusy !== null}
                        aria-pressed={done}
                        title={!storedPlan.id ? "Save this plan to track drill completion" : done ? "Mark this drill as not done" : "Mark this drill done"}
                      >
                        {drillBusy === index ? <LoaderCircle className="spin" size={13} /> : <Check size={13} />}
                        {done ? "Done" : "Mark done"}
                      </button>
                    </article>
                  );
                })}
                </div>
              </div>
              {planNotice && <p className="archive-partial" role="status">{planNotice}</p>}

              <div className="plan-block no-print">
                <div className="plan-block-heading"><span>THE RHYTHM</span><small>{storedPlan.plan.milestones.length}-WEEK PRACTICE ARC</small></div>
                <div className="plan-weeks">
                  {storedPlan.plan.milestones.map((milestone) => (
                    <div className="plan-week" key={milestone.week}>
                      <b>WEEK {milestone.week}</b>
                      <p>{milestone.practice}</p>
                      <em>{milestone.win_condition}</em>
                    </div>
                  ))}
                </div>
              </div>

              {(storedPlan.plan.gaps ?? []).length > 0 && <p className="archive-partial">{storedPlan.plan.gaps.join(" ")}</p>}
              {records[0] && new Date(records[0].started_at) > new Date(storedPlan.created_at) && (
                <p className="plan-stale">You have rehearsed since this plan was built — rebuild it to fold in the newest session.</p>
              )}

              <div className="plan-actions no-print">
                <button className="button button-light" onClick={() => void buildPlan()} disabled={planLoading}><Sparkles size={15} /> Rebuild plan</button>
                <button className="button button-light" onClick={() => window.print()}><Printer size={15} /> Print plan</button>
              </div>
            </div>
          )}

          {planError && <div className="archive-error" role="alert">{planError}</div>}
        </section>
      )}

      {tab === "progress" && (
        <section className="account-progress" role="tabpanel" id="account-panel-progress" aria-labelledby="account-tab-progress">
          <div className="archive-heading">
            <div><h2 id="progress-heading">Your analysis</h2><p>Strengths, focus areas, and change across your saved argument reviews.</p></div>
            <div className="archive-heading-side">
              <span>{progress?.sessions.toString().padStart(2, "0") ?? "--"}</span>
              <button className="dash-text-link" type="button" onClick={onDelivery}>Delivery room <ArrowUpRight size={14} /></button>
            </div>
          </div>
          {progressLoading && <div className="archive-loading"><LoaderCircle className="spin" size={18} /> Reading your trends</div>}
          {progressError && <div className="archive-error" role="alert">{progressError} <button className="button button-light" onClick={() => void loadProgress()}>Retry</button></div>}
          {!progressLoading && !progress && !progressError && (
            <div className="archive-empty">
              <EmptyCueArt label="No trends yet" />
              <div><b>Debate once to start your trends.</b><p>Scores, streaks, and filler direction appear here.</p></div>
            </div>
          )}
          {progress && <>
            <div className="progress-stats">
              <div><span>SESSIONS</span><b>{progress.sessions}</b></div>
              <div><span>COMPLETED</span><b>{progress.completed}</b></div>
              <div><span>DAY STREAK</span><b>{progress.streakDays}</b></div>
              <div><span>AVG OVERALL</span><b>{progress.avgOverall === null ? "–" : `${progress.avgOverall} / 5`}</b></div>
              <div><span>DELIVERY TAKES</span><b>{progress.deliveries}</b></div>
              <div><span>FILLERS / 100W</span><b>{progress.fillerFirst === null ? "–" : `${progress.fillerFirst} → ${progress.fillerLast}`}</b></div>
            </div>
            <div className="analysis-visuals">
              <section className="analysis-growth" aria-labelledby="analysis-growth-title">
                <div className="analysis-section-head">
                  <div><h3 id="analysis-growth-title">Argument review trend</h3><p>Average of scored rubric criteria · out of 5</p></div>
                  {reviewChange !== null && <b className={reviewChange >= 0 ? "is-up" : "is-down"}>{reviewChange > 0 ? "+" : ""}{reviewChange.toFixed(1)} <small>first to latest</small></b>}
                </div>
                {reviewChartCoordinates.length > 0 ? <>
                  <svg className="analysis-line-chart" viewBox="0 0 600 156" role="img" aria-label={`Argument review rubric average over ${reviewTrend.length} saved reviews, from ${reviewTrend[0].score.toFixed(1)} to ${reviewTrend[reviewTrend.length - 1].score.toFixed(1)} out of 5`}>
                    {[18, 74, 130].map((y, index) => <g key={y}><line x1="40" x2="580" y1={y} y2={y} /><text x="4" y={y + 4}>{[5, 3, 1][index]}</text></g>)}
                    {reviewChartCoordinates.length > 1 && <polyline points={reviewChartCoordinates.map((point) => `${point.x},${point.y}`).join(" ")} />}
                    {reviewChartCoordinates.map((point) => <g key={point.at}><circle cx={point.x} cy={point.y} r="4" /><text className="analysis-point-score" x={point.x} y={Math.max(12, point.y - 10)} textAnchor="middle">{point.score.toFixed(1)}</text></g>)}
                  </svg>
                  <div className="analysis-chart-dates"><span>{reviewTrend[0].label}</span><span>{reviewTrend.length > 1 ? reviewTrend[reviewTrend.length - 1].label : "One review so far"}</span></div>
                  {reviewChange === null && <p className="analysis-chart-note">Complete another scored review to see how your rubric average changes over time.</p>}
                  {reviewChange !== null && <p className="analysis-chart-note">Direction across your saved reviews; different motions can affect each score.</p>}
                </> : <p className="analysis-chart-empty">Your first completed argument review will set a baseline here.</p>}
              </section>

              <section className="analysis-profile" aria-labelledby="analysis-profile-title">
                <div className="analysis-section-head"><div><h3 id="analysis-profile-title">Your argument profile</h3><p>Average judge scores from reviewed sessions · out of 5</p></div></div>
                {rankedDimensions.length > 0 ? <>
                  <div className="analysis-insights">
                    <div><span>STRONGEST SIGNAL</span><b>{DIMENSION_LABELS[rankedDimensions[0].key] ?? rankedDimensions[0].key} <small>{rankedDimensions[0].score.toFixed(1)}</small></b></div>
                    {rankedDimensions.length > 1 && <div><span>NEXT AREA TO SHARPEN</span><b>{DIMENSION_LABELS[rankedDimensions[rankedDimensions.length - 1].key] ?? rankedDimensions[rankedDimensions.length - 1].key} <small>{rankedDimensions[rankedDimensions.length - 1].score.toFixed(1)}</small></b></div>}
                  </div>
                  <div className="progress-dims">
                    {rankedDimensions.map((dim) => (
                      <div key={dim.key} className="progress-dim">
                        <span>{DIMENSION_LABELS[dim.key] ?? dim.key}</span>
                        <div className="progress-bar" role="img" aria-label={`${DIMENSION_LABELS[dim.key] ?? dim.key} averages ${dim.score} of 5`}>
                          <i style={{ width: `${Math.min(100, dim.score / 5 * 100)}%` }} />
                        </div>
                        <b>{dim.score.toFixed(1)}</b>
                      </div>
                    ))}
                  </div>
                </> : <p className="analysis-chart-empty">Your argument profile will appear after your first scored review.</p>}
              </section>
            </div>

            <div className="analysis-lower-grid">
              <section className="analysis-plan-peek" aria-labelledby="analysis-plan-title">
                <div className="analysis-section-head">
                  <div><h3 id="analysis-plan-title">Your curated plan</h3><p>Personalized from your saved practice and goals.</p></div>
                  {storedPlan && <button type="button" className="dash-text-link" onClick={() => selectTab("plan")}>Open full plan <ArrowUpRight size={14} aria-hidden="true" /></button>}
                </div>
                {planLoading ? <p className="analysis-chart-empty">Reading your saved plan…</p> : storedPlan ? <>
                  <b className="analysis-plan-headline">{storedPlan.plan.headline}</b>
                  <p className="analysis-plan-summary">{storedPlan.plan.summary}</p>
                  <div className="analysis-plan-next"><span>NEXT REHEARSAL</span><b>{storedPlan.plan.next_session}</b></div>
                  {storedPlan.plan.drills[0] && <div className="analysis-plan-drill"><span>FIRST DRILL · {storedPlan.plan.drills[0].minutes} MIN</span><b>{storedPlan.plan.drills[0].title}</b></div>}
                  {planHasNewerPractice && <p className="analysis-plan-stale">You have a newer saved rehearsal. <button type="button" className="dash-text-link" onClick={() => void buildPlan()} disabled={planLoading}>{planLoading ? "Updating…" : "Update plan"}</button></p>}
                  <button type="button" className="dash-text-link" onClick={() => selectTab("plan")}>Track drills and milestones <ArrowRight size={14} aria-hidden="true" /></button>
                </> : <div className="analysis-plan-empty">
                  <p>{user ? "Build a practice plan from your goals and saved reviews, with specific drills and a four-week rhythm." : "Sign in to save a personal practice plan and track your progress across sessions."}</p>
                  <button className="button button-light" type="button" onClick={() => void buildPlan()} disabled={!user || planLoading}>{planLoading ? "Building plan…" : "Build my plan"} <Sparkles size={14} /></button>
                </div>}
                {planError && <div className="archive-error" role="alert">{planError}</div>}
              </section>

              <section className="analysis-activity" aria-labelledby="analysis-activity-title">
                <div className="analysis-section-head"><div><h3 id="analysis-activity-title">Practice rhythm</h3><p>Saved sessions over the last 8 weeks</p></div></div>
                {progress.weeks.length > 0 ? <div className="progress-weeks" role="img" aria-label="Sessions per week for the last 8 weeks">
                  {progress.weeks.map((week) => (
                    <div key={week.label} className="progress-week" title={`${week.count} session${week.count === 1 ? "" : "s"}`}>
                      <i style={{ height: `${Math.min(64, week.count * 16)}px` }} />
                      <span>{week.label}</span>
                    </div>
                  ))}
                </div> : <p className="analysis-chart-empty">Session activity will appear after you save a rehearsal.</p>}
              </section>
            </div>
            {deliveryTakes.length > 0 && (
              <section className="analysis-delivery" aria-labelledby="analysis-delivery-title">
                <div className="analysis-section-head">
                  <div><h3 id="analysis-delivery-title">Recent delivery takes</h3><p>Pace and pauses from the takes you kept in your archive.</p></div>
                  <button type="button" className="dash-text-link" onClick={onDelivery}>Open delivery room <ArrowUpRight size={14} /></button>
                </div>
                <div className="delivery-take-list">
                  {deliveryTakes.map((take) => (
                    <article key={take.id} className="delivery-take">
                      <span>{take.topic ?? "Solo delivery take"}</span>
                      <b>{Math.round(take.signals.wpm)} WPM · {take.signals.filler_count} filler{take.signals.filler_count === 1 ? "" : "s"}</b>
                      <time dateTime={take.created_at}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(take.created_at))}</time>
                    </article>
                  ))}
                </div>
              </section>
            )}
            <div className="progress-actions no-print">
              <button className="button button-light" onClick={() => void downloadCsv()} disabled={progress.sessions === 0 || exporting}><Download size={15} /> {exporting ? "Building archive CSV" : "Download archive CSV"}</button>
              <button className="button button-light" onClick={() => window.print()}><Printer size={15} /> Print report</button>
            </div>
          </>}
        </section>
      )}

      {tab === "settings" && (
        <div className="account-settings-panel" role="tabpanel" id="account-panel-settings" aria-labelledby="account-tab-settings">
          <section className="account-settings-block">
            <p className="account-settings-intro">Update your goals, opponent, and session setup. These answers shape your dashboard, cue, and the motions you are offered first.</p>
      <div className="account-setup-band">
        <section className="account-profile" aria-labelledby="profile-heading">
          <div className="archive-heading">
            <div><h2 id="profile-heading">Learner profile</h2><p>Your name and how long you have been speaking.</p></div>
          </div>
          <label htmlFor="profile-name">Display name</label>
          <input
            id="profile-name"
            type="text"
            value={profile.display_name ?? ""}
            onChange={(event) => setProfile((p) => ({ ...p, display_name: event.target.value.slice(0, 60) }))}
            placeholder="What should we call you?"
            maxLength={60}
          />
          <label htmlFor="profile-experience">Speaking experience</label>
          <select
            id="profile-experience"
            value={profile.experience ?? ""}
            onChange={(event) => setProfile((p) => ({ ...p, experience: (event.target.value || null) as LearnerProfile["experience"] }))}
          >
            <option value="">Prefer not to say</option>
            <option value="new">New to debating</option>
            <option value="developing">Developing</option>
            <option value="confident">Confident</option>
          </select>
          <label htmlFor="profile-goals">Practice goals</label>
          <textarea
            id="profile-goals"
            value={profile.goals ?? ""}
            onChange={(event) => setProfile((p) => ({ ...p, goals: event.target.value.slice(0, 500) }))}
            placeholder="Example: hold my nerve in cross-examination."
            rows={2}
            maxLength={500}
          />
          <label className="profile-check" htmlFor="profile-retain">
            <input
              id="profile-retain"
              type="checkbox"
              checked={profile.retain_audio}
              onChange={(event) => setProfile((p) => ({ ...p, retain_audio: event.target.checked }))}
            />
            Keep my delivery recordings in my archive
          </label>
        </section>

        <section className="account-room" aria-labelledby="room-heading">
          <div className="archive-heading">
            <div>
              <h2 id="room-heading">{setupComplete ? "Your room" : "Set your room"}</h2>
              <p>Preview updates as you choose. Save your room to apply these defaults and refresh your dashboard cue.</p>
            </div>
          </div>

          <div className="room-question">
            <span className="room-label" id="room-purpose">WHERE YOU PRACTISE</span>
            <div className="room-chips" role="radiogroup" aria-labelledby="room-purpose">
              {PURPOSE_OPTIONS.map((option) => {
                const picked = prefs.purpose === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    className={picked ? "is-picked" : ""}
                    onClick={() => setPrefs((current) => ({ ...current, purpose: picked ? null : option.key }))}
                  >
                    <b>{option.label}</b><small>{option.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="room-question">
            <span className="room-label" id="room-goal">WHAT WOULD COUNT AS PROGRESS</span>
            <div className="room-chips" role="radiogroup" aria-labelledby="room-goal">
              {GOAL_OPTIONS.map((option) => {
                const picked = prefs.goal === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={picked}
                    className={picked ? "is-picked" : ""}
                    onClick={() => setPrefs((current) => ({ ...current, goal: picked ? null : option.key }))}
                  >
                    <b>{option.label}</b><small>{option.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="room-question">
            <span className="room-label" id="room-focus">WHAT YOU WANT FROM PRACTICE <em>up to three</em></span>
            <div className="room-chips room-chips-focus" role="group" aria-labelledby="room-focus">
              {FOCUS_OPTIONS.map((option) => {
                const picked = prefs.focus.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={picked}
                    className={picked ? "is-picked" : ""}
                    onClick={() => toggleFocus(option.key)}
                  >
                    <b>{option.label}</b><small>{option.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="room-effect">
            <span className="room-label">WHAT THESE ANSWERS PICK FOR YOU</span>
            <div className="room-effect-grid">
              <div><span>Opponent</span><b>{personaFor(recommendation.persona).name}</b></div>
              <div><span>Pressure</span><b>{difficultyFor(recommendation.difficulty).label}</b></div>
              <div><span>Clock</span><b>{recommendation.duration} min</b></div>
            </div>
            <p>{recommendation.reason}</p>
            <p className="room-effect-cue"><b>Dashboard cue</b>{firstPracticeCue(prefs)}</p>
          </div>

          <div className="account-setup-foot">
            <p>Every answer here also reshapes your dashboard and the motions you are offered first.</p>
            <button className="button button-dark" type="button" onClick={() => void saveSetup()} disabled={savingProfile}>
              {savingProfile ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Save your room
            </button>
          </div>
          {profileNotice && <div className="inline-notice" role="status">{profileNotice}</div>}
        </section>
      </div>
          </section>

        <section className="account-app-settings" aria-labelledby="app-settings-heading">
          <div className="archive-heading">
            <div>
              <h2 id="app-settings-heading">How your debate coach works</h2>
              <p>Choose whether the coach can use adaptive moves and your saved practice when shaping replies.</p>
            </div>
          </div>

          <div className="app-settings-list">
            <div className="app-setting-row app-setting-length">
              <div className="app-setting-copy">
                <span className="app-setting-icon"><Cpu size={17} /></span>
                <div>
                  <h3>Local model</h3>
                  <p>Choose which Ollama model answers debate turns, reviews, plans, and delivery coaching on this machine.</p>
                  <p className="app-setting-status">Pull both models once with <code>ollama pull</code>; switching takes effect on the next request and warms the new model immediately.</p>
                </div>
              </div>
              <div className="app-length-options app-model-options" role="radiogroup" aria-label="Local model">
                {LOCAL_MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    disabled={!appSettingsReady}
                    aria-checked={appSettings.model === option.id}
                    className={appSettings.model === option.id ? "selected" : ""}
                    onClick={() => updateAppSettings({ model: option.id })}
                  >
                    <b>{option.name}</b><small>{option.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="app-setting-row">
              <div className="app-setting-copy">
                <span className="app-setting-icon"><Bot size={17} /></span>
                <div>
                  <h3>Adaptive debate moves</h3>
                  <p>Use the built-in argument policy for clear turns, and Laya when it is installed and enabled for ambiguous ones. The debate coach still writes the reply.</p>
                  <p className={`app-setting-status ${layaStatus}`} role="status">
                    {layaStatus === "checking" && "Checking whether Laya is enabled…"}
                    {layaStatus === "available" && "Laya is installed and enabled. The checkpoint loads on first use; if it cannot load, the built-in policy and standard replies continue."}
                    {layaStatus === "unavailable" && "Laya is not enabled or installed here. The built-in policy still handles clear turns; ambiguous turns use the planner."}
                    {layaStatus === "unknown" && "Could not check right now. The built-in policy still works, and Laya is skipped if it is unavailable."}
                  </p>
                </div>
              </div>
              <label className="app-switch" aria-label="Use adaptive debate moves">
                <input
                  type="checkbox"
                  checked={appSettings.adaptiveTactics}
                  disabled={!appSettingsReady}
                  onChange={(event) => updateAppSettings({ adaptiveTactics: event.target.checked })}
                />
                <span aria-hidden="true" />
              </label>
            </div>

            <div className="app-setting-row">
              <div className="app-setting-copy">
                <span className="app-setting-icon"><History size={17} /></span>
                <div>
                  <h3>Use saved practice history</h3>
                  <p>Allow up to 12 short summaries of earlier sessions to guide the opponent. Turn this off to keep past practice out of debate prompts.</p>
                  <p className="app-setting-status">Your saved transcripts remain in your archive either way.</p>
                </div>
              </div>
              <label className="app-switch" aria-label="Use saved practice history">
                <input
                  type="checkbox"
                  checked={appSettings.usePracticeHistory}
                  disabled={!appSettingsReady}
                  onChange={(event) => updateAppSettings({ usePracticeHistory: event.target.checked })}
                />
                <span aria-hidden="true" />
              </label>
            </div>

            <div className="app-setting-row">
              <div className="app-setting-copy">
                <span className="app-setting-icon"><AudioLines size={17} /></span>
                <div>
                  <h3>Stream replies as they are written</h3>
                  <p>Show the opponent's reply in the debate exchange and voice room sentence by sentence. Turn this off to wait for the full, checked reply.</p>
                  <p className="app-setting-status">You can change this for one session inside the debate room.</p>
                </div>
              </div>
              <label className="app-switch" aria-label="Stream replies as they are written">
                <input
                  type="checkbox"
                  checked={appSettings.streamReplies}
                  disabled={!appSettingsReady}
                  onChange={(event) => updateAppSettings({ streamReplies: event.target.checked })}
                />
                <span aria-hidden="true" />
              </label>
            </div>

            <div className="app-setting-row app-setting-length">
              <div className="app-setting-copy">
                <span className="app-setting-icon"><MessageSquareText size={17} /></span>
                <div>
                  <h3>Opponent reply length</h3>
                  <p>Choose a shorter point or give the opponent more room to build its case.</p>
                </div>
              </div>
              <div className="app-length-options" role="radiogroup" aria-label="Opponent reply length">
                <button
                  type="button"
                  role="radio"
                  disabled={!appSettingsReady}
                  aria-checked={appSettings.replyLength === "concise"}
                  className={appSettings.replyLength === "concise" ? "selected" : ""}
                  onClick={() => updateAppSettings({ replyLength: "concise" })}
                >
                  <b>Short</b><small>One direct point</small>
                </button>
                <button
                  type="button"
                  role="radio"
                  disabled={!appSettingsReady}
                  aria-checked={appSettings.replyLength === "standard"}
                  className={appSettings.replyLength === "standard" ? "selected" : ""}
                  onClick={() => updateAppSettings({ replyLength: "standard" })}
                >
                  <b>Standard</b><small>More room to rebut</small>
                </button>
              </div>
            </div>
          </div>

          <div className="app-settings-foot">
            <p>{appSettingsReady ? "Saved choices apply to the next reply. Practice history is loaded when needed for a debate." : "Reading the settings saved to your account."}</p>
            <button className="button button-dark" type="button" onClick={() => void saveApplicationSettings()} disabled={!user || !appSettingsReady || savingAppSettings || savingProfile}>
              {savingAppSettings ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
              {savingAppSettings ? "Saving settings" : "Save app settings"}
            </button>
          </div>
          {appSettingsNotice && <div className="inline-notice" role="status">{appSettingsNotice}</div>}
        </section>

        <section className="account-data" aria-labelledby="account-data-heading">
          <div className="archive-heading">
            <div>
              <h2 id="account-data-heading">Your data</h2>
              <p>Download a full archive or remove saved practice from this account.</p>
            </div>
          </div>
          <div className="account-data-actions">
            <button className="button button-light" type="button" onClick={() => void downloadCsv()} disabled={exporting || records.length === 0}>
              <Download size={15} /> {exporting ? "Building archive CSV" : "Download archive CSV"}
            </button>
            <button
              className={`button button-light danger${dangerConfirm === "data" ? " armed" : ""}`}
              type="button"
              onClick={() => void removeAllPracticeData()}
              disabled={dataBusy}
            >
              <Trash2 size={15} /> {dangerConfirm === "data" ? "Tap again to delete practice data" : "Delete all practice data"}
            </button>
            <button
              className={`button button-light danger${dangerConfirm === "account" ? " armed" : ""}`}
              type="button"
              onClick={() => void removeAccount()}
              disabled={dataBusy}
            >
              <Trash2 size={15} /> {dangerConfirm === "account" ? "Tap again to delete my account" : "Delete my account"}
            </button>
          </div>
          <p className="account-data-note">
            Practice data includes saved rehearsals, reviews, delivery reports, practice plans, and your topic bank.
            Deleting your account also removes the sign-in itself. Both actions cannot be undone; the archive CSV
            is the only copy kept once they finish.
          </p>
          {dataNotice && <div className="inline-notice" role="status">{dataNotice}</div>}
        </section>
              </div>
      )}

      {tab === "archive" && (
        <div className={`account-layout${selected ? " has-selected" : ""}`} role="tabpanel" id="account-panel-archive" aria-labelledby="account-tab-archive">
          <section className="account-archive" aria-labelledby="archive-heading">
            <div className="archive-heading">
              <div><h2 id="archive-heading">{newTheme ? "Saved debates" : "Rehearsal archive"}</h2><p>{newTheme ? "Open a completed debate to read its transcript and review." : "Open a transcript to review it or continue the conversation in the debate room."}</p></div>
              <span>
                {loading
                  ? "--"
                  : showAllRecords || records.length <= 5
                    ? records.length.toString().padStart(2, "0")
                    : `${shownCount.toString().padStart(2, "0")} / ${records.length.toString().padStart(2, "0")}`}
              </span>
            </div>

            {loading && (
              <div className="archive-skeleton" role="status">
                <span className="visually-hidden">Gathering your rehearsals</span>
                {[0, 1, 2, 3].map((index) => (
                  <div className="archive-skeleton-row" key={index} aria-hidden="true">
                    <span /><span /><span />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="archive-empty">
                <EmptyCueArt label="No saved rehearsals yet" />
                <div><b>{newTheme ? "Your first review starts with a debate." : "Your record starts with the next debate."}</b><p>{user ? "Start a debate and its transcript will appear here." : "Guest debates can be reviewed when you finish. Sign in to keep transcripts in this archive."}</p></div>
                <button className="button button-dark" onClick={onStart}>{newTheme ? "Start a debate" : "Open the prompt book"} <ArrowUpRight size={15} /></button>
              </div>
            )}

            {!loading && visibleRecords.map((record) => (
              <button
                className={`archive-row ${selected?.session.id === record.id ? "selected" : ""}`}
                key={record.id}
                onClick={() => void openRecord(record.id)}
                disabled={loadingRecord !== ""}
                aria-current={selected?.session.id === record.id}
              >
                <span className="archive-date">
                  {formatDate(record.started_at)}
                  <span className={`archive-status ${record.status}`}>
                    {record.status === "completed" ? "Complete" : "In progress"}
                  </span>
                </span>
                <span className="archive-topic">{record.topic}</span>
                <span className="archive-meta">{opponentName(record.persona)} · {record.duration_minutes} min</span>
                <span className="archive-arrow">{loadingRecord === record.id ? <LoaderCircle className="spin" size={15} /> : <ArrowUpRight size={15} />}</span>
              </button>
            ))}

            {!loading && records.length > 5 && (
              <button
                className="archive-more"
                type="button"
                aria-expanded={showAllRecords}
                onClick={() => setShowAllRecords((current) => !current)}
              >
                {showAllRecords
                  ? <>Show latest 5 <ChevronUp size={14} aria-hidden="true" /></>
                  : <>Show all {records.length} sessions <ChevronDown size={14} aria-hidden="true" /></>}
              </button>
            )}

            {error && <div className="archive-error" role="alert">{error} <button className="button button-light" onClick={reload}>Retry</button></div>}
          </section>

        {selected && (
          <section ref={detailRef} className="record-detail" role="region" aria-label="Saved debate transcript">
            <div className="record-detail-head">
              <div><span>THE MOTION</span><h2>{selected.session.topic}</h2></div>
              <button onClick={() => { setSelected(null); setConfirmDelete(false); }} aria-label="Back to archive"><ArrowLeft size={16} /></button>
            </div>
            <div className="record-detail-meta">{opponentName(selected.session.persona)} · {selected.session.learner_position === "for" ? "In favour" : "Against"} · {formatDate(selected.session.started_at)}</div>
            <div className="record-detail-turns">
              {selected.turns.map((turn) => (
                <article className={`record-turn ${turn.speaker}${turn.kind === "challenge" ? " is-challenge" : ""}`} key={turn.id}>
                  <span>
                    {turn.kind === "challenge"
                      ? `FOLLOW-UP ${turn.challenge_depth ?? 1} OF 2`
                      : turn.speaker === "learner" ? "YOUR CASE" : opponentName(selected.session.persona).toUpperCase()}
                  </span>
                  {turn.challenge_target && <blockquote className="record-turn-target">“{turn.challenge_target}”</blockquote>}
                  <p><MarkdownText text={turn.content} compact /></p>
                </article>
              ))}
              {selected.turns.length === 0 && <p className="record-detail-empty">This rehearsal has no saved turns.</p>}
            </div>
            {selected.analysis && <section className="archive-analysis">
              <span>CASE REVIEW</span>
              {selected.verdict && <p className="archive-verdict-score"><b>WEIGHTED VERDICT</b><strong>{selected.verdict.overall.toFixed(1)} / 5</strong></p>}
              {(selected.analysis.gaps ?? []).length > 0 && (
                <p className="archive-partial">Partial review: {(selected.analysis.gaps ?? []).join(" ")}</p>
              )}
              {selected.analysis.truncated && (
                <p className="archive-partial">This review scored the latest {selected.analysis.reviewed_turns} of {selected.analysis.total_turns} turns; earlier turns were condensed context.</p>
              )}
              {selected.analysis.ratings && (
                <div>{Object.entries(selected.analysis.ratings).map(([key, rating]) => <p key={key}><b>{key.replaceAll("_", " ")}</b><strong>{rating.score}/5</strong></p>)}</div>
              )}
              <span>YOUR NEXT MOVES</span>
              {selected.analysis.next_steps.map((step, index) => <p key={`${index}-${step}`}>{step}</p>)}
            </section>}
            <div className="record-detail-actions">
              <button className="button button-dark" onClick={() => onViewVerdict(selected.session, selected.turns, selected.analysis, selected.verdict, selected.delivery)}>
                <ArrowUpRight size={15} /> View full verdict
              </button>
              <button className="button button-light" onClick={() => onContinue(selected.session, selected.turns)}>
                Continue in the debate room <ArrowRight size={15} />
              </button>
              <button
                className={`button button-light danger${confirmDelete ? " armed" : ""}`}
                type="button"
                onClick={() => void removeSelectedRecord()}
                disabled={deleting}
              >
                <Trash2 size={15} /> {deleting ? "Deleting" : confirmDelete ? "Tap again to delete" : "Delete this rehearsal"}
              </button>
              <p>Saved turns, including follow-ups, will appear in the room with a fresh clock. The earlier case review is cleared because it no longer covers the extended transcript.</p>
            </div>
          </section>
        )}
          {!selected && (
            <aside className="archive-rail" aria-label="Your next rehearsal">
              <div className="rail-card">
                <h2>Your next rehearsal</h2>
                <p>{recommendation.reason}</p>
                <div className="rail-facts">
                  <div><span>OPPONENT</span><b>{personaFor(recommendation.persona).name}</b></div>
                  <div><span>PRESSURE</span><b>{difficultyFor(recommendation.difficulty).label}</b></div>
                  <div><span>CLOCK</span><b>{recommendation.duration} min</b></div>
                </div>
                <button className="button button-dark" type="button" onClick={onStart}>Start a rehearsal</button>
                <div className="rail-links">
                  <button type="button" onClick={() => selectTab("plan")}>Practice plan <ArrowUpRight size={13} aria-hidden="true" /></button>
                  <button type="button" onClick={() => selectTab("progress")}>Practice trends <ArrowUpRight size={13} aria-hidden="true" /></button>
                </div>
                <p className="rail-note">Select a session to read its transcript here.</p>
              </div>
            </aside>
          )}
        </div>
      )}

      <div className="account-private-note"><RotateCcw size={14} /> Only you can read the sessions saved in this account.</div>
    </main>
  );
}

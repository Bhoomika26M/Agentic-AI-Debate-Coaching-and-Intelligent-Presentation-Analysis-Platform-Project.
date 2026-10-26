import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  Clock3,
  Flame,
  History,
  LoaderCircle,
  Mic,
  Play,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { OpponentEmblem } from "../../components/OpponentEmblem";
import { difficultyFor, personas, starterTopics, type DifficultyKey, type PersonaKey } from "../debate-catalog";
import {
  listDebateRecords,
  loadDebateAnalysis,
  type DebateRecord,
} from "../../services/debate-records";
import { listPresentationFeedbacks } from "../../services/presentation-records";
import { loadProfile, type LearnerProfile } from "../../services/profiles";
import { listBankTopics, type BankTopic } from "../../services/topics";
import type { AnalysisReport } from "../../services/debate-api";
import { generateAndSaveLearningPlan, listLearningPlans, type StoredPlan } from "../../services/plan-records";
import {
  buildRecommendation,
  goalLine,
  loadPrefs,
  orderedStarterTopics,
  preferencesFor,
  purposeLine,
  type GoalKey,
  type LearnerPrefs,
} from "../../services/learner-prefs";
import "./dashboard.css";

type Slot = {
  key: "warm-up" | "standard" | "full";
  label: string;
  minutes: number;
  difficulty: DifficultyKey;
  detail: string;
};

const SLOTS: Slot[] = [
  { key: "warm-up", label: "Warm-up", minutes: 3, difficulty: "warm-up", detail: "One case, gentle pressure, nothing to prove." },
  { key: "standard", label: "Standard", minutes: 5, difficulty: "challenge", detail: "A full exchange with real pushback." },
  { key: "full", label: "Full round", minutes: 10, difficulty: "cross-examination", detail: "Match clock, hardest questions, no easy exits." },
];

const CRITERIA = ["clarity", "relevance", "evidence_strength", "logical_consistency", "persuasiveness"] as const;
const CRITERIA_LABELS: Record<(typeof CRITERIA)[number], string> = {
  clarity: "Clarity",
  relevance: "Relevance",
  evidence_strength: "Evidence",
  logical_consistency: "Logic",
  persuasiveness: "Persuasion",
};

type Cue = {
  key: string;
  title: string;
  body: string;
  action: string;
  icon: "rehearse" | "drill" | "record";
  onClick: () => void;
};

type Tally = {
  sessions: number;
  completed: number;
  streak: number;
  thisWeek: number;
  avgArgument: number | null;
  weakest: { key: string; label: string; score: number } | null;
  fillerFirst: number | null;
  fillerLast: number | null;
  deliveries: number;
};

type GoalSnapshot = {
  title: string;
  score: number | null;
  scoreLabel: string;
  detail: string;
  comparison: string;
  caveat: string;
  activity: { at: string; pressure: boolean }[];
  breakdown: { label: string; score: number }[];
  pressureFocus: boolean;
};

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function currentStreak(days: Set<string>) {
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatScore(value: number) {
  return Math.round(value * 10) / 10;
}

function goalSnapshot(
  goal: GoalKey | null,
  customGoal: string | null,
  records: DebateRecord[],
  analyses: (AnalysisReport | null)[],
): GoalSnapshot | null {
  const completed = records.filter((record) => record.status === "completed");
  const activity = completed
    .slice()
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .map((record) => ({ at: record.started_at, pressure: record.difficulty === "cross-examination" }));
  const reviewed = records
    .map((record, index) => ({ record, analysis: analyses[index] }))
    .filter((item) => item.record.status === "completed" && item.analysis?.ratings);
  const average = (report: AnalysisReport | null | undefined, keys: (typeof CRITERIA)[number][]) => {
    const scores = keys
      .map((key) => report?.ratings?.[key]?.score)
      .filter((value): value is number => typeof value === "number");
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
  };

  let keys: (typeof CRITERIA)[number][] = [];
  let title = "";
  let caveat = "";
  if (goal === "structure") {
    keys = ["clarity", "logical_consistency"];
    title = "Case structure";
  } else if (goal === "evidence") {
    keys = ["evidence_strength"];
    title = "Evidence";
  } else if (goal === "win") {
    keys = [...CRITERIA];
    title = "Case review average";
    caveat = "This is a rubric average, not a win rate. The app does not record round winners.";
  } else if (goal === "nerves") {
    return {
      title: "Rehearsal exposure",
      score: null,
      scoreLabel: `${completed.length} completed`,
      detail: `${completed.length} completed debate ${completed.length === 1 ? "session" : "sessions"} in your saved record.`,
      comparison: "",
      caveat: "Practice count only. It does not measure anxiety or confidence directly.",
      activity,
      breakdown: [],
      pressureFocus: false,
    };
  } else if (goal === "hostile") {
    const count = completed.filter((record) => record.difficulty === "cross-examination").length;
    return {
      title: "High-pressure practice",
      score: null,
      scoreLabel: `${count} rounds`,
      detail: `${count} completed ${count === 1 ? "round used" : "rounds used"} the cross-examination setting.`,
      comparison: "",
      caveat: "This counts selected difficulty, not rebuttal quality. Review scores do not isolate hostile-question skill.",
      activity,
      breakdown: [],
      pressureFocus: true,
    };
  } else if (customGoal?.trim()) {
    return {
      title: customGoal.trim(),
      score: null,
      scoreLabel: `${completed.length} completed`,
      detail: `${completed.length} completed debate ${completed.length === 1 ? "session" : "sessions"} in your saved record.`,
      comparison: "",
      caveat: "Your custom goal is not directly scored by the current review rubric.",
      activity,
      breakdown: [],
      pressureFocus: false,
    };
  } else {
    return null;
  }

  const scores = reviewed
    .map(({ analysis }) => average(analysis, keys))
    .filter((value): value is number => value !== null);
  const latest = scores[0] ?? null;
  const earliest = scores[scores.length - 1] ?? null;
  const latestScoredReview = reviewed.find(({ analysis }) => average(analysis, keys) !== null)?.analysis;
  const breakdown = keys.flatMap((key) => {
    const score = latestScoredReview?.ratings?.[key]?.score;
    return typeof score === "number" ? [{ label: CRITERIA_LABELS[key], score: formatScore(score) }] : [];
  });
  const change = scores.length > 1 && latest !== null && earliest !== null
    ? latest - earliest
    : null;
  const comparison = change === null
    ? scores.length === 1 ? "One scored review available so far." : "A scored review is needed to show this goal on the rubric."
    : change === 0
      ? `At the same level as the earliest of ${scores.length} available reviews.`
      : `${Math.abs(formatScore(change)).toFixed(1)} ${change > 0 ? "higher" : "lower"} than the earliest of ${scores.length} available reviews.`;

  return {
    title,
    score: latest === null ? null : formatScore(latest),
    scoreLabel: latest === null ? "No score yet" : `${formatScore(latest).toFixed(1)} / 5`,
    detail: latest === null
      ? "Your completed rounds are saved, but none of the available reviews includes this score yet."
      : `Latest available review across ${goal === "structure" ? "clarity and logic" : goal === "evidence" ? "evidence strength" : "the five argument criteria"}.`,
    comparison,
    caveat,
    activity: [],
    breakdown,
    pressureFocus: false,
  };
}

function validGoal(value: string | null | undefined): GoalKey | null {
  return value === "structure" || value === "evidence" || value === "nerves" || value === "hostile" || value === "win"
    ? value
    : null;
}

function buildTally(records: DebateRecord[], analyses: (AnalysisReport | null)[], feedbacks: { signals?: { filler_rate_per_100w?: number } }[]): Tally {
  const days = new Set(records.map((record) => dayKey(record.started_at)));
  const weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
  const totals: Record<string, { sum: number; count: number }> = {};
  const sessionScores: number[] = [];

  for (const analysis of analyses) {
    const ratings = analysis?.ratings;
    if (!ratings) continue;
    let sum = 0;
    let count = 0;
    for (const key of CRITERIA) {
      const score = ratings[key]?.score;
      if (typeof score !== "number") continue;
      totals[key] = totals[key] ?? { sum: 0, count: 0 };
      totals[key].sum += score;
      totals[key].count += 1;
      sum += score;
      count += 1;
    }
    if (count > 0) sessionScores.push(sum / count);
  }

  const weakest = Object.entries(totals)
    .map(([key, entry]) => ({ key, label: CRITERIA_LABELS[key as (typeof CRITERIA)[number]], score: entry.sum / entry.count }))
    .sort((a, b) => a.score - b.score)[0] ?? null;

  const rates = feedbacks
    .map((feedback) => feedback.signals?.filler_rate_per_100w)
    .filter((rate): rate is number => typeof rate === "number");

  return {
    sessions: records.length,
    completed: records.filter((record) => record.status === "completed").length,
    streak: currentStreak(days),
    thisWeek: records.filter((record) => new Date(record.started_at).getTime() >= weekAgo).length,
    avgArgument: sessionScores.length
      ? Math.round((sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length) * 10) / 10
      : null,
    weakest: weakest && weakest.score < 4 ? weakest : null,
    fillerFirst: rates.length ? rates[rates.length - 1] : null,
    fillerLast: rates.length ? rates[0] : null,
    deliveries: feedbacks.length,
  };
}

function buildCues(tally: Tally, prefs: LearnerPrefs, go: (view: "setup" | "account" | "present") => void): Cue[] {
  const cues: Cue[] = [];

  if (tally.sessions === 0) {
    cues.push({
      key: "first",
      title: "Run your first rehearsal",
      body: "Three minutes is enough to get a first score on the board and a review to read.",
      action: "Set it up",
      icon: "rehearse",
      onClick: () => go("setup"),
    });
  } else if (tally.weakest) {
    cues.push({
      key: "weakest",
      title: `Lift your ${tally.weakest.label.toLowerCase()}`,
      body: `Your own scores put ${tally.weakest.label.toLowerCase()} at ${tally.weakest.score.toFixed(1)}/5 — the lowest of the five criteria.`,
      action: "Open my plan",
      icon: "drill",
      onClick: () => go("account"),
    });
  } else if (tally.sessions > 0 && !tally.weakest) {
    cues.push({
      key: "raise",
      title: tally.streak > 1 ? `Hold a ${tally.streak}-day streak` : "Raise the pressure",
      body: "No criterion sits below 4/5. Move up a slot and rehearse against cross-examination.",
      action: "Set it up",
      icon: "rehearse",
      onClick: () => go("setup"),
    });
  }

  const needsDelivery = prefs.focus.includes("delivery") || (tally.fillerLast ?? 0) >= 3;
  if (needsDelivery) {
    cues.push({
      key: "delivery",
      title: tally.deliveries === 0 ? "Record a closing take" : "Tighten your filler rate",
      body: tally.deliveries === 0
        ? "Delivery is scored from a closing take, so one 60-second recording unlocks it."
        : `Your latest take used ${tally.fillerLast?.toFixed(1)} fillers per 100 words. Mark each one with a pause instead.`,
      action: "Open delivery room",
      icon: "record",
      onClick: () => go("present"),
    });
  }

  if (prefs.goal === "evidence" && cues.length < 3) {
    cues.push({
      key: "evidence",
      title: "Attach one source to every claim",
      body: "Pick your strongest claim and find the concrete evidence underneath it before the next round.",
      action: "Open my plan",
      icon: "drill",
      onClick: () => go("account"),
    });
  }

  if (prefs.goal === "hostile" && cues.length < 3) {
    cues.push({
      key: "hostile",
      title: "Answer the hard question first",
      body: "Start your next turn with the opponent's sharpest point, then build your own case on top.",
      action: "Set it up",
      icon: "rehearse",
      onClick: () => go("setup"),
    });
  }

  if (tally.streak === 0 && tally.sessions > 0 && cues.length < 3) {
    cues.push({
      key: "streak",
      title: "Rehearse today",
      body: "A round today restarts your streak before the week closes out.",
      action: "Set it up",
      icon: "rehearse",
      onClick: () => go("setup"),
    });
  }

  return cues.slice(0, 3);
}

export function DashboardView({
  userId,
  accessToken,
  displayName,
  resume,
  onLaunch,
  onNavigate,
  onOpenRecord,
}: {
  userId: string;
  accessToken?: string;
  displayName: string | null;
  resume: { turns: number; topic: string; onResume: () => void; onDiscard: () => void } | null;
  onLaunch: (prefill: { topic: string; position: "for" | "against"; persona: PersonaKey; difficulty: DifficultyKey; duration: number }) => void;
  onNavigate: (view: "setup" | "account" | "present") => void;
  onOpenRecord: (recordId: string) => void;
}) {
  const prefs = useMemo(() => loadPrefs(userId), [userId]);
  const recommendation = useMemo(() => buildRecommendation(prefs.experience, prefs), [prefs]);

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [bankTopics, setBankTopics] = useState<BankTopic[]>([]);
  const [records, setRecords] = useState<DebateRecord[]>([]);
  const [analyses, setAnalyses] = useState<(AnalysisReport | null)[]>([]);
  const [feedbacks, setFeedbacks] = useState<{ signals?: { filler_rate_per_100w?: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storedPlan, setStoredPlan] = useState<StoredPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [planWorking, setPlanWorking] = useState(false);
  const [planError, setPlanError] = useState("");

  const suggestedMotions = useMemo(() => {
    const ordered = orderedStarterTopics(starterTopics, prefs);
    const saved = bankTopics.map((topic) => topic.title);
    return [...saved, ...ordered].filter((title, index, all) => all.indexOf(title) === index).slice(0, 4);
  }, [prefs, bankTopics]);

  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState("");
  const [position, setPosition] = useState<"for" | "against">("for");
  const [persona, setPersona] = useState<PersonaKey>("skeptic");
  const [slotKey, setSlotKey] = useState<Slot["key"]>("standard");

  useEffect(() => {
    setTopic((current) => current || suggestedMotions[0] || "");
  }, [suggestedMotions]);

  useEffect(() => {
    setPersona(recommendation.persona);
  }, [recommendation.persona]);

  useEffect(() => {
    const duration = recommendation.duration;
    setSlotKey(duration <= 3 ? "warm-up" : duration >= 10 ? "full" : "standard");
  }, [recommendation.duration]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void loadProfile(userId)
      .then((data) => { if (active) setProfile(data); })
      .catch(() => {});

    void listBankTopics()
      .then((data) => { if (active) setBankTopics(data); })
      .catch(() => {});

    void listPresentationFeedbacks(8)
      .then((data) => { if (active) setFeedbacks(data); })
      .catch(() => {});

    void listDebateRecords(30)
      .then(async (data) => {
        if (!active) return;
        setRecords(data);
        const newest = data.slice(0, 6);
        const loaded = await Promise.all(
          newest.map((record) => loadDebateAnalysis(record.id).catch(() => null)),
        );
        if (active) setAnalyses(loaded);
      })
      .catch(() => {
        if (active) {
          setRecords([]);
          setAnalyses([]);
          setError("Your record didn't load. Try again in a moment.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setPlanLoading(true);
    setPlanError("");
    void listLearningPlans(1)
      .then((plans) => { if (active) setStoredPlan(plans[0] ?? null); })
      .catch(() => { if (active) setPlanError("Your practice plan did not load. Try again in a moment."); })
      .finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, [userId]);

  const tally = useMemo(() => buildTally(records, analyses, feedbacks), [records, analyses, feedbacks]);
  const cues = useMemo(() => buildCues(tally, prefs, onNavigate), [tally, prefs, onNavigate]);
  const activeGoal = prefs.goal ?? validGoal(profile?.practice_goal);
  const goalProgress = useMemo(
    () => goalSnapshot(activeGoal, profile?.goals ?? null, records, analyses),
    [activeGoal, profile?.goals, records, analyses],
  );
  const slot = SLOTS.find((option) => option.key === slotKey) ?? SLOTS[1];
  const activePersona = personas.find((person) => person.key === persona) ?? personas[1];
  const activeTopic = custom.trim() || topic;
  const firstName = (displayName ?? profile?.display_name ?? "").trim().split(/\s+/)[0];
  const recent = records.slice(0, 5);
  const planIsBehind = Boolean(storedPlan && records[0] && new Date(records[0].started_at) > new Date(storedPlan.created_at));

  async function refreshPlan() {
    if (planWorking) return;
    setPlanWorking(true);
    setPlanError("");
    try {
      const created = await generateAndSaveLearningPlan(userId, {
        goals: profile?.goals ?? null,
        experience: profile?.experience ?? prefs.experience,
        preferences: preferencesFor(prefs),
      }, accessToken);
      setStoredPlan(created);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "The coach could not update your practice plan.");
    } finally {
      setPlanWorking(false);
    }
  }

  function takeTheFloor() {
    if (!activeTopic.trim()) return;
    onLaunch({
      topic: activeTopic.trim().slice(0, 240),
      position,
      persona,
      difficulty: slot.difficulty,
      duration: slot.minutes,
    });
  }

  return (
    <main className="dash" aria-labelledby="dash-heading">
      <header className="dash-head">
        <div>
          <h1 id="dash-heading">{greeting()}{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="dash-sub">
            {purposeLine(prefs)}
            {activeGoal ? ` · working on ${goalLine(activeGoal)}` : ""}
          </p>
        </div>
      </header>

      {resume && (
        <div className="dash-resume" role="status">
          <div>
            <span>REHEARSAL IN PROGRESS</span>
            <p>{resume.turns} of your turns on “{resume.topic.slice(0, 80)}” are still here.</p>
          </div>
          <div className="dash-resume-actions">
            <button className="button button-dark" type="button" onClick={resume.onResume}>Resume rehearsal</button>
            <button className="button button-light" type="button" onClick={resume.onDiscard}>Discard</button>
          </div>
        </div>
      )}

      {error && <div className="dash-notice" role="alert">{error}</div>}

      <section className="board" aria-label="Set up your next rehearsal">
        <div className="board-launch">
          <div className="board-top">
            <span>NEXT UP</span>
            <span>{activePersona.name.toUpperCase()} · {slot.label.toUpperCase()}</span>
          </div>

          <div className="board-field">
            <span className="board-label">MOTION</span>
            <div className="launch-motions" role="radiogroup" aria-label="Choose a motion">
              {suggestedMotions.map((motion, index) => {
                const active = !custom.trim() && topic === motion;
                return (
                  <button
                    key={motion}
                    role="radio"
                    aria-checked={active}
                    className={active ? "is-picked" : ""}
                    onClick={() => { setTopic(motion); setCustom(""); }}
                  >
                    <span className="motion-code">{String(index + 1).padStart(2, "0")}</span>
                    <span className="motion-title">{motion}</span>
                    {active ? <Check size={15} aria-hidden="true" /> : <ArrowUpRight size={14} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <input
              className="launch-custom"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              maxLength={240}
              placeholder="Or write your own motion…"
              aria-label="Write your own motion"
            />
          </div>

          <div className="board-row">
            <div className="board-field">
              <span className="board-label">YOUR SIDE</span>
              <div className="launch-side" role="group" aria-label="Your side">
                <button aria-pressed={position === "for"} className={position === "for" ? "is-picked" : ""} onClick={() => setPosition("for")}>FOR</button>
                <button aria-pressed={position === "against"} className={position === "against" ? "is-picked" : ""} onClick={() => setPosition("against")}>AGAINST</button>
              </div>
            </div>
            <div className="board-field">
              <span className="board-label">OPPONENT</span>
              <div className="launch-opponents" role="radiogroup" aria-label="Choose an opponent">
                {personas.map((person) => {
                  const active = persona === person.key;
                  return (
                    <button
                      key={person.key}
                      role="radio"
                      aria-checked={active}
                      className={`tone-${person.color} ${active ? "is-picked" : ""}`}
                      onClick={() => setPersona(person.key)}
                      title={`${person.name} — ${person.title}`}
                    >
                      <span className="launch-emblem" aria-hidden="true"><OpponentEmblem persona={person.key} label={`${person.name} emblem`} /></span>
                      <b>{person.name.replace("The ", "")}</b>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="board-slots">
          <div className="board-top">
            <span>SESSION SLOTS</span>
            <span>CLOCK</span>
          </div>
          <div className="slots" role="radiogroup" aria-label="Choose a session slot">
            <div className="slots-head" aria-hidden="true">
              <span>SLOT</span><span>PRESSURE</span><span>TIME</span>
            </div>
            {SLOTS.map((option) => {
              const active = option.key === slot.key;
              const pressure = difficultyFor(option.difficulty);
              return (
                <button
                  key={option.key}
                  role="radio"
                  aria-checked={active}
                  className={`slots-row ${active ? "is-picked" : ""}`}
                  onClick={() => setSlotKey(option.key)}
                >
                  <span className="slots-name">{option.label}</span>
                  <span className="slots-pressure">{pressure.label.toUpperCase()}</span>
                  <span className="slots-time">{option.minutes}<small>MIN</small></span>
                  {active && <span className="slots-marker" aria-hidden="true">DEPARTING</span>}
                </button>
              );
            })}
          </div>
          <button className="button button-primary launch-cta" type="button" onClick={takeTheFloor} disabled={!activeTopic.trim()}>
            <Play size={16} aria-hidden="true" /> Take the floor
          </button>
          <p className="slots-note">{slot.detail} Everything stays changeable in setup.</p>
        </div>
      </section>

      <section className="dash-direction" aria-label="Goal progress and practice plan">
        <div className="dash-direction-goal">
          <h2 className="dash-direction-title"><Target size={16} aria-hidden="true" /> Your goal</h2>
          {goalProgress ? (
            <>
              <div className="goal-progress-title">
                <h3>{goalProgress.title}</h3>
                <b>{goalProgress.scoreLabel}</b>
              </div>
              {goalProgress.score !== null && goalProgress.breakdown.length > 0 && (
                <div className="goal-score-chart" role="group" aria-label={`Latest rubric breakdown for ${goalProgress.title}`}>
                  {goalProgress.breakdown.map((item) => (
                    <div className="goal-score-row" key={item.label}>
                      <span>{item.label}</span>
                      <div className="goal-score-track" role="img" aria-label={`${item.label}: ${item.score.toFixed(1)} out of 5`}>
                        <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, item.score / 5))})` }} />
                      </div>
                      <b>{item.score.toFixed(1)}</b>
                    </div>
                  ))}
                </div>
              )}
              {goalProgress.activity.length > 0 && (
                <div className="goal-session-activity">
                  <div className="goal-session-heading">
                    <span>Saved session record</span>
                    <small>One mark per session</small>
                  </div>
                  <ol className="goal-session-grid" aria-label="Completed sessions in saved record">
                    {goalProgress.activity.map((session, index) => (
                      <li
                        className={session.pressure && goalProgress.pressureFocus ? "is-pressure" : ""}
                        key={`${session.at}-${index}`}
                        aria-label={`Session ${index + 1}, ${formatWhen(session.at)}${session.pressure ? ", cross-examination setting" : ""}`}
                        title={`Session ${index + 1}, ${formatWhen(session.at)}${session.pressure ? ", cross-examination" : ""}`}
                      >
                        <span aria-hidden="true" />
                      </li>
                    ))}
                  </ol>
                  {goalProgress.pressureFocus && (
                    <div className="goal-session-legend" aria-label="Session setting legend">
                      <span><i className="is-pressure" /> Cross-examination</span>
                      <span><i /> Other setting</span>
                    </div>
                  )}
                </div>
              )}
              <p className="goal-progress-detail">{goalProgress.detail}</p>
              {goalProgress.comparison && <p className="goal-progress-comparison">{goalProgress.comparison}</p>}
              {goalProgress.caveat && <p className="goal-progress-caveat">{goalProgress.caveat}</p>}
              {goalProgress.score === null && goalProgress.scoreLabel === "No score yet" && !loading && (
                <p className="goal-progress-caveat">Run a rehearsal and complete its review to start a scored comparison.</p>
              )}
            </>
          ) : (
            <div className="goal-progress-empty">
              <p>Choose a goal in Learner space to see the evidence your record can support.</p>
              <button className="dash-text-link" type="button" onClick={() => onNavigate("account")}>Set a goal <ArrowUpRight size={14} /></button>
            </div>
          )}
        </div>

        <div className="dash-direction-plan">
          <div className="dash-plan-heading">
            <div>
              <h2 className="dash-direction-title"><Sparkles size={16} aria-hidden="true" /> Current practice plan</h2>
              <p>Coach-generated from saved reviews when available and your practice preferences.</p>
            </div>
            <button className="dash-text-link" type="button" onClick={() => onNavigate("account")}>Learner space <ArrowUpRight size={14} /></button>
          </div>

          {planLoading ? (
            <p className="dash-quiet" role="status"><LoaderCircle size={14} className="spin" /> Loading your latest plan…</p>
          ) : storedPlan ? (
            <div className="dash-plan-content">
              <div className="dash-plan-meta">
                <span>{storedPlan.sessions_considered} observations considered</span>
                <span>Updated {formatWhen(storedPlan.created_at)}</span>
              </div>
              <h3>{storedPlan.plan.headline}</h3>
              <p className="dash-plan-summary">{storedPlan.plan.summary}</p>
              <div className="dash-plan-route">
                <div className="dash-plan-node">
                  <span className="dash-plan-node-mark"><Play size={13} aria-hidden="true" /></span>
                  <div>
                    <h3>Next session</h3>
                    <p>{storedPlan.plan.next_session}</p>
                  </div>
                </div>
                {storedPlan.plan.drills[0] && (
                  <div className="dash-plan-node dash-plan-drill">
                    <span className="dash-plan-node-mark"><Target size={14} aria-hidden="true" /></span>
                    <div className="dash-plan-drill-content">
                      <div className="dash-plan-drill-heading">
                        <h3>{storedPlan.plan.drills[0].title}</h3>
                        <span><Clock3 size={12} aria-hidden="true" /> {storedPlan.plan.drills[0].minutes} min</span>
                      </div>
                      {storedPlan.plan.drills[0].steps.length > 0 && (
                        <ol className="dash-drill-steps">
                          {storedPlan.plan.drills[0].steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
                        </ol>
                      )}
                      <p className="dash-drill-check"><Check size={13} aria-hidden="true" /> {storedPlan.plan.drills[0].success_check}</p>
                    </div>
                  </div>
                )}
              </div>
              {storedPlan.plan.gaps.length > 0 && <p className="dash-plan-gap">{storedPlan.plan.gaps[0]}</p>}
              {planIsBehind && <p className="dash-plan-gap">A newer saved rehearsal began after this plan was created.</p>}
              {planError && <p className="dash-plan-gap" role="alert">{planError}</p>}
            </div>
          ) : (
            <div className="dash-plan-empty">
              <p>{planError || "No saved plan yet. Build one from your available reviews and preferences."}</p>
            </div>
          )}

          <div className="dash-plan-actions">
            <button className="button button-dark" type="button" onClick={() => void refreshPlan()} disabled={planWorking || planLoading}>
              {planWorking ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />}
              {storedPlan ? "Update plan" : "Build my plan"}
            </button>
            {planWorking && <span role="status">Reviewing your saved observations…</span>}
          </div>
        </div>
      </section>

      <div className="dash-columns">
        <section className="dash-panel dash-tally" aria-labelledby="tally-heading">
          <div className="dash-panel-heading">
            <h2 id="tally-heading">The tally</h2>
            <p>Up to 30 recent rounds, 6 argument reviews, and 8 delivery takes.</p>
          </div>
          {loading ? (
            <p className="dash-quiet" role="status"><LoaderCircle size={14} className="spin" /> Reading your record…</p>
          ) : error ? (
            <p className="dash-quiet">Your tally is unavailable until your record loads.</p>
          ) : (
            <div className="tally-grid">
              <div><span>RECENT ROUNDS</span><b>{tally.sessions}</b><small>{tally.completed} completed</small></div>
              <div><span>STREAK</span><b>{tally.streak}<small className="unit">d</small></b><small>{tally.thisWeek} this week</small></div>
              <div>
                <span>RECENT ARGUMENT AVG</span>
                <b>{tally.avgArgument !== null ? tally.avgArgument.toFixed(1) : "—"}<small className="unit">/5</small></b>
                <small>{tally.avgArgument !== null ? "across up to 6 reviews" : "needs one review"}</small>
              </div>
              <div>
                <span>LATEST FILLER RATE</span>
                <b>{tally.fillerLast !== null ? tally.fillerLast.toFixed(1) : "—"}<small className="unit">/100w</small></b>
                <small>
                  {tally.fillerFirst !== null && tally.fillerLast !== null && tally.fillerFirst !== tally.fillerLast
                    ? <>
                        {tally.fillerLast < tally.fillerFirst ? <TrendingDown size={12} aria-hidden="true" /> : <TrendingUp size={12} aria-hidden="true" />}
                        {tally.fillerLast < tally.fillerFirst ? " falling" : " rising"} from {tally.fillerFirst.toFixed(1)}
                      </>
                    : tally.deliveries > 0 ? "holding steady" : "no take reviewed yet"}
                </small>
              </div>
            </div>
          )}
        </section>

        <section className="dash-panel dash-cues" aria-labelledby="cues-heading">
          <h2 id="cues-heading"><Sparkles size={15} aria-hidden="true" /> Next cues</h2>
          {loading ? (
            <p className="dash-quiet" role="status"><LoaderCircle size={14} className="spin" /> Finding your next cue…</p>
          ) : error ? (
            <p className="dash-quiet">Your practice cues will return when your record is available.</p>
          ) : cues.length === 0 ? (
            <p className="dash-quiet">Nothing to catch up on. Set up a round when you are ready.</p>
          ) : (
            <ul className="cue-list">
              {cues.map((cue) => (
                <li key={cue.key}>
                  <span className="cue-icon" aria-hidden="true">
                    {cue.icon === "record" ? <Mic size={14} /> : cue.icon === "drill" ? <Target size={14} /> : <Play size={14} />}
                  </span>
                  <div className="cue-copy"><b>{cue.title}</b><p>{cue.body}</p></div>
                  <button className="cue-action" type="button" onClick={cue.onClick}>
                    {cue.action} <ArrowRight size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="dash-panel dash-programmes" aria-labelledby="programmes-heading">
        <div className="programmes-head">
          <h2 id="programmes-heading"><Clock3 size={15} aria-hidden="true" /> In the book</h2>
          <button className="dash-space-link" type="button" onClick={() => onNavigate("account")}>
            Full archive <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </div>
        {loading ? (
          <p className="dash-quiet" role="status"><LoaderCircle size={14} className="spin" /> Loading your rehearsals…</p>
        ) : error ? (
          <p className="dash-quiet">Your rehearsal list is unavailable until your record loads.</p>
        ) : recent.length === 0 ? (
          <div className="dash-empty">
            <span className="dash-empty-mark" aria-hidden="true"><BookOpenText size={20} /></span>
            <div>
              <b>No rehearsals in the book yet.</b>
              <p>Your first round lands here with its topic, clock, and review. Take the floor above to start it.</p>
            </div>
            <button className="button button-dark" type="button" onClick={() => onNavigate("setup")}>
              Set up a rehearsal <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ul className="programme-list">
            {recent.map((record, index) => {
              const analysis = analyses[index] ?? null;
              return (
                <li key={record.id}>
                  <span className="programme-date">{formatWhen(record.started_at)}</span>
                  <span className="programme-topic">{record.topic}</span>
                  <span className="programme-meta">
                    {record.learner_position.toUpperCase()} · {record.duration_minutes} MIN · {record.persona.replace(/^./, (c) => c.toUpperCase())}
                  </span>
                  <span className={`programme-status ${record.status === "completed" ? "is-done" : "is-open"}`}>
                    {record.status === "completed" ? "CLOSED" : "OPEN"}
                  </span>
                  <span className="programme-review">
                    {analysis?.ratings ? "reviewed" : "no review"}
                  </span>
                  <button className="programme-open" type="button" onClick={() => onOpenRecord(record.id)}>
                    Open <ArrowUpRight size={13} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!loading && tally.streak > 0 && (
          <p className="programmes-foot"><Flame size={13} aria-hidden="true" /> {tally.streak}-day streak — the last rehearsal was {formatWhen(records[0].started_at)}.</p>
        )}
        {!loading && tally.streak === 0 && records.length > 0 && (
          <p className="programmes-foot"><History size={13} aria-hidden="true" /> Last rehearsal {formatWhen(records[0].started_at)}. A round today restarts the streak.</p>
        )}
      </section>
    </main>
  );
}

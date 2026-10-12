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
import {
  buildRecommendation,
  goalLine,
  loadPrefs,
  orderedStarterTopics,
  purposeLine,
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
  displayName,
  resume,
  onLaunch,
  onNavigate,
}: {
  userId: string;
  displayName: string | null;
  resume: { turns: number; topic: string; onResume: () => void; onDiscard: () => void } | null;
  onLaunch: (prefill: { topic: string; position: "for" | "against"; persona: PersonaKey; difficulty: DifficultyKey; duration: number }) => void;
  onNavigate: (view: "setup" | "account" | "present") => void;
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
          setError("Your record is not connected yet. Apply the Supabase database migration, then refresh this page.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [userId]);

  const tally = useMemo(() => buildTally(records, analyses, feedbacks), [records, analyses, feedbacks]);
  const cues = useMemo(() => buildCues(tally, prefs, onNavigate), [tally, prefs, onNavigate]);
  const slot = SLOTS.find((option) => option.key === slotKey) ?? SLOTS[1];
  const activePersona = personas.find((person) => person.key === persona) ?? personas[1];
  const activeTopic = custom.trim() || topic;
  const firstName = (displayName ?? profile?.display_name ?? "").trim().split(/\s+/)[0];
  const recent = records.slice(0, 5);

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
            {prefs.goal ? ` · working on ${goalLine(prefs.goal)}` : ""}
          </p>
        </div>
        <button className="dash-space-link" type="button" onClick={() => onNavigate("account")}>
          Learner space <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </header>

      {resume && (
        <div className="dash-resume" role="status">
          <div>
            <span>REHEARSAL IN PROGRESS</span>
            <p>{resume.turns} of your turns on “{resume.topic.slice(0, 80)}” are still here.</p>
          </div>
          <div className="dash-resume-actions">
            <button className="button button-dark" type="button" onClick={resume.onResume}>Resume rehearsal</button>
            <button className="button" type="button" onClick={resume.onDiscard}>Discard</button>
          </div>
        </div>
      )}

      {error && <div className="dash-notice" role="status">{error}</div>}

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

      <div className="dash-columns">
        <section className="dash-panel dash-tally" aria-labelledby="tally-heading">
          <h2 id="tally-heading">The tally</h2>
          {loading ? (
            <p className="dash-quiet" role="status"><LoaderCircle size={14} className="spin" /> Reading your record…</p>
          ) : (
            <div className="tally-grid">
              <div><span>REHEARSALS</span><b>{tally.sessions}</b><small>{tally.completed} completed</small></div>
              <div><span>STREAK</span><b>{tally.streak}<small className="unit">d</small></b><small>{tally.thisWeek} this week</small></div>
              <div>
                <span>ARGUMENT AVG</span>
                <b>{tally.avgArgument !== null ? tally.avgArgument.toFixed(1) : "—"}<small className="unit">/5</small></b>
                <small>{tally.avgArgument !== null ? "across your five criteria" : "needs one review"}</small>
              </div>
              <div>
                <span>FILLER RATE</span>
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
          {cues.length === 0 ? (
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
                  <button className="programme-open" type="button" onClick={() => onNavigate("account")}>
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

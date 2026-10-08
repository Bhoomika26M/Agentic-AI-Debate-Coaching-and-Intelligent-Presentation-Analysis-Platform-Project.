import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpenText, Check, Download, LoaderCircle, Printer, RotateCcw } from "lucide-react";
import { EmptyCueArt } from "../../components/CueArt";
import { MarkdownText } from "../../components/Markdown";
import { listDebateRecords, loadDebateAnalysis, loadDebateRecord, type DebateRecord, type DebateRecordTurn } from "../../services/debate-records";
import type { AnalysisReport } from "../../services/debate-api";
import { requestJudge } from "../../services/debate-api";
import { listPresentationFeedbacks } from "../../services/presentation-records";
import { loadProfile, saveProfile, type LearnerProfile } from "../../services/profiles";
import { useAuth } from "./AuthProvider";
import "./account.css";

const personaNames = {
  strategist: "The Strategist",
  skeptic: "The Skeptic",
  diplomat: "The Diplomat",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountView({ onStart, onSignOut }: { onStart: () => void; onSignOut: () => Promise<void> }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<DebateRecord[]>([]);
  const [selected, setSelected] = useState<{ session: DebateRecord; turns: DebateRecordTurn[]; analysis: AnalysisReport | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState("");
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile>({ display_name: null, experience: null, goals: null, retain_audio: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [tab, setTab] = useState<"archive" | "progress">("archive");
  const [progress, setProgress] = useState<null | {
    sessions: number; completed: number; streakDays: number; avgOverall: number | null;
    avgDims: { key: string; score: number }[]; fillerFirst: number | null; fillerLast: number | null;
    deliveries: number; weeks: { label: string; count: number }[];
  }>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listDebateRecords()
      .then((data) => { if (active) setRecords(data); })
      .catch(() => { if (active) setError("Your archive is not connected yet. Apply the Supabase database migration, then refresh this page."); })
      .finally(() => { if (active) setLoading(false); });
    if (user) {
      void loadProfile(user.id)
        .then((data) => { if (active && data) setProfile(data); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, []);

  async function openRecord(recordId: string) {
    if (loadingRecord) return;
    setLoadingRecord(recordId);
    setError("");
    try {
      const [record, analysis] = await Promise.all([loadDebateRecord(recordId), loadDebateAnalysis(recordId)]);
      setSelected({ ...record, analysis });
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
      .catch(() => setError("Your archive is not connected yet. Apply the Supabase database migration, then retry."))
      .finally(() => setLoading(false));
  }

  async function saveLearnerProfile() {
    if (!user || savingProfile) return;
    setSavingProfile(true);
    setProfileNotice("");
    try {
      await saveProfile(user.id, {
        display_name: profile.display_name?.trim() || null,
        experience: profile.experience,
        goals: profile.goals?.trim().slice(0, 500) || null,
        retain_audio: profile.retain_audio,
      });
      setProfileNotice("Profile saved.");
    } catch {
      setProfileNotice("Could not save your profile. Check your connection and try again.");
    } finally {
      setSavingProfile(false);
    }
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

  async function loadProgress() {
    if (progressLoading || progress) return;
    setProgressLoading(true);
    try {
      const sessions = await listDebateRecords(30);
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
      for (const { analysis } of withAnalysis) {
        if (!analysis?.ratings) continue;
        try {
          const verdict = await requestJudge(analysis, null);
          overalls.push(verdict.overall);
          for (const dim of verdict.dimensions) {
            dimSums[dim.key] = dimSums[dim.key] ?? { total: 0, count: 0 };
            dimSums[dim.key].total += dim.score;
            dimSums[dim.key].count += 1;
          }
        } catch {
          continue;
        }
      }
      let fillers: { first: number | null; last: number | null; deliveries: number } = { first: null, last: null, deliveries: 0 };
      try {
        const feedbacks = await listPresentationFeedbacks(20);
        const rates = feedbacks.map((f) => f.signals.filler_rate_per_100w).filter((r) => typeof r === "number");
        fillers = {
          first: rates.length > 0 ? rates[rates.length - 1] : null,
          last: rates.length > 0 ? rates[0] : null,
          deliveries: feedbacks.length,
        };
      } catch {
        /* delivery history optional */
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
      setProgress({
        sessions: sessions.length,
        completed: sessions.filter((s) => s.status === "completed").length,
        streakDays: currentStreak(days),
        avgOverall: overalls.length > 0 ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length * 10) / 10 : null,
        avgDims: Object.entries(dimSums).map(([key, v]) => ({ key, score: Math.round(v.total / v.count * 10) / 10 })),
        fillerFirst: fillers.first,
        fillerLast: fillers.last,
        deliveries: fillers.deliveries,
        weeks,
      });
    } finally {
      setProgressLoading(false);
    }
  }

  function downloadCsv() {
    const rows = [["date", "topic", "persona", "minutes", "status"]];
    for (const record of records) {
      rows.push([record.started_at, record.topic, record.persona, String(record.duration_minutes), record.status]);
    }
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "verdict-sessions.csv";
    link.click();
    URL.revokeObjectURL(url);
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
    <main className="account-page">
      <div className="account-topline">
        <button className="account-back" onClick={onStart}><ArrowLeft size={15} /> Start a rehearsal</button>
        <button className="account-signout" onClick={() => void signOut()} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
      </div>

      <section className="account-intro">
        <span className="account-seal"><BookOpenText size={21} /></span>
        <h1>Your practice,<br /><em>kept in reach.</em></h1>
        <p>{user?.email ?? "Learner account"}</p>
      </section>

      <section className="account-profile" aria-labelledby="profile-heading">
        <div className="archive-heading">
          <div><h2 id="profile-heading">Learner profile</h2><p>Goals shape your practice. Audio stays discarded unless you opt in.</p></div>
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
        <button className="button button-dark" onClick={() => void saveLearnerProfile()} disabled={savingProfile}>
          {savingProfile ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Save profile
        </button>
        {profileNotice && <div className="inline-notice" role="status">{profileNotice}</div>}
      </section>

      <div className="account-tabs no-print" role="group" aria-label="Archive or progress">
        <button type="button" className={tab === "archive" ? "active" : ""} aria-pressed={tab === "archive"} onClick={() => setTab("archive")}>Archive</button>
        <button type="button" className={tab === "progress" ? "active" : ""} aria-pressed={tab === "progress"} onClick={() => { setTab("progress"); void loadProgress(); }}>Progress</button>
      </div>

      {tab === "progress" && (
        <section className="account-progress" aria-labelledby="progress-heading">
          <div className="archive-heading">
            <div><h2 id="progress-heading">Practice trends</h2><p>Computed from your saved sessions. No new models involved.</p></div>
            <span>{progress?.sessions.toString().padStart(2, "0") ?? "--"}</span>
          </div>
          {progressLoading && <div className="archive-loading"><LoaderCircle className="spin" size={18} /> Reading your trends</div>}
          {!progressLoading && !progress && (
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
            {progress.avgDims.length > 0 && (
              <div className="progress-dims">
                {progress.avgDims.map((dim) => (
                  <div key={dim.key} className="progress-dim">
                    <span>{dim.key.toUpperCase()}</span>
                    <div className="progress-bar" role="img" aria-label={`${dim.key} averages ${dim.score} of 5`}>
                      <i style={{ width: `${Math.min(100, dim.score / 5 * 100)}%` }} />
                    </div>
                    <b>{dim.score.toFixed(1)}</b>
                  </div>
                ))}
              </div>
            )}
            <div className="progress-weeks" role="img" aria-label="Sessions per week for the last 8 weeks">
              {progress.weeks.map((week) => (
                <div key={week.label} className="progress-week">
                  <i style={{ height: `${Math.min(64, week.count * 16)}px` }} />
                  <span>{week.label}</span>
                </div>
              ))}
            </div>
            <div className="progress-actions no-print">
              <button className="button button-light" onClick={downloadCsv} disabled={progress.sessions === 0}><Download size={15} /> Download sessions CSV</button>
              <button className="button button-light" onClick={() => window.print()}><Printer size={15} /> Print report</button>
            </div>
          </>}
        </section>
      )}

      {tab === "archive" && <div className="account-layout">
        <section className="account-archive" aria-labelledby="archive-heading">
          <div className="archive-heading">
            <div><h2 id="archive-heading">Rehearsal archive</h2><p>Sessions saved to your learner account.</p></div>
            <span>{records.length.toString().padStart(2, "0")}</span>
          </div>

          {loading && <div className="archive-loading"><LoaderCircle className="spin" size={18} /> Gathering your rehearsals</div>}
          {!loading && !error && records.length === 0 && (
            <div className="archive-empty">
              <EmptyCueArt label="No saved rehearsals yet" />
              <div><b>Your record starts with the next debate.</b><p>Sign in before a rehearsal and its transcript will appear here.</p></div>
              <button className="button button-dark" onClick={onStart}>Open the prompt book <ArrowUpRight size={15} /></button>
            </div>
          )}
          {records.map((record) => (
            <button
              className={`archive-row ${selected?.session.id === record.id ? "selected" : ""}`}
              key={record.id}
              onClick={() => void openRecord(record.id)}
              disabled={loadingRecord !== ""}
              aria-current={selected?.session.id === record.id}
            >
              <span className="archive-date">{formatDate(record.started_at)}</span>
              <span className="archive-topic">{record.topic}</span>
              <span className="archive-meta">{personaNames[record.persona]} · {record.duration_minutes} min · {record.status === "completed" ? "Complete" : "In progress"}</span>
              <span className="archive-arrow">{loadingRecord === record.id ? <LoaderCircle className="spin" size={15} /> : <ArrowUpRight size={15} />}</span>
            </button>
          ))}

          {error && <div className="archive-error" role="alert">{error} <button className="button button-light" onClick={reload}>Retry</button></div>}
        </section>

        {selected && (
          <section className="record-detail" role="region" aria-label="Saved debate transcript">
            <div className="record-detail-head">
              <div><span>THE MOTION</span><h2>{selected.session.topic}</h2></div>
              <button onClick={() => setSelected(null)} aria-label="Close transcript"><ArrowLeft size={16} /></button>
            </div>
            <div className="record-detail-meta">{personaNames[selected.session.persona]} · {selected.session.learner_position === "for" ? "In favour" : "Against"} · {formatDate(selected.session.started_at)}</div>
            <div className="record-detail-turns">
              {selected.turns.map((turn) => (
                <article className={`record-turn ${turn.speaker}`} key={turn.id}>
                  <span>{turn.speaker === "learner" ? "YOUR CASE" : personaNames[selected.session.persona].toUpperCase()}</span>
                  <p><MarkdownText text={turn.content} compact /></p>
                </article>
              ))}
              {selected.turns.length === 0 && <p className="record-detail-empty">This rehearsal has no saved turns.</p>}
            </div>
            {selected.analysis && <section className="archive-analysis">
              <span>CASE REVIEW</span>
              {(selected.analysis.gaps ?? []).length > 0 && (
                <p className="archive-partial">Partial review: {(selected.analysis.gaps ?? []).join(" ")}</p>
              )}
              {selected.analysis.ratings && (
                <div>{Object.entries(selected.analysis.ratings).map(([key, rating]) => <p key={key}><b>{key.replaceAll("_", " ")}</b><strong>{rating.score}/5</strong></p>)}</div>
              )}
              <span>YOUR NEXT MOVES</span>
              {selected.analysis.next_steps.map((step, index) => <p key={`${index}-${step}`}>{step}</p>)}
            </section>}
          </section>
        )}
      </div>}

      <div className="account-private-note"><RotateCcw size={14} /> Only you can read the sessions saved in this account.</div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpenText, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { EmptyCueArt } from "../../components/CueArt";
import { MarkdownText } from "../../components/Markdown";
import { listDebateRecords, loadDebateAnalysis, loadDebateRecord, type DebateRecord, type DebateRecordTurn } from "../../services/debate-records";
import { loadProfile, saveProfile, type LearnerProfile } from "../../services/profiles";
import type { AnalysisReport } from "../../services/debate-api";
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

      <div className="account-layout">
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
              <div>{Object.entries(selected.analysis.ratings).map(([key, rating]) => <p key={key}><b>{key.replaceAll("_", " ")}</b><strong>{rating.score}/5</strong></p>)}</div>
              <span>YOUR NEXT MOVES</span>
              {selected.analysis.next_steps.map((step, index) => <p key={`${index}-${step}`}>{step}</p>)}
            </section>}
          </section>
        )}
      </div>

      <div className="account-private-note"><RotateCcw size={14} /> Only you can read the sessions saved in this account.</div>
    </main>
  );
}

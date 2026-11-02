import { useEffect, useState } from "react";
import { ArrowRight, Settings2 } from "lucide-react";
import { listDebateRecords, type DebateRecord } from "../../services/debate-records";
import "./practice-home.css";

export type PracticeNavItem = "debate" | "analysis" | "voice" | "settings";

export function PracticeHeader({
  active,
  onHome,
  onDebate,
  onAnalysis,
  onVoice,
  onSettings,
}: {
  active: PracticeNavItem;
  onHome: () => void;
  onDebate: () => void;
  onAnalysis: () => void;
  onVoice: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="programme-header">
      <div className="programme-header-inner">
        <button className="programme-brand" type="button" onClick={onHome} aria-label="Verdict home">
          Verdict<span aria-hidden="true">.</span>
        </button>
        <nav className="programme-nav" aria-label="Main navigation">
          <button type="button" className={active === "debate" ? "active" : ""} aria-current={active === "debate" ? "page" : undefined} onClick={onDebate}>Debate</button>
          <button type="button" className={active === "analysis" ? "active" : ""} aria-current={active === "analysis" ? "page" : undefined} onClick={onAnalysis}>Analysis</button>
          <button type="button" className={active === "voice" ? "active" : ""} aria-current={active === "voice" ? "page" : undefined} onClick={onVoice}>Voice Debate</button>
        </nav>
        <button className={`programme-settings${active === "settings" ? " active" : ""}`} type="button" onClick={onSettings} aria-current={active === "settings" ? "page" : undefined}>
          <Settings2 size={18} strokeWidth={1.8} /> <span>Settings</span>
        </button>
      </div>
    </header>
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export function PracticeHome({
  userId,
  onDebate,
  onAnalysis,
  onVoice,
  onArchive,
  onOpenRecord,
}: {
  userId: string | null;
  onDebate: () => void;
  onAnalysis: () => void;
  onVoice: () => void;
  onArchive: () => void;
  onOpenRecord: (recordId: string) => void;
}) {
  const [records, setRecords] = useState<DebateRecord[]>([]);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setRecords([]);
      return () => { active = false; };
    }
    void listDebateRecords(3)
      .then((data) => { if (active) setRecords(data.slice(0, 3)); })
      .catch(() => { if (active) setRecords([]); });
    return () => { active = false; };
  }, [userId]);

  return (
    <main className="programme-home">
      <section className="programme-intro" aria-labelledby="programme-title">
        <h1 id="programme-title">Make your case<span className="programme-title-mark" aria-hidden="true" /></h1>
        <div className="programme-promise">Real debate practice<br />for real progress.</div>
      </section>

      <div className="fixture-line" aria-label="Practice modes and sample motion">
        <span className="fixture-current">Practice session</span>
        <span className="fixture-pair"><small>Mode</small><b>1 of 3</b><strong>Debate</strong></span>
        <span className="fixture-pair fixture-next"><small>Next</small><span>Set up your debate or start voice practice</span></span>
        <span className="fixture-sample"><small>Sample motion</small><span>Should public transit be free for everyone?</span></span>
      </div>

      <section className="programme-main" aria-label="Choose a practice mode">
        <div className="programme-modes">
          <article className="programme-mode">
            <span className="programme-index" aria-hidden="true">01</span>
            <div className="programme-mode-copy"><h2>Debate</h2><p>Practice a full debate with structured turns and an AI opponent.</p></div>
            <button className="programme-action is-primary" type="button" onClick={onDebate}>Set up debate <ArrowRight size={19} aria-hidden="true" /></button>
          </article>
          <article className="programme-mode">
            <span className="programme-index" aria-hidden="true">02</span>
            <div className="programme-mode-copy"><h2>Analysis</h2><p>Get detailed feedback on your arguments, structure and delivery.</p></div>
            <button className="programme-action" type="button" onClick={onAnalysis}>Open analysis <ArrowRight size={19} aria-hidden="true" /></button>
          </article>
          <article className="programme-mode">
            <span className="programme-index" aria-hidden="true">03</span>
            <div className="programme-mode-copy"><h2>Voice debate</h2><p>Speak your arguments out loud and debate in real time with an AI opponent.</p></div>
            <button className="programme-action" type="button" onClick={onVoice}>Start voice debate <ArrowRight size={19} aria-hidden="true" /></button>
          </article>
        </div>

        <article className="motion-preview" aria-labelledby="motion-title">
          <span className="programme-label">Sample motion</span>
          <h2 id="motion-title">Should public transit be free for everyone?</h2>
          <p className="motion-summary">Explore arguments for and against free public transit, and practice how you would defend your position in a real debate.</p>
          <div className="motion-positions">
            <div>
              <span className="programme-label">Your position</span>
              <h3>Affirmative</h3>
              <p>Argue that public transit should be free for everyone.</p>
            </div>
            <div>
              <span className="programme-label">Opponent preview</span>
              <h3>AI opponent</h3>
              <p>Expect counterarguments on cost, fairness and feasibility.</p>
            </div>
          </div>
          <div className="motion-actions">
            <button className="motion-debate" type="button" onClick={onDebate}>Set up debate <ArrowRight size={17} aria-hidden="true" /></button>
            <button className="motion-voice" type="button" onClick={onVoice}>Start voice debate <ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </article>
      </section>

      <section className="programme-recent" aria-labelledby="recent-title">
        <div className="programme-recent-head">
          <h2 id="recent-title">Recent work</h2>
          <button type="button" onClick={onArchive}>View all <ArrowRight size={16} aria-hidden="true" /></button>
        </div>
        {records.length > 0 ? (
          <div className="programme-recent-list">
            {records.map((record) => (
              <button className="programme-recent-row" type="button" key={record.id} onClick={() => onOpenRecord(record.id)}>
                <span className={`recent-status ${record.status}`}>{record.status === "completed" ? "Reviewed" : "In progress"}</span>
                <span className="recent-topic">{record.topic}</span>
                <time dateTime={record.started_at}>{dateLabel(record.started_at)}</time>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : (
          <p className="programme-empty">Your reviewed debates will appear here.<span>Complete a debate and get feedback to see your history here.</span></p>
        )}
      </section>
    </main>
  );
}

import { useEffect, useState } from "react";
import { ArrowRight, Settings2 } from "lucide-react";
import { listDebateRecords, type DebateRecord } from "../../services/debate-records";
import { cacheLearningPlan, clearCachedLearningPlan, listLearningPlans, readCachedLearningPlan, type StoredPlan } from "../../services/plan-records";
import "./practice-home.css";

export type PracticeNavItem = "debate" | "analysis" | "plan" | "settings";

export function PracticeHeader({
  active,
  onHome,
  onDebate,
  onAnalysis,
  onPlan,
  onSettings,
}: {
  active: PracticeNavItem;
  onHome: () => void;
  onDebate: () => void;
  onAnalysis: () => void;
  onPlan: () => void;
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
          <button type="button" className={active === "plan" ? "active" : ""} aria-current={active === "plan" ? "page" : undefined} onClick={onPlan}>My plan</button>
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
  authLoading,
  onDebate,
  onAnalysis,
  onPlan,
  onArchive,
  onOpenRecord,
}: {
  userId: string | null;
  authLoading: boolean;
  onDebate: () => void;
  onAnalysis: () => void;
  onPlan: () => void;
  onArchive: () => void;
  onOpenRecord: (recordId: string) => void;
}) {
  const [records, setRecords] = useState<DebateRecord[]>([]);
  const [storedPlan, setStoredPlan] = useState<StoredPlan | null>(() => userId ? readCachedLearningPlan(userId) : null);
  const [planOwnerId, setPlanOwnerId] = useState(userId);
  const [planLoading, setPlanLoading] = useState(true);
  const plan = userId
    ? planOwnerId === userId ? storedPlan : readCachedLearningPlan(userId)
    : null;
  const isPlanLoading = authLoading || Boolean(userId && planOwnerId !== userId) || planLoading;

  useEffect(() => {
    let active = true;
    if (!userId) {
      setRecords([]);
      setStoredPlan(null);
      setPlanOwnerId(null);
      setPlanLoading(authLoading);
      return () => { active = false; };
    }
    const cached = readCachedLearningPlan(userId);
    setPlanOwnerId(userId);
    setStoredPlan(cached);
    setPlanLoading(!cached);
    void listDebateRecords(3)
      .then((data) => { if (active) setRecords(data.slice(0, 3)); })
      .catch(() => { if (active) setRecords([]); });
    void listLearningPlans(1)
      .then((plans) => {
        if (!active) return;
        const latest = plans[0] ?? null;
        if (latest) {
          cacheLearningPlan(userId, latest);
          setStoredPlan(latest);
        }
        else {
          clearCachedLearningPlan(userId);
          setStoredPlan(null);
        }
      })
      .catch(() => {
        /* A saved local copy keeps the home useful while the network is unavailable. */
      })
      .finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, [userId, authLoading]);

  return (
    <main className="programme-home">
      <section className="programme-intro" aria-labelledby="programme-title">
        <h1 id="programme-title">Make your case<span className="programme-title-mark" aria-hidden="true" /></h1>
        <div className="programme-promise">Real debate practice<br />for real progress.</div>
      </section>

      <div className="fixture-line" aria-label="Your practice snapshot">
        <span className="fixture-current">Practice desk</span>
        <span className="fixture-pair"><small>Recent</small><b>{records.length.toString().padStart(2, "0")}</b><strong>{records.length === 1 ? "round" : "rounds"}</strong></span>
        <span className="fixture-pair fixture-next"><small>Focus</small>{plan ? <span>{plan.plan.headline}</span> : isPlanLoading ? <span className="plan-loading-line" aria-hidden="true" /> : <span>Choose a motion and make your first case.</span>}</span>
        <span className="fixture-sample"><small>Last round</small><span>{records[0]?.topic ?? "No saved rounds yet"}</span></span>
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
            <div className="programme-mode-copy"><h2>Your plan</h2>{plan ? <p>{plan.plan.headline}</p> : isPlanLoading ? <span className="plan-loading-line plan-loading-line-short" aria-hidden="true" /> : <p>Turn your goals and reviews into a focused next step.</p>}</div>
            <button className="programme-action" type="button" onClick={onPlan}>Open my plan <ArrowRight size={19} aria-hidden="true" /></button>
          </article>
        </div>

        <article className="motion-preview" aria-labelledby="motion-title" aria-busy={isPlanLoading && !plan}>
          {plan ? <>
            <h2 id="motion-title">{plan.plan.headline}</h2>
            <p className="motion-summary">{plan.plan.next_session}</p>
            <p className="motion-plan-evidence">{plan.plan.summary}</p>
          </> : isPlanLoading ? (
            <div id="motion-title" className="motion-plan-skeleton" role="status" aria-label="Loading your saved practice plan">
              <span className="visually-hidden">Loading your saved practice plan</span>
              <i className="skeleton-title" /><i /><i />
            </div>
          ) : <>
            <h2 id="motion-title">{records[0] ? "Keep your case moving." : "Start with one clear claim."}</h2>
            <p className="motion-summary">{records[0] ? `Your latest round was on “${records[0].topic}”. Set up another motion to put that work into practice.` : "Choose your motion, side, opponent and pace before you enter the debate. Your review will give this page a personal starting point."}</p>
          </>}
          <div className="motion-positions">
            <div>
              <span className="programme-label">First drill</span>
              {plan ? <><h3>{plan.plan.drills[0]?.title ?? "Build your record"}</h3><p>{plan.plan.drills[0] ? `${plan.plan.drills[0].minutes} minute practice from your saved plan.` : "Complete a debate and review to surface a useful next step."}</p></> : isPlanLoading ? <div className="drill-plan-skeleton" aria-hidden="true"><i /><i /></div> : <><h3>Build your record</h3><p>Complete a debate and review to surface a useful next step.</p></>}
            </div>
            <div>
              <span className="programme-label">Recent work</span>
              <h3>{records.length ? `${records.length} recent ${records.length === 1 ? "round" : "rounds"}` : "Ready when you are"}</h3>
              <p>{records[0] ? `${records[0].status === "completed" ? "Last reviewed" : "In progress"} · ${dateLabel(records[0].started_at)}` : "Your sessions and reviews will collect here."}</p>
            </div>
          </div>
          <div className="motion-actions">
            <button className="motion-debate" type="button" onClick={onDebate}>Set up debate <ArrowRight size={17} aria-hidden="true" /></button>
            <button className="motion-plan" type="button" onClick={onPlan}>View my plan <ArrowRight size={17} aria-hidden="true" /></button>
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

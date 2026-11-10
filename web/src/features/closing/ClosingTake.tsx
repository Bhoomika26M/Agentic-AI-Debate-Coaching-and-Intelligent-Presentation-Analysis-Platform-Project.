import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpenText, Check, Mic } from "lucide-react";
import { PresentationRoom } from "../presentation/PresentationRoom";
import type { DeliveryTake } from "../../services/presentation-records";
import "./closing.css";

type Stage = "offer" | "record" | "decline";

const LEDGER = [
  { label: "ARGUMENT QUALITY", weight: "30%" },
  { label: "EVIDENCE & SUPPORT", weight: "20%" },
  { label: "LOGIC", weight: "20%" },
  { label: "REBUTTAL", weight: "15%" },
  { label: "DELIVERY", weight: "15%", affected: true },
];

export type ClosingTakeProps = {
  topic: string;
  onContinue: (take: DeliveryTake | null) => void;
};

/**
 * The choice between the round and the scorecard.
 *
 * A closing take is the only input that scores Delivery, so declining has to be
 * as explicit as accepting: both cards state what happens to the weighted
 * score, and the skip path repeats the consequence before it is taken.
 *
 * `embedded` renders the same decision inside the voice room sheet, where the
 * page header and overline would be out of place.
 */
export function ClosingTakePanel({
  topic,
  onContinue,
  embedded = false,
}: ClosingTakeProps & { embedded?: boolean }) {
  const [stage, setStage] = useState<Stage>("offer");
  const [take, setTake] = useState<DeliveryTake | null>(null);
  const [recording, setRecording] = useState(false);
  const declineRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (stage === "decline") declineRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (stage === "record") return;
    setTake(null);
    setRecording(false);
  }, [stage]);

  function continueToVerdict() {
    if (!take || recording) return;
    onContinue(take);
  }

  return (
    <div className={`closing-take${embedded ? " is-embedded" : ""}`}>
      {embedded && (
        <div className="closing-embedded-top">
          <span className="verdict-seal"><BookOpenText size={20} /></span>
          <span>THE ROUND IS OVER.</span>
          <span className="closing-embedded-context">BEFORE THE SCORECARD</span>
        </div>
      )}

      <div className="closing-hero">
        <div className="closing-hero-copy">
          <span className="closing-act">{embedded ? "YOUR CLOSING STATEMENT" : "ACT V / CLOSING STATEMENT"}</span>
          <h1 id="closing-title">One last word<br /><span>closes the round.</span></h1>
          <p className="verdict-summary">
            The debate has ended, but the scorecard is not written yet. Add a closing take — up to three
            minutes in your own voice — or leave it out knowing exactly which score changes.
          </p>
        </div>

        <aside className="closing-ledger" aria-label="The five weighted scores">
          <span className="closing-ledger-label">THE SCORECARD</span>
          <ul>
            {LEDGER.map((row) => (
              <li key={row.label} className={row.affected ? "is-affected" : ""}>
                <span>{row.label}</span>
                <b>{row.weight}</b>
              </li>
            ))}
          </ul>
          <p className="closing-ledger-note">
            Delivery is read from a closing take only. The other four come from the transcript.
          </p>
        </aside>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          {stage === "offer" && (
            <div className="closing-choice">
              <div className="closing-choice-head">
                <h2>Two ways to finish.</h2>
                <p>Both are honest. Only one scores Delivery.</p>
              </div>

              <div className="closing-options">
                <article className="closing-option is-primary">
                  <span className="closing-option-index">01 / RECORD</span>
                  <h3>Record a closing take</h3>
                  <p>
                    Sum up the round in your own voice. Delivery is scored from this take, and the closing
                    words join the argument review.
                  </p>
                  <ul>
                    <li><Check size={13} aria-hidden="true" /> Delivery scored — 15% of the weighted total</li>
                    <li><Check size={13} aria-hidden="true" /> All five dimensions on the scorecard</li>
                  </ul>
                  <button className="button button-dark" type="button" onClick={() => setStage("record")}>
                    <Mic size={15} /> Record a closing take
                  </button>
                </article>

                <article className="closing-option">
                  <span className="closing-option-index">02 / SKIP</span>
                  <h3>Go straight to the verdict</h3>
                  <p>
                    Delivery stays unscored. The remaining dimensions are rescaled to 100%, so this
                    weighted score is not comparable to a round that recorded one.
                  </p>
                  <ul>
                    <li><span className="closing-dash" aria-hidden="true">—</span> One of five scores is missing</li>
                    <li><span className="closing-dash" aria-hidden="true">—</span> The review reads the transcript only</li>
                  </ul>
                  <button className="button button-light" type="button" onClick={() => setStage("decline")}>
                    Skip the take
                  </button>
                </article>
              </div>

              <p className="closing-footnote">
                Audio is discarded after the review unless you choose to keep it. A take can also be added
                from the verdict later, and the weighted score is recalculated then.
              </p>
            </div>
          )}

          {stage === "decline" && (
            <section
              className="closing-decline"
              ref={declineRef}
              tabIndex={-1}
              aria-labelledby="closing-decline-title"
            >
              <span className="closing-decline-label">IF YOU SKIP</span>
              <h2 id="closing-decline-title">Delivery stays unscored.</h2>
              <p>
                Delivery is one of your five scores — <b>15% of the weighted total</b>. Without a closing
                take the other four are rescaled to 100%, so the number you see will differ from a round
                that recorded one. The argument review also reads the closing statement, so it will see the
                debate transcript only.
              </p>
              <div className="closing-take-actions">
                <button className="button closing-skip" type="button" onClick={() => onContinue(null)}>
                  Skip — see my scores
                </button>
                <button className="button button-light" type="button" onClick={() => setStage("offer")}>
                  Record instead
                </button>
              </div>
              <p className="closing-footnote">
                You can still add a closing take from the verdict later; the weighted score is recalculated
                when you do.
              </p>
            </section>
          )}

          {stage === "record" && (
            <section className="closing-booth" aria-labelledby="closing-booth-title">
              <div className="closing-booth-head">
                <div>
                  <span className="closing-booth-label">TAKE 01 / UP TO 3:00</span>
                  <h2 id="closing-booth-title">Deliver the closing statement.</h2>
                  <p>
                    Wrap the round: the clash, your strongest ground, and what should decide it. Record your
                    take, then continue — delivery is reviewed with your verdict and folded into the final
                    weighted score.
                  </p>
                </div>
                <span className={`closing-booth-state${take ? " is-ready" : ""}`}>
                  {recording ? "RECORDING" : take ? "TAKE READY" : "NOT RECORDED"}
                </span>
              </div>

              <div className="closing-booth-body">
                <Suspense fallback={<p className="closing-booth-loading" role="status">Loading the delivery coach…</p>}>
                  <PresentationRoom
                    compact
                    recordOnly
                    topic={topic}
                    onTake={setTake}
                    onRecordingChange={setRecording}
                  />
                </Suspense>
                <aside className="closing-booth-aside">
                  <span>WHAT A CLOSING DOES</span>
                  <ol>
                    <li>Name the clash the round came down to.</li>
                    <li>Give your strongest ground in one clear claim.</li>
                    <li>Say what should decide it — and why.</li>
                  </ol>
                  <p>Aim for 45–90 seconds. The cap is three minutes, and audio is discarded after review unless you keep it.</p>
                </aside>
              </div>

              <div className="closing-booth-foot">
                <button className="button button-dark" type="button" onClick={continueToVerdict} disabled={!take || recording}>
                  Continue to the verdict <ArrowRight size={16} />
                </button>
                <button className="text-link" type="button" onClick={() => setStage("offer")}>
                  Back to the choice
                </button>
                {(!take || recording) && (
                  <p className="closing-booth-note" role="status">
                    {recording ? "Stop the recording before you continue." : "Record or upload a take to continue, or go back to skip it."}
                  </p>
                )}
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ClosingTake(props: ClosingTakeProps) {
  return (
    <>
      <header className="verdict-header closing-header">
        <span className="closing-brand" aria-label="Verdict">
          <span className="brand-mark"><BookOpenText size={16} /></span>
          <span>VERDICT<span className="brand-period">.</span></span>
        </span>
        <span className="verdict-header-title">CLOSING TAKE <i aria-hidden="true">—</i> BEFORE THE VERDICT</span>
      </header>

      <section className="verdict-content closing-take-content" aria-labelledby="closing-title">
        <div className="verdict-overline">
          <span className="verdict-seal"><BookOpenText size={22} /></span>
          <span>THE BOOK IS ALMOST CLOSED.</span>
          <span className="verdict-overline-context">AFTER THE ROUND / BEFORE THE REVIEW</span>
        </div>
        <ClosingTakePanel {...props} />
      </section>
    </>
  );
}

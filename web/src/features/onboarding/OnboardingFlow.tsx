import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { difficultyFor, personaFor } from "../debate-catalog";
import { loadProfile, saveProfile, type LearnerProfile } from "../../services/profiles";
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  PURPOSE_OPTIONS,
  buildRecommendation,
  emptyPrefs,
  markOnboardingDone,
  prefsToProfileFields,
  savePrefs,
  stampPrefs,
  type FocusKey,
  type GoalKey,
  type LearnerPrefs,
  type PurposeKey,
} from "../../services/learner-prefs";
import "./onboarding.css";

export type OnboardingResult = {
  profile: LearnerProfile;
  prefs: LearnerPrefs;
  destination: "home" | "delivery";
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const actMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: EASE },
};

const ACTS = [
  { code: "I", name: "The room" },
  { code: "II", name: "Who you are" },
  { code: "III", name: "Why you are here" },
  { code: "IV", name: "Your room" },
];

const EXPERIENCE_OPTIONS = [
  { value: "new", label: "New", detail: "Learning the ropes" },
  { value: "developing", label: "Developing", detail: "Winning some rounds" },
  { value: "confident", label: "Confident", detail: "Ready for hard questions" },
] as const;

export function OnboardingFlow({
  userId,
  onComplete,
  onSkip,
}: {
  userId: string;
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}) {
  const [act, setAct] = useState<1 | 2 | 3 | 4>(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [experience, setExperience] = useState<NonNullable<LearnerProfile["experience"]>>("developing");
  const [experienceTouched, setExperienceTouched] = useState(false);
  const [retainAudio, setRetainAudio] = useState(false);
  const [prefs, setPrefs] = useState<LearnerPrefs>(emptyPrefs);
  const [goalNote, setGoalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    void loadProfile(userId)
      .then((data) => {
        if (!active || !data) return;
        if (data.display_name) setDisplayName(data.display_name);
        if (data.experience) {
          setExperience(data.experience);
          setExperienceTouched(true);
        }
        if (data.goals) setGoalNote(data.goals);
        setRetainAudio(data.retain_audio);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [act]);

  function pickPurpose(key: PurposeKey) {
    setPrefs((current) => ({ ...current, purpose: current.purpose === key ? null : key }));
  }

  function pickGoal(key: GoalKey) {
    setPrefs((current) => ({ ...current, goal: current.goal === key ? null : key }));
  }

  function toggleFocus(key: FocusKey) {
    setPrefs((current) => ({
      ...current,
      focus: current.focus.includes(key)
        ? current.focus.filter((value) => value !== key)
        : [...current.focus, key].slice(0, 3),
    }));
  }

  function readProfile(stamped: LearnerPrefs): LearnerProfile {
    return {
      display_name: displayName.trim().slice(0, 60) || null,
      experience,
      goals: goalNote.trim().slice(0, 500) || null,
      retain_audio: retainAudio,
      ...prefsToProfileFields(stamped),
    };
  }

  function commitAnswers(): LearnerPrefs {
    const stamped = stampPrefs({ ...prefs, experience });
    savePrefs(userId, stamped);
    markOnboardingDone(userId);
    return stamped;
  }

  async function saveAndContinue() {
    if (saving) return;
    const stamped = commitAnswers();
    setPrefs(stamped);
    setSaving(true);
    setError("");
    setSaveFailed(false);
    try {
      await saveProfile(userId, readProfile(stamped));
      setAct(4);
    } catch {
      setError("Could not save to your account. Check your connection and try again — or continue and edit it later in Learner space.");
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function continueWithoutSaving() {
    setSaveFailed(false);
    setError("");
    setAct(4);
  }

  function finish(destination: "home" | "delivery") {
    const stamped = commitAnswers();
    onComplete({ profile: readProfile(stamped), prefs: stamped, destination });
  }

  function skip() {
    markOnboardingDone(userId);
    onSkip();
  }

  if (loadingProfile) {
    return (
      <main className="sheet-page" aria-labelledby="onboarding-loading">
        <div className="sheet-frame" role="status">
          <h1 id="onboarding-loading" tabIndex={-1} ref={headingRef} className="sheet-loading">Setting up your room…</h1>
          <p className="sheet-lede"><LoaderCircle size={15} className="spin" /> Reading your learner profile.</p>
        </div>
      </main>
    );
  }

  const recommendation = buildRecommendation(experience, prefs);
  const opponent = personaFor(recommendation.persona);
  const pressure = difficultyFor(recommendation.difficulty);
  const focusLabels = prefs.focus
    .map((key) => FOCUS_OPTIONS.find((option) => option.key === key)?.label)
    .filter(Boolean)
    .join(" · ");
  const firstName = displayName.trim().split(/\s+/)[0] || "";

  return (
    <main className="sheet-page" aria-labelledby="onboarding-heading">
      <div className="sheet-frame">
        <div className="sheet-rule">
          <span>VERDICT · SETUP SHEET</span>
          <span>ACT {ACTS[act - 1].code} OF IV</span>
        </div>

        <div className="sheet-body">
          <nav className="act-rail" aria-label="Setup progress">
            <ol>
              {ACTS.map((item, index) => {
                const step = index + 1;
                const state = step < act ? "is-done" : step === act ? "is-current" : "";
                return (
                  <li key={item.code} className={state} aria-current={step === act ? "step" : undefined}>
                    <span className="act-code">{step < act ? <Check size={13} aria-hidden="true" /> : item.code}</span>
                    <span className="act-name">{item.name}</span>
                  </li>
                );
              })}
            </ol>
            <p className="act-note"><LockKeyhole size={13} aria-hidden="true" /> Skippable at every act. Nothing here is public.</p>
          </nav>

          <div className="sheet-stage">
            <>
              {act === 1 && (
                <motion.section className="sheet-act" key="act-1" {...actMotion}>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={headingRef}>Set your room.</h1>
                  <p className="sheet-lede">
                    Verdict is a rehearsal room: name a motion, take a side, argue against a live AI
                    opponent in your own words, then read a plain-language review of what you argued
                    and how you said it.
                  </p>
                  <ul className="sheet-points">
                    <li><b>Thirty seconds of setup.</b><span>It shapes your first opponent, pressure, and practice plan.</span></li>
                    <li><b>Your own words only.</b><span>Your opponent answers the point you just made, not a script.</span></li>
                    <li><b>Everything stays editable.</b><span>Change any answer later in Learner space.</span></li>
                  </ul>
                  <div className="sheet-actions">
                    <button className="button button-primary" type="button" onClick={() => setAct(2)} autoFocus>
                      Begin setup <ArrowRight size={16} />
                    </button>
                    <button className="sheet-skip" type="button" onClick={skip}>Skip for now — explore on my own</button>
                  </div>
                </motion.section>
              )}

              {act === 2 && (
                <motion.section className="sheet-act" key="act-2" {...actMotion}>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={headingRef}>First, who is rehearsing?</h1>
                  <p className="sheet-lede">Two answers, and your first opponent and pressure are already picked.</p>

                  <div className="sheet-field">
                    <label htmlFor="onboarding-name">What should we call you? <em>optional</em></label>
                    <input
                      id="onboarding-name"
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value.slice(0, 60))}
                      maxLength={60}
                      placeholder="A name for the room"
                      autoComplete="nickname"
                      autoFocus
                    />
                    <p className="sheet-why">Used as a greeting and in your archive. Nothing public.</p>
                  </div>

                  <fieldset className="sheet-field">
                    <legend>Speaking experience {experienceTouched ? "" : <em>— pick the closest fit</em>}</legend>
                    <div className="sheet-segment" role="radiogroup" aria-label="Speaking experience">
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={experience === option.value}
                          className={experience === option.value ? "is-picked" : ""}
                          onClick={() => {
                            setExperience(option.value);
                            setExperienceTouched(true);
                          }}
                        >
                          <b>{option.label}</b><small>{option.detail}</small>
                        </button>
                      ))}
                    </div>
                    <p className="sheet-why">Sets your starting pressure and opponent. Developing is a fine default.</p>
                  </fieldset>

                  <div className="sheet-actions sheet-actions-row">
                    <button className="sheet-back" type="button" onClick={() => setAct(1)}><ArrowLeft size={15} /> Back</button>
                    <button className="button button-dark" type="button" onClick={() => setAct(3)}>
                      Next: why you are here <ArrowRight size={16} />
                    </button>
                  </div>
                  <button className="sheet-skip" type="button" onClick={skip}>Skip for now — explore on my own</button>
                </motion.section>
              )}

              {act === 3 && (
                <motion.section className="sheet-act" key="act-3" {...actMotion}>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={headingRef}>What are you here for?</h1>
                  <p className="sheet-lede">This sets your practice cues, your suggested motions, and the focus of your plan.</p>

                  <fieldset className="sheet-field">
                    <legend>Where will you use it? <em>optional</em></legend>
                    <div className="sheet-chips">
                      {PURPOSE_OPTIONS.map((option) => {
                        const active = prefs.purpose === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={active}
                            className={active ? "is-picked" : ""}
                            onClick={() => pickPurpose(option.key)}
                          >
                            {active && <Check size={14} aria-hidden="true" />}
                            <b>{option.label}</b><small>{option.detail}</small>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="sheet-field">
                    <legend>What would count as progress? <em>optional — pick one</em></legend>
                    <div className="sheet-chips">
                      {GOAL_OPTIONS.map((option) => {
                        const active = prefs.goal === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={active ? "is-picked" : ""}
                            onClick={() => pickGoal(option.key)}
                          >
                            {active && <Check size={14} aria-hidden="true" />}
                            <b>{option.label}</b><small>{option.detail}</small>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset className="sheet-field">
                    <legend>What do you want from practice? <em>optional — pick any</em></legend>
                    <div className="sheet-chips">
                      {FOCUS_OPTIONS.map((option) => {
                        const active = prefs.focus.includes(option.key);
                        return (
                          <button
                            key={option.key}
                            type="button"
                            aria-pressed={active}
                            className={active ? "is-picked" : ""}
                            onClick={() => toggleFocus(option.key)}
                          >
                            {active && <Check size={14} aria-hidden="true" />}
                            <b>{option.label}</b><small>{option.detail}</small>
                          </button>
                        );
                      })}
                    </div>
                    <p className="sheet-why">Highlights the right next step after your first review: debate, delivery drills, or both.</p>
                  </fieldset>

                  <div className="sheet-field">
                    <label htmlFor="onboarding-goal-note">Your end goal, in one line <em>optional</em></label>
                    <textarea
                      id="onboarding-goal-note"
                      value={goalNote}
                      onChange={(event) => setGoalNote(event.target.value.slice(0, 500))}
                      maxLength={500}
                      rows={2}
                      placeholder="Example: captain the school team by next term."
                    />
                    <p className="sheet-why">Grounds your practice plan in what you actually want.</p>
                  </div>

                  {error && <div className="sheet-error" role="alert">{error}</div>}

                  <div className="sheet-actions sheet-actions-row">
                    <button className="sheet-back" type="button" onClick={() => setAct(2)} disabled={saving}>
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button className="button button-primary" type="button" onClick={() => void saveAndContinue()} disabled={saving}>
                      {saving ? <LoaderCircle size={15} className="spin" /> : null}
                      {saving ? "Saving…" : "Save and build my room"} {!saving && <ArrowRight size={16} />}
                    </button>
                  </div>
                  {saveFailed && (
                    <button className="sheet-skip" type="button" onClick={continueWithoutSaving}>
                      Continue without saving — answers stay for this session
                    </button>
                  )}
                  <button className="sheet-skip" type="button" onClick={skip}>Skip for now — explore on my own</button>
                </motion.section>
              )}

              {act === 4 && (
                <motion.section className="sheet-act" key="act-4" {...actMotion}>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={headingRef}>
                    {firstName ? `Your room is set, ${firstName}.` : "Your room is set."}
                  </h1>
                  <p className="sheet-lede">{recommendation.reason}</p>

                  <div className="sheet-recap" role="list" aria-label="Your tailored starting point">
                    <div role="listitem"><span>OPPONENT</span><b>{opponent.name}</b><small>{opponent.title}</small></div>
                    <div role="listitem"><span>PRESSURE</span><b>{pressure.label}</b><small>{pressure.detail}</small></div>
                    <div role="listitem">
                      <span>CLOCK</span><b>{recommendation.duration} min</b>
                      <small>{experience === "new" ? "Short rounds while you find your feet" : "Full rounds with room to recover"}</small>
                    </div>
                  </div>

                  <div className="sheet-firstcue">
                    <span>FIRST CUE</span>
                    <p>
                      {prefs.purpose === "competition"
                        ? "Open on a motion you would meet in a real round, and hold your ground for the full clock."
                        : prefs.focus.includes("delivery")
                          ? "Run one round, then record a closing take so your review can read your pace and pauses."
                          : "Run one round, then start the review so your first scores are on the board."}
                    </p>
                    {focusLabels && <small>Focus: {focusLabels}</small>}
                  </div>

                  <div className="sheet-actions">
                    <button className="button button-primary" type="button" onClick={() => finish("home")} autoFocus>
                      Open my dashboard <ArrowRight size={16} />
                    </button>
                    {prefs.focus.includes("delivery") && (
                      <button className="button button-light" type="button" onClick={() => finish("delivery")}>
                        Practice a take solo instead
                      </button>
                    )}
                    <button className="sheet-skip" type="button" onClick={() => setAct(3)}><ArrowLeft size={14} /> Edit my answers</button>
                    <button className="sheet-skip" type="button" onClick={skip}>Start exploring on my own</button>
                  </div>
                </motion.section>
              )}
            </>
          </div>
        </div>
      </div>
    </main>
  );
}

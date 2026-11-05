import type { DifficultyKey, PersonaKey } from "../features/debate-catalog";
import type { LearnerProfile } from "./profiles";

export type FocusKey = "argument" | "delivery" | "confidence";
export type PurposeKey = "school" | "university" | "interview" | "confidence" | "competition";
export type GoalKey = "structure" | "evidence" | "nerves" | "hostile" | "win";

export type LearnerPrefs = {
  focus: FocusKey[];
  purpose: PurposeKey | null;
  goal: GoalKey | null;
  experience: LearnerProfile["experience"];
  completedAt: string | null;
};

export const FOCUS_OPTIONS: { key: FocusKey; label: string; detail: string }[] = [
  { key: "argument", label: "Stronger arguments", detail: "Tighter claims and evidence" },
  { key: "delivery", label: "Steadier delivery", detail: "Pace, pauses, and nerves" },
  { key: "confidence", label: "Competitive confidence", detail: "Hold up under pressure" },
];

export const PURPOSE_OPTIONS: { key: PurposeKey; label: string; detail: string }[] = [
  { key: "school", label: "School or club debating", detail: "Class debates and school competitions" },
  { key: "university", label: "University or seminars", detail: "Tutorials, seminars, and essays" },
  { key: "interview", label: "Interviews and pitches", detail: "Presenting a case about yourself" },
  { key: "confidence", label: "Personal confidence", detail: "Speaking up without freezing" },
  { key: "competition", label: "Competitions and MUN", detail: "Tournaments, MUN, and finals" },
];

export const GOAL_OPTIONS: { key: GoalKey; label: string; detail: string }[] = [
  { key: "structure", label: "Structure a case fast", detail: "Build a clear line under time" },
  { key: "evidence", label: "Ground every claim", detail: "Attach proof, not assertion" },
  { key: "nerves", label: "Hold my nerve", detail: "Stay steady when pressed" },
  { key: "hostile", label: "Handle hostile questions", detail: "Answer the hard one first" },
  { key: "win", label: "Win the round", detail: "Close more cases than you lose" },
];

const prefsKey = (userId: string) => `verdict-learner-prefs-v1-${userId}`;
const doneKey = (userId: string) => `verdict-onboarding-v2-${userId}`;

export function emptyPrefs(): LearnerPrefs {
  return { focus: [], purpose: null, goal: null, experience: null, completedAt: null };
}

function coercePrefs(raw: Partial<LearnerPrefs> | null | undefined): LearnerPrefs {
  if (!raw) return emptyPrefs();
  return {
    focus: Array.isArray(raw.focus)
      ? raw.focus.filter((key): key is FocusKey => key === "argument" || key === "delivery" || key === "confidence")
      : [],
    purpose: PURPOSE_OPTIONS.some((option) => option.key === raw.purpose) ? (raw.purpose as PurposeKey) : null,
    goal: GOAL_OPTIONS.some((option) => option.key === raw.goal) ? (raw.goal as GoalKey) : null,
    experience: raw.experience === "new" || raw.experience === "developing" || raw.experience === "confident" ? raw.experience : null,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
  };
}

export function loadPrefs(userId: string): LearnerPrefs {
  try {
    const raw = window.localStorage.getItem(prefsKey(userId));
    if (!raw) return emptyPrefs();
    return coercePrefs(JSON.parse(raw) as Partial<LearnerPrefs>);
  } catch {
    return emptyPrefs();
  }
}

export function savePrefs(userId: string, prefs: LearnerPrefs): void {
  try {
    window.localStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
  } catch {
    /* Private browsing: the session keeps the answers. */
  }
}

export function isOnboardingDone(userId: string): boolean {
  try {
    return window.localStorage.getItem(doneKey(userId)) === "done";
  } catch {
    return false;
  }
}

export function markOnboardingDone(userId: string): void {
  try {
    window.localStorage.setItem(doneKey(userId), "done");
  } catch {
    /* The session still continues. */
  }
}

export function hasAnswers(prefs: LearnerPrefs): boolean {
  return Boolean(prefs.purpose || prefs.goal || prefs.focus.length);
}

export function stampPrefs(prefs: LearnerPrefs): LearnerPrefs {
  return { ...prefs, completedAt: new Date().toISOString() };
}

// The profile row is the source of truth; the browser copy is an offline cache of it.
export function prefsFromProfile(profile: LearnerProfile | null): LearnerPrefs {
  if (!profile) return emptyPrefs();
  return coercePrefs({
    focus: profile.focus_areas as FocusKey[],
    purpose: profile.purpose as PurposeKey | null,
    goal: profile.practice_goal as GoalKey | null,
    experience: profile.experience,
    completedAt: profile.preferences_updated_at,
  });
}

export function prefsToProfileFields(prefs: LearnerPrefs) {
  return {
    purpose: prefs.purpose,
    practice_goal: prefs.goal,
    focus_areas: prefs.focus,
    preferences_updated_at: prefs.completedAt ?? new Date().toISOString(),
  };
}

// Called after a sign-in so a learner's setup returns on a device that never saw the onboarding.
export function hydratePrefs(userId: string, profile: LearnerProfile | null): LearnerPrefs {
  const remote = prefsFromProfile(profile);
  if (hasAnswers(remote)) {
    savePrefs(userId, remote);
    markOnboardingDone(userId);
    return remote;
  }
  const local = loadPrefs(userId);
  const merged = !local.experience && remote.experience ? { ...local, experience: remote.experience } : local;
  if (merged !== local) savePrefs(userId, merged);
  return merged;
}

export function isProfileComplete(profile: LearnerProfile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.display_name || profile.experience || profile.goals);
}

export type Recommendation = {
  persona: PersonaKey;
  difficulty: DifficultyKey;
  duration: number;
  reason: string;
};

export function buildRecommendation(
  experience: LearnerProfile["experience"],
  prefs: Pick<LearnerPrefs, "focus" | "purpose" | "goal">,
): Recommendation {
  const competitive = prefs.purpose === "competition" || prefs.goal === "win" || prefs.goal === "hostile";
  const steady = prefs.goal === "nerves" || prefs.focus.includes("confidence");
  const delivery = prefs.focus.includes("delivery");
  const buildStructure = prefs.goal === "structure";
  const evidenceFirst = prefs.goal === "evidence" || prefs.focus.includes("argument");
  const interview = prefs.purpose === "interview" || prefs.purpose === "confidence";

  let persona: PersonaKey;
  if (competitive || buildStructure || experience === "confident" && !steady && !delivery) persona = "strategist";
  else if (steady || delivery || interview) persona = "diplomat";
  else if (evidenceFirst || prefs.purpose === "school" || prefs.purpose === "university") persona = "skeptic";
  else if (experience === "new") persona = "diplomat";
  else persona = "skeptic";

  let difficulty: DifficultyKey;
  if (competitive) difficulty = "cross-examination";
  else if (steady || buildStructure || evidenceFirst || prefs.purpose === "school" || prefs.purpose === "university") difficulty = "challenge";
  else if (experience === "confident") difficulty = "cross-examination";
  else if (experience === "new" || delivery || interview) difficulty = "warm-up";
  else difficulty = "challenge";

  const duration = difficulty === "warm-up" ? 3 : difficulty === "cross-examination" && experience === "confident" ? 7 : 5;
  let reason = "A balanced evidence-first opponent gives a developing case useful pushback.";
  if (prefs.purpose === "school") reason = "A focused skeptic helps you build clear claims for class debates and school rounds.";
  if (prefs.purpose === "university") reason = "A focused skeptic tests the reasoning you need for seminars and tutorials.";
  if (prefs.purpose === "interview") reason = "A patient, people-aware opponent helps you make a clear case about yourself.";
  if (prefs.purpose === "confidence") reason = "A patient opponent helps you practise speaking up at a manageable pace.";
  if (prefs.goal === "structure") reason = "A strategic opponent helps you practise building and sustaining a clear case.";
  if (prefs.goal === "evidence") reason = "An evidence-first skeptic will press you to support each claim.";
  if (prefs.goal === "nerves" || prefs.focus.includes("confidence")) reason = "The diplomat keeps the exchange measured while you practise holding your nerve.";
  if (delivery) reason = "A measured exchange leaves room to practise delivery and finish with a closing take.";
  if (competitive) reason = prefs.purpose === "competition"
    ? "A strategist and harder questions help you rehearse the pressure of competition rounds."
    : prefs.goal === "hostile"
      ? "A strategist will test you with hard questions so you can practise answering the point directly."
      : "A strategist pushes you to weigh clashes and close the round decisively.";
  if (!prefs.purpose && !prefs.goal && !prefs.focus.length && experience === "new") {
    reason = "A patient opponent and a short warm-up make a welcoming first round.";
  } else if (!prefs.purpose && !prefs.goal && !prefs.focus.length && experience === "confident") {
    reason = "You said you are ready for real pushback, so the starting round raises the pressure.";
  }

  return { persona, difficulty, duration, reason };
}

export function firstPracticeCue(prefs: Pick<LearnerPrefs, "focus" | "purpose" | "goal">): string {
  const cues: string[] = [];
  if (prefs.goal === "structure") cues.push("Build a clear claim line before adding a second point.");
  if (prefs.goal === "evidence") cues.push("Attach one concrete proof point to each major claim.");
  if (prefs.goal === "nerves") cues.push("Pause once before answering your opponent’s first challenge.");
  if (prefs.goal === "hostile") cues.push("Answer the hardest question first, then explain why.");
  if (prefs.goal === "win") cues.push("Close by weighing the strongest clash in your favor.");
  if (prefs.focus.includes("argument") && prefs.goal !== "evidence" && prefs.goal !== "structure") cues.push("Make each claim specific, then show why it follows.");
  if (prefs.focus.includes("delivery")) cues.push("Record a closing take after the round to review pace and pauses.");
  if (prefs.focus.includes("confidence") && prefs.goal !== "nerves") cues.push("Take one beat before your first reply and keep your case moving.");
  if (prefs.purpose === "school") cues.push("Lead with one clear claim you can defend in class.");
  if (prefs.purpose === "university") cues.push("Name the assumption your argument depends on.");
  if (prefs.purpose === "interview") cues.push("Connect each point to one concrete example from your experience.");
  if (prefs.purpose === "confidence") cues.push("Start with a short opening and let yourself pause.");
  if (prefs.purpose === "competition") cues.push("Practise weighing both sides before you close.");
  return cues.length ? cues.join(" ") : "Run one round and review it to get your first personal cue.";
}

export function purposeLine(prefs: LearnerPrefs): string {
  switch (prefs.purpose) {
    case "school":
      return "Practising for school and club debates";
    case "university":
      return "Practising for seminars and tutorials";
    case "interview":
      return "Practising for interviews and pitches";
    case "confidence":
      return "Practising to speak up with confidence";
    case "competition":
      return "Practising for competition rounds";
    default:
      return "Ready when you are";
  }
}

export type PracticePreferences = {
  goal: GoalKey | null;
  purpose: PurposeKey | null;
  focus: FocusKey[];
};

// Null means "no answers to send", so the coaching falls back to the record alone.
export function preferencesFor(prefs: LearnerPrefs): PracticePreferences | null {
  if (!prefs.goal && !prefs.purpose && prefs.focus.length === 0) return null;
  return { goal: prefs.goal, purpose: prefs.purpose, focus: prefs.focus };
}

export function goalLine(goal: GoalKey | null): string {
  switch (goal) {
    case "structure":
      return "building cases faster";
    case "evidence":
      return "grounding claims";
    case "nerves":
      return "holding your nerve";
    case "hostile":
      return "hard questions";
    case "win":
      return "winning the round";
    default:
      return "";
  }
}

export function focusLabels(focus: FocusKey[]): string[] {
  return focus
    .map((key) => FOCUS_OPTIONS.find((option) => option.key === key)?.label)
    .filter((label): label is string => Boolean(label));
}

export function orderedStarterTopics(topics: string[], prefs: LearnerPrefs): string[] {
  const byPurpose: Record<PurposeKey, number[]> = {
    school: [1, 0, 2, 3],
    university: [3, 0, 1, 2],
    interview: [3, 2, 0, 1],
    confidence: [0, 1, 2, 3],
    competition: [0, 2, 3, 1],
  };
  const order = prefs.purpose ? byPurpose[prefs.purpose] : [0, 1, 2, 3];
  // The first four follow the learner's purpose; the rest keep the bank order.
  const rest = topics.map((_, index) => index).filter((index) => !order.includes(index));
  return [...order, ...rest]
    .map((index) => topics[index])
    .filter((title): title is string => Boolean(title));
}

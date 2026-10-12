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
  const competitive = prefs.purpose === "competition" || prefs.goal === "win";
  const needsSteadiness = prefs.goal === "nerves" || prefs.focus.includes("confidence");

  if (experience === "new" && !competitive) {
    return {
      persona: "diplomat",
      difficulty: "warm-up",
      duration: 3,
      reason: "Gentle pressure and a patient opponent, so you can learn the ropes before the room gets loud.",
    };
  }
  if (competitive || experience === "confident") {
    return {
      persona: "strategist",
      difficulty: "cross-examination",
      duration: 5,
      reason: competitive
        ? "Hard questions and a long-game opponent, because you are practising for a competition."
        : "Hard questions and a long-game opponent, because you said you are ready for real pushback.",
    };
  }
  if (needsSteadiness) {
    return {
      persona: "diplomat",
      difficulty: "challenge",
      duration: 5,
      reason: "Balanced pressure against a wide-lens opponent, tuned for holding your nerve under fire.",
    };
  }
  return {
    persona: "skeptic",
    difficulty: "challenge",
    duration: 5,
    reason: "Balanced pushback from an evidence-first opponent — the fastest way to sharpen a developing case.",
  };
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
  return order.map((index) => topics[index]).filter((title): title is string => Boolean(title));
}

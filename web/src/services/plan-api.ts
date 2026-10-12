import { apiUrl } from "../config";
import type { AnalysisReport, PracticePreferences } from "./debate-api";

export type CriterionKey =
  | "clarity"
  | "relevance"
  | "evidence_strength"
  | "logical_consistency"
  | "persuasiveness";

export type WeakSpotKey =
  | CriterionKey
  | "delivery"
  | "fallacy_control"
  | "practice_volume";

/** What one finished rehearsal left behind. The browser reduces the archive to this. */
export type SessionDigest = {
  ratings: AnalysisReport["ratings"];
  fallacy_labels: string[];
  filler_rate_per_100w: number | null;
};

export type PlanWeakSpot = {
  key: WeakSpotKey;
  label: string;
  evidence: string;
  first_step: string;
};

export type PlanDrill = {
  weak_spot: WeakSpotKey;
  title: string;
  minutes: number;
  steps: string[];
  success_check: string;
};

export type PlanMilestone = {
  week: number;
  focus: WeakSpotKey[];
  practice: string;
  win_condition: string;
};

export type LearningPlan = {
  headline: string;
  summary: string;
  weak_spots: PlanWeakSpot[];
  drills: PlanDrill[];
  milestones: PlanMilestone[];
  next_session: string;
  generated_for: number;
  gaps: string[];
};

export async function requestPlan(
  input: {
    goals: string | null;
    experience: string | null;
    digests: SessionDigest[];
    preferences?: PracticePreferences | null;
  },
  accessToken?: string,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/coach/plan"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      goals: input.goals,
      experience: input.experience,
      digests: input.digests.slice(-12),
      preferences: input.preferences ?? undefined,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The coach could not build your plan.");
  }
  return (await response.json()) as { plan: LearningPlan; gaps: string[] };
}

import { supabase } from "../features/auth/supabase";
import { listDebateRecords, loadDebateAnalysis } from "./debate-records";
import { listPresentationFeedbacks } from "./presentation-records";
import { requestPlan, type LearningPlan, type SessionDigest } from "./plan-api";
import type { PracticePreferences } from "./debate-api";

export type StoredPlan = {
  id: string;
  plan: LearningPlan;
  sessions_considered: number;
  created_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

/** Reduce the archive to the digests the memory agent reads, oldest first. */
export async function loadSessionDigests(limit = 12): Promise<SessionDigest[]> {
  const sessions = (await listDebateRecords(limit)).slice(0, limit);
  const withScores: { at: string; digest: SessionDigest }[] = [];
  const analyses = await Promise.all(
    sessions.map((session) =>
      loadDebateAnalysis(session.id)
        .then((analysis) => ({ session, analysis }))
        .catch(() => ({ session, analysis: null })),
    ),
  );
  for (const { session, analysis } of analyses) {
    if (!analysis) continue;
    withScores.push({
      at: session.started_at,
      digest: {
        ratings: analysis.ratings,
        fallacy_labels: analysis.fallacies.map((flag) => flag.label),
        filler_rate_per_100w: null,
      },
    });
  }
  try {
    const feedbacks = await listPresentationFeedbacks(limit);
    for (const feedback of feedbacks) {
      const rate = feedback.signals?.filler_rate_per_100w;
      if (typeof rate !== "number") continue;
      withScores.push({
        at: feedback.created_at,
        digest: { ratings: null, fallacy_labels: [], filler_rate_per_100w: rate },
      });
    }
  } catch {
    /* Delivery history is optional; the debate archive is enough for a plan. */
  }
  return withScores
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((entry) => entry.digest)
    .slice(-limit);
}

export async function saveLearningPlan(
  userId: string,
  plan: LearningPlan,
  sessionsConsidered: number,
) {
  const { data, error } = await requireClient()
    .from("learning_plans")
    .insert({ user_id: userId, plan, sessions_considered: sessionsConsidered })
    .select("id, plan, sessions_considered, created_at")
    .single();
  if (error) throw error;
  return data as StoredPlan;
}

export async function generateAndSaveLearningPlan(
  userId: string,
  input: {
    goals: string | null;
    experience: string | null;
    preferences?: PracticePreferences | null;
  },
  accessToken?: string,
) {
  const digests = await loadSessionDigests(12);
  const result = await requestPlan({ ...input, digests }, accessToken);
  return saveLearningPlan(userId, result.plan, digests.length);
}

export async function listLearningPlans(limit = 6) {
  const { data, error } = await requireClient()
    .from("learning_plans")
    .select("id, plan, sessions_considered, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as StoredPlan[];
}

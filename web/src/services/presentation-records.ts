import type { PresentationReport, DeliverySignals } from "./presentation-api";
import { supabase } from "../features/auth/supabase";

export type PresentationFeedback = {
  id: string; topic: string | null; transcript: string;
  signals: DeliverySignals; report: PresentationReport; created_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

export async function savePresentationFeedback(input: {
  sessionId?: string | null; topic?: string | null;
  transcript: string; signals: DeliverySignals; report: PresentationReport;
}) {
  const { data, error } = await requireClient().from("presentation_feedbacks").insert({
    session_id: input.sessionId ?? null,
    topic: input.topic ?? null,
    transcript: input.transcript,
    signals: input.signals,
    report: input.report,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function listPresentationFeedbacks(limit = 20) {
  const { data, error } = await requireClient().from("presentation_feedbacks")
    .select("id, topic, transcript, signals, report, created_at")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as PresentationFeedback[];
}

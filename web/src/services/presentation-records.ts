import type { PresentationReport, DeliverySignals, PresentationResult } from "./presentation-api";
import { supabase } from "../features/auth/supabase";

export type PresentationFeedback = {
  id: string; topic: string | null; transcript: string;
  signals: DeliverySignals; report: PresentationReport;
  audio_path: string | null; created_at: string;
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
    .select("id, topic, transcript, signals, report, audio_path, created_at")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as PresentationFeedback[];
}

export async function loadPresentationFeedbackForSession(sessionId: string): Promise<PresentationResult | null> {
  const { data, error } = await requireClient().from("presentation_feedbacks")
    .select("transcript, signals, report, audio_path")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    transcript: data.transcript,
    segments: [],
    signals: data.signals as DeliverySignals,
    report: data.report as PresentationReport,
    retained: Boolean(data.audio_path),
  };
}

export async function setPresentationAudio(id: string, audioPath: string) {
  const { error } = await requireClient().from("presentation_feedbacks")
    .update({ audio_path: audioPath })
    .eq("id", id);
  if (error) throw error;
}

function audioFormat(type: string) {
  const base = (type || "audio/webm").split(";")[0].toLowerCase();
  if (base.includes("mp4") || base.includes("m4a")) return { extension: "m4a", contentType: "audio/mp4" };
  if (base.includes("wav")) return { extension: "wav", contentType: "audio/wav" };
  if (base.includes("mpeg") || base.includes("mp3")) return { extension: "mp3", contentType: "audio/mpeg" };
  return { extension: "webm", contentType: "audio/webm" };
}

export async function uploadPresentationAudio(userId: string, feedbackId: string, file: File | Blob) {
  const client = requireClient();
  // Safari records MP4 audio, so the stored path and type follow the real container.
  const { extension, contentType } = audioFormat(file.type);
  const path = `${userId}/${feedbackId}.${extension}`;
  const { error } = await client.storage.from("presentation-audio").upload(path, file, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  await setPresentationAudio(feedbackId, path);
  return path;
}

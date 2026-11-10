import { coachPresentation, transcribePresentation, type PresentationReport, type DeliverySignals, type PresentationResult } from "./presentation-api";
import type { LocalModel } from "./app-settings";
import { supabase } from "../features/auth/supabase";

export type PresentationFeedback = {
  id: string; topic: string | null; transcript: string;
  signals: DeliverySignals; report: PresentationReport;
  audio_path: string | null; created_at: string;
};

/** The recorded or uploaded audio captured for a closing take. */
export type DeliveryTake = { file: File; retain: boolean };

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

/**
 * Start a closing-take review in two observable phases.
 *
 * `transcript` resolves as soon as speech recognition finishes, so the verdict
 * can include the closing words in its single argument pass. `result` resolves
 * when delivery coaching finishes, and `saved` covers best-effort archiving in
 * the background so neither the argument review nor the judge waits for storage.
 */
export type DeliveryReview = {
  transcript: Promise<string | null>;
  result: Promise<PresentationResult>;
  saved: Promise<{ retained: boolean; notice: string }>;
};

export function reviewDeliveryTake(input: {
  file: File;
  topic?: string;
  sessionId?: string | null;
  accessToken?: string;
  model?: LocalModel;
  retain?: boolean;
  userId?: string | null;
  save?: boolean;
  signal?: AbortSignal;
}): DeliveryReview {
  const transcriptRequest = transcribePresentation(
    input.file,
    input.file.name,
    input.accessToken,
    input.signal,
  );
  // A failed transcription still lets the argument review run without closing
  // words; the delivery promise below carries the error to the UI.
  const transcript = transcriptRequest
    .then((take) => take.transcript)
    .catch(() => null);
  const result = transcriptRequest.then(async (take) => {
    const report = await coachPresentation({
      topic: input.topic,
      segments: take.segments,
      signals: take.signals,
      accessToken: input.accessToken,
      model: input.model,
      signal: input.signal,
    });
    return {
      transcript: take.transcript,
      segments: take.segments,
      signals: take.signals,
      report,
      retained: false,
    };
  });
  const saved = result
    .then((review) => archiveDeliveryReview(input, review))
    .catch(() => ({ retained: false, notice: "" }));
  return { transcript, result, saved };
}

async function archiveDeliveryReview(input: {
  file: File;
  topic?: string;
  sessionId?: string | null;
  retain?: boolean;
  userId?: string | null;
  save?: boolean;
  signal?: AbortSignal;
}, result: PresentationResult): Promise<{ retained: boolean; notice: string }> {
  if (!input.save || !input.userId || input.signal?.aborted) {
    return { retained: false, notice: "" };
  }
  try {
    const feedbackId = await savePresentationFeedback({
      sessionId: input.sessionId,
      topic: input.topic,
      transcript: result.transcript,
      signals: result.signals,
      report: result.report,
    });
    if (!input.retain) {
      return { retained: false, notice: "Saved to your learner archive. Audio discarded." };
    }
    try {
      await uploadPresentationAudio(input.userId, feedbackId, input.file);
      return {
        retained: true,
        notice: "Saved to your learner archive with its recording.",
      };
    } catch {
      return {
        retained: false,
        notice: "Saved to your learner archive, but the recording could not be kept. Audio is discarded by default.",
      };
    }
  } catch {
    return {
      retained: false,
      notice: "Review is ready, but saving failed. It stays in this browser session.",
    };
  }
}

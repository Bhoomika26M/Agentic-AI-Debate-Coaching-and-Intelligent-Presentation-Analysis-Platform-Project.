import { apiUrl } from "../config";
import type { LocalModel } from "./app-settings";

export type PresentationSegment = { text: string; start: number; end: number };
export type DeliveryEvent = { kind: string; start: number; end: number; label: string; detail: string };
export type DeliverySignals = {
  wpm: number; words: number; duration_sec: number; filler_count: number;
  filler_rate_per_100w: number; pause_count: number; longest_pause_sec: number;
  repetition_count: number; revision_count: number; prolongation_count: number;
  events: DeliveryEvent[];
};
export type PresentationReport = {
  transcript: string; communication_score: number; strengths: string[];
  drills: { start: number; end: number; pattern: string; what_happened: string; try_this: string; example: string }[];
  next_line: string;
};
export type PresentationResult = {
  transcript: string; segments: PresentationSegment[]; signals: DeliverySignals;
  report: PresentationReport; retained: boolean;
};

/** The transcript and measured signals, before the model coaches delivery. */
export type PresentationTranscript = Omit<PresentationResult, "report">;

const MAX_BYTES = 10 * 1024 * 1024;

function audioError(payload: unknown, fallback: string, status: number) {
  if (status === 404) {
    return "The delivery service is unavailable on this API version. Restart or update the backend, then retry.";
  }
  return (payload as { detail?: string } | null)?.detail ?? fallback;
}

async function postAudio(
  path: string,
  file: File | Blob,
  filename: string,
  accessToken: string | undefined,
  signal: AbortSignal | undefined,
  fallback: string,
) {
  const size = file.size ?? 0;
  if (size === 0) throw new Error("No audio was received.");
  if (size > MAX_BYTES) throw new Error("Audio is over 10MB. Trim under 3 minutes.");
  const form = new FormData();
  form.append("audio", file, filename);
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl(path), {
    method: "POST", headers, credentials: "omit", body: form, signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(audioError(error, fallback, response.status));
  }
  return response.json();
}

/**
 * Transcribe a take without waiting for delivery coaching. The verdict flow
 * uses this to put the closing words into its one argument review.
 */
export async function transcribePresentation(
  file: File | Blob,
  filename: string,
  accessToken: string | undefined,
  signal?: AbortSignal,
): Promise<PresentationTranscript> {
  return postAudio(
    "/api/presentation/transcribe",
    file,
    filename,
    accessToken,
    signal,
    "The delivery coach could not transcribe this audio.",
  ) as Promise<PresentationTranscript>;
}

/** Coach an already-transcribed take, so the audio is never uploaded twice. */
export async function coachPresentation(input: {
  topic?: string;
  segments: PresentationSegment[];
  signals: DeliverySignals;
  accessToken?: string;
  model?: LocalModel;
  signal?: AbortSignal;
}): Promise<PresentationReport> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`;
  const response = await fetch(apiUrl("/api/presentation/coach"), {
    method: "POST",
    headers,
    credentials: "omit",
    signal: input.signal,
    body: JSON.stringify({
      topic: input.topic,
      segments: input.segments,
      signals: input.signals,
      model: input.model,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(audioError(error, "The delivery coach could not review this audio.", response.status));
  }
  return (await response.json()) as PresentationReport;
}

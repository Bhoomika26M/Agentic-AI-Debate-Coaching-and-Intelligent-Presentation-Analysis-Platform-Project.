import { apiUrl } from "../config";

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

const MAX_BYTES = 10 * 1024 * 1024;

export async function analyzePresentation(
  file: File | Blob,
  filename: string,
  topic: string | undefined,
  accessToken: string | undefined,
  signal?: AbortSignal,
) {
  const size = file.size ?? 0;
  if (size === 0) throw new Error("No audio was received.");
  if (size > MAX_BYTES) throw new Error("Audio is over 10MB. Trim under 3 minutes.");
  const form = new FormData();
  form.append("audio", file, filename);
  if (topic) form.append("topic", topic);
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/presentation/analyze"), {
    method: "POST", headers, credentials: "omit", body: form, signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The delivery coach could not review this audio.");
  }
  return (await response.json()) as PresentationResult;
}

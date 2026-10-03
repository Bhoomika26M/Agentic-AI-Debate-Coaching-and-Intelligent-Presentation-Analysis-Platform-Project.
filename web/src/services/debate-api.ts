import { apiUrl } from "../config";

export type Speaker = "learner" | "opponent";

export type DebateMessage = {
  id: string;
  speaker: Speaker;
  content: string;
  pending?: boolean;
};

export type DebateOptions = {
  topic: string;
  learner_position: "for" | "against";
  persona: "strategist" | "skeptic" | "diplomat";
  difficulty: "warm-up" | "challenge" | "cross-examination";
};

export type AnalysisReport = {
  ratings: Record<"clarity" | "relevance" | "evidence_strength" | "logical_consistency" | "persuasiveness", { score: number; note: string }>;
  fallacies: { label: string; quote: string; explanation: string; revision: string }[];
  strengths: string[];
  next_steps: string[];
  counterarguments: { kind: string; response: string; question: string }[];
};

export async function analyzeDebate(
  options: DebateOptions,
  turns: DebateMessage[],
  accessToken?: string,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/debate/analyze"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      topic: options.topic,
      learner_position: options.learner_position,
      turns: turns.filter((turn) => !turn.pending).map(({ speaker, content }) => ({ speaker, content })),
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The coach could not review this transcript.");
  }
  return (await response.json()) as AnalysisReport;
}

export async function checkBackend() {
  const response = await fetch(apiUrl("/api/health"), { credentials: "omit" });
  if (!response.ok) throw new Error("The debate service is unavailable.");
  return (await response.json()) as {
    status: string;
    model: string;
    model_available: boolean;
    model_loaded: boolean;
  };
}

export async function streamOpponentReply(
  options: DebateOptions,
  history: DebateMessage[],
  learnerArgument: string | null,
  accessToken: string | undefined,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(apiUrl("/api/debate/stream"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      ...options,
      history: history.map(({ speaker, content }) => ({ speaker, content })),
      learner_argument: learnerArgument,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The opponent could not respond.");
  }
  if (!response.body) throw new Error("Streaming is not available in this browser.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const event = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = event
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);

      if (data === "[DONE]") return;
      if (data) {
        const payload = JSON.parse(data) as { delta?: string; error?: string };
        if (payload.error) throw new Error(payload.error);
        if (payload.delta) onDelta(payload.delta);
      }
      boundary = buffer.indexOf("\n\n");
    }
  }
}

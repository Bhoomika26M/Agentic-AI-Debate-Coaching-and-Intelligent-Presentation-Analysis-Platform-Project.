import { apiUrl } from "../config";
import { createMarkerScrubber, stripControlMarkers } from "../utils/text";
import type { SessionDigest } from "./plan-api";

export type Speaker = "learner" | "opponent";

// The API condenses and windows these turns; the payload stays bounded too.
const MODEL_HISTORY_TURNS = 60;
const MAX_ANALYSIS_TURNS = 200;

function modelHistory(turns: DebateMessage[]) {
  return turns
    .filter((turn) => !turn.pending && turn.content.trim())
    .slice(-MODEL_HISTORY_TURNS)
    .map(({ speaker, content }) => ({ speaker, content }));
}

export type DebateMessage = {
  id: string;
  speaker: Speaker;
  content: string;
  pending?: boolean;
  kind?: "standard" | "challenge";
  challengeDepth?: number;
  challengeTarget?: string;
};

export type ChallengeResult = {
  done: boolean;
  target_sentence: string | null;
  follow_up: string | null;
  depth: number;
};

export async function requestChallenge(
  options: DebateOptions,
  turns: DebateMessage[],
  latest: string,
  depth: number,
  accessToken?: string,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/debate/challenge"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      topic: options.topic,
      history: modelHistory(turns),
      latest,
      depth,
      preferences: options.preferences ?? undefined,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The coach could not ask a follow-up.");
  }
  const result = (await response.json()) as ChallengeResult;
  return {
    ...result,
    target_sentence: result.target_sentence ? stripControlMarkers(result.target_sentence) : null,
    follow_up: result.follow_up ? stripControlMarkers(result.follow_up) : null,
  };
}

/** The learner's own onboarding answers, sent so the coaching can aim at what they asked for. */
export type PracticePreferences = {
  goal: "structure" | "evidence" | "nerves" | "hostile" | "win" | null;
  purpose: "school" | "university" | "interview" | "confidence" | "competition" | null;
  focus: ("argument" | "delivery" | "confidence")[];
};

export type DebateOptions = {
  topic: string;
  learner_position: "for" | "against";
  persona: "strategist" | "skeptic" | "diplomat";
  difficulty: "warm-up" | "challenge" | "cross-examination";
  preferences?: PracticePreferences | null;
  adaptive_tactics?: boolean;
  reply_length?: "concise" | "standard";
};

export type AppCapabilities = {
  adaptive_tactics_available: boolean;
};

export async function loadAppCapabilities(): Promise<AppCapabilities> {
  const response = await fetch(apiUrl("/api/health"), { credentials: "omit" });
  if (!response.ok) throw new Error("App status is unavailable.");
  const result = await response.json() as Partial<AppCapabilities>;
  if (typeof result.adaptive_tactics_available !== "boolean") throw new Error("App status is incomplete.");
  return { adaptive_tactics_available: result.adaptive_tactics_available };
}

export type AnalysisReport = {
  ratings: Record<"clarity" | "relevance" | "evidence_strength" | "logical_consistency" | "persuasiveness", { score: number; note: string }> | null;
  fallacies: { label: string; quote: string; explanation: string; revision: string }[];
  strengths: string[];
  next_steps: string[];
  counterarguments: { kind: string; response: string; question: string }[];
  gaps: string[];
};

export async function analyzeDebate(
  options: DebateOptions,
  turns: DebateMessage[],
  accessToken?: string,
) {
  const transcript = turns
    .filter((turn) => !turn.pending && turn.content.trim())
    .map(({ speaker, content }) => ({ speaker, content }));
  if (transcript.length > MAX_ANALYSIS_TURNS) {
    throw new Error(
      `This rehearsal is too long to review in one pass (${transcript.length} turns; the limit is ${MAX_ANALYSIS_TURNS}). Continue in a shorter round or review the latest turns.`,
    );
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/debate/analyze"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      topic: options.topic,
      learner_position: options.learner_position,
      turns: transcript,
      persona: options.persona,
      difficulty: options.difficulty,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The coach could not review this transcript.");
  }
  return (await response.json()) as AnalysisReport;
}

export type JudgeDimension = {
  key: "argument" | "evidence" | "logical" | "rebuttal" | "communication";
  weight_pct: number;
  score: number;
  note: string;
  citations: string[];
};

export type JudgeVerdict = {
  overall: number;
  dimensions: JudgeDimension[];
  gaps: string[];
};

export async function requestJudge(
  report: AnalysisReport,
  delivery: object | null,
  accessToken?: string,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(apiUrl("/api/debate/judge"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({ report, delivery }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail ?? "The judge could not score this rehearsal.");
  }
  return (await response.json()) as JudgeVerdict;
}

export async function streamOpponentReply(
  options: DebateOptions,
  history: DebateMessage[],
  learnerArgument: string | null,
  accessToken: string | undefined,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
  memory: SessionDigest[] = [],
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(apiUrl("/api/debate/stream"), {
    method: "POST",
    headers,
    credentials: "omit",
    body: JSON.stringify({
      ...options,
      history: modelHistory(history),
      learner_argument: learnerArgument,
      memory,
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
  const scrubber = createMarkerScrubber();
  let buffer = "";
  let replyLength = 0;

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

      if (data === "[DONE]") {
        const tail = scrubber.flush();
        if (tail) {
          onDelta(tail);
          replyLength += tail.length;
        }
        if (!replyLength) throw new Error("The opponent returned an empty reply.");
        return;
      }
      if (data) {
        let payload: { final_delta?: string; error?: string };
        try {
          payload = JSON.parse(data) as { final_delta?: string; error?: string };
        } catch {
          continue;
        }
        if (payload.error) throw new Error(payload.error);
        if (payload.final_delta) {
          const clean = scrubber.push(payload.final_delta);
          if (clean) {
            onDelta(clean);
            replyLength += clean.length;
          }
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }

  throw new Error("The opponent reply ended before the final response was ready.");
}

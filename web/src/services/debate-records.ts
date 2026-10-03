import type { AnalysisReport, DebateMessage, DebateOptions } from "./debate-api";
import { supabase } from "../features/auth/supabase";

export type DebateRecord = {
  id: string;
  topic: string;
  learner_position: DebateOptions["learner_position"];
  persona: DebateOptions["persona"];
  difficulty: DebateOptions["difficulty"];
  duration_minutes: number;
  status: "in_progress" | "completed";
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type DebateRecordTurn = Pick<DebateMessage, "id" | "speaker" | "content"> & {
  turn_index: number;
};

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

export async function createDebateRecord(
  options: DebateOptions,
  durationMinutes: number,
) {
  const { data, error } = await requireClient()
    .from("debate_sessions")
    .insert({
      topic: options.topic,
      learner_position: options.learner_position,
      persona: options.persona,
      difficulty: options.difficulty,
      duration_minutes: durationMinutes,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveDebateTurn(sessionId: string, message: DebateRecordTurn) {
  const { error } = await requireClient().from("debate_turns").insert({
    id: message.id,
    session_id: sessionId,
    turn_index: message.turn_index,
    speaker: message.speaker,
    content: message.content,
  });
  if (error && error.code !== "23505") throw error;
}

export async function finishDebateRecord(sessionId: string) {
  const { error } = await requireClient()
    .from("debate_sessions")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function resumeDebateRecord(sessionId: string) {
  const { error } = await requireClient()
    .from("debate_sessions")
    .update({ status: "in_progress", finished_at: null })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function listDebateRecords(limit = 30) {
  const { data, error } = await requireClient()
    .from("debate_sessions")
    .select("id, topic, learner_position, persona, difficulty, duration_minutes, status, started_at, finished_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DebateRecord[];
}

export async function loadDebateRecord(sessionId: string) {
  const client = requireClient();
  const [sessionResult, turnsResult] = await Promise.all([
    client.from("debate_sessions")
      .select("id, topic, learner_position, persona, difficulty, duration_minutes, status, started_at, finished_at, created_at")
      .eq("id", sessionId)
      .single(),
    client.from("debate_turns")
      .select("id, speaker, content, turn_index")
      .eq("session_id", sessionId)
      .order("turn_index", { ascending: true }),
  ]);
  if (sessionResult.error) throw sessionResult.error;
  if (turnsResult.error) throw turnsResult.error;
  return {
    session: sessionResult.data as DebateRecord,
    turns: (turnsResult.data ?? []) as DebateRecordTurn[],
  };
}

export async function saveDebateAnalysis(sessionId: string, report: AnalysisReport) {
  const { error } = await requireClient().from("debate_analyses").upsert({
    session_id: sessionId,
    report,
  }, { onConflict: "session_id" });
  if (error) throw error;
}

export async function loadDebateAnalysis(sessionId: string) {
  const { data, error } = await requireClient()
    .from("debate_analyses")
    .select("report")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.report as AnalysisReport | undefined) ?? null;
}

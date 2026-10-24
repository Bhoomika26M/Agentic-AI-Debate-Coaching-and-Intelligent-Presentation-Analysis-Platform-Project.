import { supabase } from "../features/auth/supabase";
import { listDebateRecords, loadDebateAnalysis, loadDebateRecord } from "./debate-records";
import { listPresentationFeedbacks } from "./presentation-records";

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

/** The archive as delivered to the learner: transcript, review, and delivery notes, not just headers. */
export async function buildArchiveCsv() {
  const records = await listDebateRecords(100);
  const rows = [[
    "date",
    "topic",
    "side",
    "opponent",
    "minutes",
    "status",
    "transcript",
    "ratings",
    "fallacies",
    "next_steps",
    "delivery_takes",
  ]];
  for (const record of records) {
    let turns = "";
    let review = "";
    let fallacies = "";
    let nextSteps = "";
    try {
      const loaded = await loadDebateRecord(record.id);
      turns = loaded.turns
        .map((turn) => `${turn.speaker === "learner" ? "YOU" : "OPPONENT"}: ${turn.content}`)
        .join("\n\n");
    } catch {
      turns = "Transcript unavailable";
    }
    try {
      const analysis = await loadDebateAnalysis(record.id);
      if (analysis?.ratings) {
        review = Object.entries(analysis.ratings)
          .map(([key, rating]) => `${key.replaceAll("_", " ")} ${rating.score}/5`)
          .join("; ");
      }
      fallacies = (analysis?.fallacies ?? []).map((flag) => flag.label).join("; ");
      nextSteps = (analysis?.next_steps ?? []).join("; ");
    } catch {
      review = "Review unavailable";
    }
    rows.push([
      record.started_at,
      record.topic,
      record.learner_position,
      record.persona,
      String(record.duration_minutes),
      record.status,
      turns,
      review,
      fallacies,
      nextSteps,
      "",
    ]);
  }
  try {
    const deliveries = await listPresentationFeedbacks(100);
    for (const delivery of deliveries) {
      rows.push([
        delivery.created_at,
        delivery.topic ?? "Delivery take",
        "",
        "",
        "",
        "delivery",
        delivery.transcript,
        String(delivery.report.communication_score),
        "",
        delivery.report.next_line,
        delivery.audio_path ? "audio retained" : "audio discarded",
      ]);
    }
  } catch {
    /* Delivery history is optional. */
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadCsvFile(csv: string, filename = "verdict-archive.csv") {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteAllPracticeData(userId: string) {
  const client = requireClient();
  let audioCleared = false;
  for (let pass = 0; pass < 20; pass += 1) {
    const { data: files } = await client.storage
      .from("presentation-audio")
      .list(userId, { limit: 100 });
    if (!files || files.length === 0) {
      audioCleared = true;
      break;
    }
    const { error: removeError } = await client.storage
      .from("presentation-audio")
      .remove(files.map((file) => `${userId}/${file.name}`));
    // Retention is opt-in, so audio that survives deletion would be a privacy failure.
    if (removeError) throw removeError;
  }
  if (!audioCleared) {
    throw new Error("Stored audio is too large to remove in one pass. Contact the operator.");
  }
  for (const table of ["presentation_feedbacks", "debate_sessions", "learning_plans", "custom_topics"]) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}

export async function deleteAccount() {
  const client = requireClient();
  const { error } = await client.functions.invoke("delete-account", { method: "POST" });
  if (error) {
    throw new Error(
      "Account deletion is not enabled on this server yet. Delete your practice data here and ask the operator to remove the sign-in.",
    );
  }
  await client.auth.signOut().catch(() => undefined);
}

import { expect, test, type Page } from "@playwright/test";
import { goToAccount, mockHealth, seedSignedIn } from "./support";

const SESSION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TOPIC = "Should schools ban phones?";

const SESSION = {
  id: SESSION_ID,
  topic: TOPIC,
  learner_position: "for",
  persona: "skeptic",
  difficulty: "challenge",
  duration_minutes: 5,
  status: "completed",
  started_at: "2026-10-20T10:00:00.000Z",
  finished_at: "2026-10-20T10:05:00.000Z",
  created_at: "2026-10-20T10:00:00.000Z",
};

const TURNS = [
  {
    id: "turn-1",
    speaker: "learner",
    content: "Attention improves when phones are away.",
    turn_index: 0,
    kind: "standard",
    challenge_depth: null,
    challenge_target: null,
  },
  {
    id: "turn-2",
    speaker: "opponent",
    content: "Which study separates a phone ban from better teaching?",
    turn_index: 1,
    kind: "challenge",
    challenge_depth: 1,
    challenge_target: "Attention improves when phones are away.",
  },
];

const ANALYSIS = {
  report: {
    ratings: {
      clarity: { score: 4, note: "clear" },
      relevance: { score: 4, note: "on topic" },
      evidence_strength: { score: 2, note: "thin" },
      logical_consistency: { score: 4, note: "sound" },
      persuasiveness: { score: 3, note: "developing" },
    },
    fallacies: [],
    strengths: ["A clear claim."],
    next_steps: ["Attach one study."],
    counterarguments: [],
    gaps: [],
  },
};

async function mockSupabase(page: Page, streamRequests: string[]) {
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      const table = new URL(request.url()).pathname.split("/").pop();
      if (table === "debate_sessions" && request.method() === "POST") {
        return route.fulfill({ status: 201, json: { id: SESSION_ID } });
      }
      return route.fulfill({ status: 204 });
    }
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").pop();
    if (table === "profiles") {
      return route.fulfill({
        json: {
          user_id: "11111111-1111-4111-8111-111111111111",
          display_name: "Learner A",
          experience: "developing",
          goals: null,
          retain_audio: false,
          purpose: null,
          practice_goal: null,
          focus_areas: [],
          preferences_updated_at: null,
          app_settings: null,
        },
      });
    }
    if (table === "debate_sessions") {
      return route.fulfill({ json: url.search.includes("id=eq.") ? SESSION : [SESSION] });
    }
    if (table === "debate_turns") return route.fulfill({ json: TURNS });
    if (table === "debate_analyses") return route.fulfill({ json: ANALYSIS });
    if (table === "learning_plans") return route.fulfill({ json: [] });
    return route.fulfill({ json: [] });
  });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/debate/stream", async (route) => {
    streamRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: `data: ${JSON.stringify({ final_delta: "Unexpected opening reply." })}\n\ndata: [DONE]\n\n`,
    });
  });
  await page.route("**/api/debate/challenge", async (route) => {
    const payload = route.request().postDataJSON() as { depth?: number };
    const depth = Math.min(2, (payload.depth ?? 0) + 1);
    await route.fulfill({
      json: {
        done: false,
        target_sentence: "Attention improves when phones are away.",
        follow_up: "Which study shows that? (2)",
        depth,
      },
    });
  });
}

test("a saved debate reopens with its follow-up metadata and can continue", async ({ page }) => {
  const streamRequests: string[] = [];
  await seedSignedIn(page);
  await mockSupabase(page, streamRequests);
  await mockHealth(page);

  await goToAccount(page);
  await page.getByRole("tab", { name: "Archive" }).click();
  await expect(page.getByRole("heading", { name: "Saved debates" })).toBeVisible();
  const record = page.locator(".archive-row").filter({ hasText: TOPIC });
  await expect(record).toBeVisible();
  await record.click();

  await expect(page.getByText("FOLLOW-UP 1 OF 2")).toBeVisible();
  await expect(page.getByText("Attention improves when phones are away.").first()).toBeVisible();

  await page.getByRole("button", { name: /Continue in the debate room/ }).click();
  await expect(page.getByText("CONTINUED REHEARSAL")).toBeVisible();
  await expect(page.getByText("FOLLOW-UP 1 OF 2")).toBeVisible();
  expect(streamRequests, "continuing must not request a new opening reply").toHaveLength(0);

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByText("Which study shows that? (2)")).toBeVisible();
});

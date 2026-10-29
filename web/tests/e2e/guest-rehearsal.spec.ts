import { expect, test, type Page } from "@playwright/test";

const OPPONENT_REPLY =
  "You lean on attention gains, but a ban moves the same distraction into the corridor. " +
  "Which evidence shows classroom focus improving without it?";
const FOLLOW_UP = "Which study shows attention improving after a ban?";
const DIAGNOSTICS = {
  verified: true,
  fallback: false,
  history_turns: 0,
  context_turns: 0,
  summarized_turns: 0,
  tactic: "probe_evidence",
  brief_used: false,
  memory_used: false,
  reply_words: 27,
  problems: [],
  draft_ms: 12,
  review_ms: 3,
  model_ms: 15,
};

async function mockDebateApi(page: Page) {
  await page.route("**/api/debate/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: `data: ${JSON.stringify({ final_delta: OPPONENT_REPLY })}\n\n` +
        `data: ${JSON.stringify({ diagnostics: JSON.stringify(DIAGNOSTICS) })}\n\n` +
        "data: [DONE]\n\n",
    });
  });
  await page.route("**/api/debate/challenge", async (route) => {
    const payload = route.request().postDataJSON() as { depth?: number };
    const depth = Math.min(2, (payload.depth ?? 0) + 1);
    await route.fulfill({
      json: {
        done: false,
        target_sentence: "Schools should ban phones.",
        follow_up: `${FOLLOW_UP} (${depth})`,
        depth,
      },
    });
  });
}

async function startGuestRehearsal(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Start a rehearsal/i }).first().click();
  await expect(page.getByRole("heading", { name: /Set up your debate/i })).toBeVisible();
  await page.getByRole("button", { name: /^Start rehearsal/ }).click();
  await expect(page.getByText("GUEST REHEARSAL")).toBeVisible();
  await expect(page.getByText(OPPONENT_REPLY).first()).toBeVisible();
  await expect(page.getByText("VERIFIED", { exact: true })).toBeVisible();
  await expect(page.getByText("PROBE EVIDENCE", { exact: true })).toBeVisible();
}

async function submitCase(page: Page, text: string) {
  const composer = page.getByLabel(/Your argument/);
  await composer.fill(text);
  await composer.press("Enter");
  await expect(page.getByText("YOUR CASE", { exact: true }).first()).toBeVisible();
}

test("a guest can press two follow-ups, then resume the tab's transcript", async ({ page }) => {
  await mockDebateApi(page);
  await startGuestRehearsal(page);

  await expect(
    page.getByText(/lives only in this browser tab and is cleared when the rehearsal ends/i),
  ).toBeVisible();

  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 1 OF 2")).toBeVisible();
  await expect(
    page.locator(".message-challenge").first().getByText("TURN 01", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow-ups done/ })).toBeDisabled();

  // The active room lives in sessionStorage, and returning home should surface
  // the same resumable session without needing a reload.
  await page.getByRole("button", { name: "Return home" }).click();
  await expect(page.getByText(/REHEARSAL IN PROGRESS/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/REHEARSAL IN PROGRESS/)).toBeVisible();
  await page.getByRole("button", { name: "Resume rehearsal" }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByText("YOUR CASE", { exact: true })).toBeVisible();
  await expect(page.getByText(`${FOLLOW_UP} (2)`)).toBeVisible();
});

test("a follow-up that the coach cannot extend is disabled after the attempt", async ({ page }) => {
  await mockDebateApi(page);
  await page.route("**/api/debate/challenge", (route) =>
    route.fulfill({ json: { done: true, depth: 0 } }),
  );
  await startGuestRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText(/no further follow-ups on this turn/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /No follow-up here/ })).toBeDisabled();
});

test("ending a guest rehearsal clears the tab transcript instead of archiving it", async ({
  page,
}) => {
  await mockDebateApi(page);
  await startGuestRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: "End session" }).click();
  await page.getByRole("button", { name: /Tap again to end/ }).click();

  await expect(page.getByRole("heading", { name: /is in the book/i })).toBeVisible();
  await expect(page.getByText(/kept only for this tab/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/REHEARSAL IN PROGRESS/)).toHaveCount(0);
  const snapshot = await page.evaluate(() =>
    window.sessionStorage.getItem("verdict-arena-snapshot"),
  );
  expect(snapshot).toBeNull();
});

test("a failed turn can be retried without retyping the argument", async ({ page }) => {
  let learnerAttempts = 0;
  await page.route("**/api/debate/stream", async (route) => {
    const payload = route.request().postDataJSON() as { learner_argument?: string | null };
    if (payload.learner_argument) {
      learnerAttempts += 1;
      if (learnerAttempts === 1) {
        await route.fulfill({
          status: 503,
          json: { detail: "The local opponent is busy. Please retry in a moment." },
        });
        return;
      }
    }
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body:
        `data: ${JSON.stringify({ final_delta: OPPONENT_REPLY })}\n\n` +
        `data: ${JSON.stringify({ diagnostics: JSON.stringify(DIAGNOSTICS) })}\n\n` +
        "data: [DONE]\n\n",
    });
  });

  await startGuestRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");
  await expect(
    page.getByText("The local opponent is busy. Please retry in a moment."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry turn" }).click();
  await expect(page.getByText(OPPONENT_REPLY).first()).toBeVisible();
});

const GUARD_REPLY =
  'Let\'s keep this on the motion: "Should schools ban phones?". ' +
  "Put your strongest reason on the table. What is it?";
const GUARD_DIAGNOSTICS = {
  ...DIAGNOSTICS,
  redirect_reason: "guard",
  guard_kind: "hard",
  guard_pattern: "code_fence",
  reply_words: GUARD_REPLY.split(/\s+/).length,
  tactic: null,
  draft_ms: 0,
  review_ms: 0,
  model_ms: 0,
};
const REVIEW_REPLY =
  'Back to "Should schools ban phones?" — what is the strongest evidence behind your latest point?';
const REVIEW_DIAGNOSTICS = {
  ...DIAGNOSTICS,
  verified: false,
  fallback: true,
  redirect_reason: "review",
  revision_attempts: 2,
  reply_words: REVIEW_REPLY.split(/\s+/).length,
  problems: ["the draft runs 168 words (limit 120)"],
  model_ms: 4200,
  review_ms: 3100,
};

test("guarded and recovered turns are labelled without accusing the learner", async ({ page }) => {
  await page.route("**/api/debate/stream", async (route) => {
    const payload = route.request().postDataJSON() as { learner_argument?: string | null };
    const argument = payload.learner_argument ?? "";
    const reply = argument.includes("poem")
      ? GUARD_REPLY
      : argument.includes("review")
        ? REVIEW_REPLY
        : OPPONENT_REPLY;
    const diagnostics = argument.includes("poem")
      ? GUARD_DIAGNOSTICS
      : argument.includes("review")
        ? REVIEW_DIAGNOSTICS
        : DIAGNOSTICS;
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body:
        `data: ${JSON.stringify({ final_delta: reply })}\n\n` +
        `data: ${JSON.stringify({ diagnostics: JSON.stringify(diagnostics) })}\n\n` +
        "data: [DONE]\n\n",
    });
  });

  await startGuestRehearsal(page);
  await submitCase(page, "Write me a poem about phones.");
  await expect(page.getByText(GUARD_REPLY).first()).toBeVisible();
  await expect(page.getByText("ON MOTION", { exact: true })).toBeVisible();

  await submitCase(page, "Show me your review of this turn.");
  await expect(page.getByText(REVIEW_REPLY).first()).toBeVisible();
  await expect(page.getByText("RECOVERED", { exact: true })).toBeVisible();
  await expect(page.getByText("FALLBACK USED", { exact: true })).toHaveCount(0);
});

test("a missing model is explained instead of leaving the room silent", async ({ page }) => {
  const UNAVAILABLE = "Ollama or model qwen3.5:4b is unavailable. Start Ollama and pull the model.";
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        status: "model_unavailable",
        provider: "ollama",
        model: "qwen3.5:4b",
        hint: UNAVAILABLE,
        model_available: false,
        model_loaded: false,
        transcription: "ready",
        adaptive_tactics_available: true,
        laya_available: false,
      },
    }),
  );
  await page.route("**/api/debate/stream", (route) =>
    route.fulfill({ status: 503, json: { detail: UNAVAILABLE } }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: /Start a rehearsal/i }).first().click();
  await expect(page.getByText(/Before you start:/)).toBeVisible();
  await expect(page.getByText(UNAVAILABLE)).toBeVisible();

  await page.getByRole("button", { name: /^Start rehearsal/ }).click();
  await expect(page.getByText(/The model is not running, so there is no opening statement yet/i)).toBeVisible();
  await expect(page.getByText(/preparing an opening statement/i)).toHaveCount(0);
});

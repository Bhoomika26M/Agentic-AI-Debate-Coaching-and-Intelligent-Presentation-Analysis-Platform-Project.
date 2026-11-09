import { expect, test, type Page } from "@playwright/test";
import { mockHealth, seedSignedIn } from "./support";

const OPPONENT_REPLY =
  "You lean on attention gains, but a ban moves the same distraction into the corridor. " +
  "Which evidence shows classroom focus improving without it?";
const FOLLOW_UP = "Which study shows attention improving after a ban?";
const SPOKEN_LEARNER = "Phones away help students focus on the lesson.";
const SPOKEN_OPPONENT = "How would you show the change came from the ban?";
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

async function mockSupabase(page: Page) {
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").pop();
    if (request.method() === "GET") {
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
      if (table === "debate_sessions" || table === "debate_turns" || table === "learning_plans") {
        return route.fulfill({ json: [] });
      }
      if (table === "debate_analyses") return route.fulfill({ json: null });
      return route.fulfill({ json: [] });
    }
    if (table === "debate_sessions" && request.method() === "POST") {
      return route.fulfill({ status: 201, json: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } });
    }
    return route.fulfill({ status: 204 });
  });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: {} }));
}

function streamBody(reply: string, diagnostics = DIAGNOSTICS) {
  return (
    `data: ${JSON.stringify({ final_delta: reply })}\n\n` +
    `data: ${JSON.stringify({ diagnostics: JSON.stringify(diagnostics) })}\n\n` +
    "data: [DONE]\n\n"
  );
}

async function mockDebateApi(page: Page) {
  await page.route("**/api/debate/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: streamBody(OPPONENT_REPLY),
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

async function mockVoiceRoom(page: Page) {
  await page.routeWebSocket(/\/ws\/voice/, (socket) => {
    socket.onMessage((message) => {
      if (typeof message !== "string") {
        // Echo a finished turn so both sides reach the arena transcript.
        socket.send(JSON.stringify({ type: "state", state: "thinking" }));
        socket.send(JSON.stringify({ type: "transcript", speaker: "learner", content: SPOKEN_LEARNER }));
        socket.send(JSON.stringify({ type: "transcript", speaker: "opponent", content: SPOKEN_OPPONENT }));
        socket.send(JSON.stringify({ type: "state", state: "idle" }));
        return;
      }
      const payload = JSON.parse(message) as { type?: string };
      if (payload.type === "auth") {
        socket.send(JSON.stringify({ type: "authenticated" }));
        return;
      }
      if (payload.type === "start") {
        socket.send(
          JSON.stringify({
            type: "ready",
            tts: "kokoro",
            persona_voices: {},
            recognition: "local",
            turn_end_ms: 1100,
          }),
        );
        socket.send(JSON.stringify({ type: "started", topic: "Test motion", persona: "skeptic", reply_length: "standard" }));
      }
    });
  });
}

async function openSetup(page: Page) {
  await seedSignedIn(page);
  await mockSupabase(page);
  await mockHealth(page);
  await page.goto("/");
  const setupButton = page.getByRole("button", { name: "Set up debate" }).first();
  await expect(setupButton).toBeVisible();
  await setupButton.click();
  await expect(page.getByRole("heading", { name: /Set up your debate/ })).toBeVisible();
}

async function startRehearsal(page: Page, minutes?: number) {
  await openSetup(page);
  for (const heading of ["Your motion", "Choose your side.", "Your opponent", "Set the round."]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    if (heading === "Choose your side.") {
      // The affirmative (For) side opens, so pick Against to put the opponent first.
      await page.locator(".fixture-side-options").getByRole("button", { name: /Against/ }).click();
    }
    if (heading === "Set the round." && minutes) {
      await page.getByLabel("Debate duration in minutes").fill(String(minutes));
    }
    if (heading !== "Set the round.") {
      await page.getByRole("button", { name: "Continue" }).click();
    }
  }
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(page.getByText("LIVE REHEARSAL")).toBeVisible();
  await expect(page.getByText(OPPONENT_REPLY).first()).toBeVisible();
  await expect(page.getByText("CHECKED", { exact: true })).toBeVisible();
  await expect(page.getByText("PROBE EVIDENCE", { exact: true })).toBeVisible();
}

async function submitCase(page: Page, text: string) {
  const composer = page.getByLabel(/Your argument/);
  await composer.fill(text);
  await composer.press("Enter");
  await expect(page.getByText("YOUR CASE", { exact: true }).first()).toBeVisible();
}

test("a signed-in learner can press two follow-ups, then resume the transcript", async ({ page }) => {
  await mockDebateApi(page);
  await startRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 1 OF 2")).toBeVisible();
  await expect(
    page.locator(".message-challenge").first().getByText("TURN 01", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow-ups done/ })).toBeDisabled();

  await page.getByRole("button", { name: "Return home" }).click();
  await expect(page.getByText("REHEARSAL IN PROGRESS")).toBeVisible();
  await page.reload();
  await expect(page.getByText("REHEARSAL IN PROGRESS")).toBeVisible();
  await page.getByRole("button", { name: "Resume rehearsal" }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByText("YOUR CASE", { exact: true })).toBeVisible();
  await expect(page.getByText(`${FOLLOW_UP} (2)`)).toBeVisible();
});

test("a follow-up the coach cannot extend is disabled after the attempt", async ({ page }) => {
  await mockDebateApi(page);
  await page.route("**/api/debate/challenge", (route) =>
    route.fulfill({ json: { done: true, depth: 0 } }),
  );
  await startRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText(/no further follow-ups on this turn/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /No follow-up here/ })).toBeDisabled();
});

test("ending a rehearsal clears its resumable snapshot", async ({ page }) => {
  await mockDebateApi(page);
  await page.route("**/api/debate/analyze/stream", (route) =>
    route.fulfill({ status: 503, json: { detail: "Analysis is outside this rehearsal test." } }),
  );
  await startRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");

  await page.getByRole("button", { name: "Finish & review" }).click();
  await page.getByRole("button", { name: /Tap again to finish/ }).click();
  await expect(page.getByRole("heading", { name: /closes the round/i })).toBeVisible();
  await page.getByRole("button", { name: "Skip the take" }).click();
  await expect(page.getByText(/Delivery stays unscored/i)).toBeVisible();
  await expect(page.getByText(/15% of the weighted total/i)).toBeVisible();
  await page.getByRole("button", { name: /Skip — see my scores/ }).click();
  await expect(page.getByText(/DEBATE REVIEW — COMPLETED/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /is in the book/i })).toBeVisible();
  await expect(page.getByText("RECOMMENDED NEXT")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rematch this round" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("REHEARSAL IN PROGRESS")).toHaveCount(0);
  const snapshot = await page.evaluate(() => window.sessionStorage.getItem("verdict-arena-snapshot"));
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
      body: streamBody(OPPONENT_REPLY),
    });
  });

  await startRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");
  await expect(page.getByText("The local opponent is busy. Please retry in a moment.")).toBeVisible();
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
    const guarded = argument.includes("poem");
    const recovered = argument.includes("review");
    const reply = guarded ? GUARD_REPLY : recovered ? REVIEW_REPLY : OPPONENT_REPLY;
    const diagnostics = guarded ? GUARD_DIAGNOSTICS : recovered ? REVIEW_DIAGNOSTICS : DIAGNOSTICS;
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: streamBody(reply, diagnostics),
    });
  });

  await startRehearsal(page);
  await submitCase(page, "Write me a poem about phones.");
  await expect(page.getByText(GUARD_REPLY).first()).toBeVisible();
  await expect(page.getByText("ON MOTION", { exact: true })).toBeVisible();

  await submitCase(page, "Show me your review of this turn.");
  await expect(page.getByText(REVIEW_REPLY).first()).toBeVisible();
  await expect(page.getByText("RECOVERED", { exact: true })).toBeVisible();
  await expect(page.getByText("FALLBACK USED", { exact: true })).toHaveCount(0);
});

test("a missing model is explained instead of leaving the room silent", async ({ page }) => {
  const unavailable = "Ollama or model qwen3.5:4b is unavailable. Start Ollama and pull the model.";
  await seedSignedIn(page);
  await mockSupabase(page);
  await page.route("**/api/health*", (route) =>
    route.fulfill({
      json: {
        status: "model_unavailable",
        provider: "ollama",
        model: "qwen3.5:4b",
        hint: unavailable,
        model_available: false,
        model_loaded: false,
        transcription: "ready",
        adaptive_tactics_available: true,
        laya_available: false,
      },
    }),
  );
  await page.route("**/api/debate/stream", (route) =>
    route.fulfill({ status: 503, json: { detail: unavailable } }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Set up debate" }).first().click();
  await expect(page.getByText(/Before you start:/)).toBeVisible();
  await expect(page.getByText(unavailable)).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(
    page.getByText(/The model is not running, so there is no opening statement yet/i),
  ).toBeVisible();
  await expect(page.getByText(/preparing an opening statement/i)).toHaveCount(0);
});

test("a complete spoken turn sends microphone audio and renders both transcript lines", async ({
  page,
}) => {
  const received: Array<string | "binary"> = [];
  await mockDebateApi(page);
  await startRehearsal(page);

  await page.routeWebSocket(/\/ws\/voice/, (socket) => {
    socket.onMessage((message) => {
      if (typeof message !== "string") {
        received.push("binary");
        socket.send(JSON.stringify({ type: "state", state: "thinking" }));
        socket.send(JSON.stringify({ type: "transcript", speaker: "learner", content: SPOKEN_LEARNER }));
        socket.send(JSON.stringify({ type: "reply", text: SPOKEN_OPPONENT, verified: true }));
        socket.send(JSON.stringify({ type: "transcript", speaker: "opponent", content: SPOKEN_OPPONENT }));
        socket.send(JSON.stringify({ type: "state", state: "idle" }));
        return;
      }
      const payload = JSON.parse(message) as { type?: string };
      received.push(payload.type ?? "unknown");
      if (payload.type === "auth") {
        socket.send(JSON.stringify({ type: "authenticated" }));
        return;
      }
      if (payload.type === "start") {
        socket.send(
          JSON.stringify({
            type: "ready",
            tts: "kokoro",
            persona_voices: {},
            recognition: "local",
            turn_end_ms: 1100,
          }),
        );
        socket.send(JSON.stringify({ type: "started", topic: "Test motion", persona: "skeptic", reply_length: "standard" }));
      }
    });
  });

  await page.getByRole("button", { name: "Open voice debate" }).click();
  const dialog = page.getByRole("dialog");
  const microphone = dialog.getByRole("button", { name: "Hold to speak your turn" });
  await expect(microphone).toBeEnabled();
  await microphone.hover();
  await page.mouse.down();
  await expect(dialog.getByRole("button", { name: "Release to send your spoken turn" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.mouse.up();

  await expect.poll(() => received.filter((message) => message === "binary").length).toBeGreaterThan(0);
  await expect(dialog.locator(".voice-line.learner").getByText(SPOKEN_LEARNER)).toBeVisible();
  await expect(dialog.locator(".voice-line.opponent").getByText(SPOKEN_OPPONENT)).toBeVisible();
  expect(received).toContain("utterance_start");
});

test("a spoken round ends in the voice room with the closing-take choice", async ({ page }) => {
  await mockDebateApi(page);
  await mockVoiceRoom(page);
  await page.route("**/api/debate/analyze/stream", (route) =>
    route.fulfill({ status: 503, json: { detail: "Analysis is outside this rehearsal test." } }),
  );
  await startRehearsal(page);

  await page.getByRole("button", { name: "Open voice debate" }).click();
  const dialog = page.getByRole("dialog");
  const microphone = dialog.getByRole("button", { name: "Hold to speak your turn" });
  await expect(microphone).toBeEnabled();

  // One spoken turn, so the round has a transcript and a voice exchange.
  await microphone.hover();
  await page.mouse.down();
  await expect(dialog.getByRole("button", { name: "Release to send your spoken turn" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(dialog.locator(".voice-line.learner")).toBeVisible();

  // End the round with the same handler the clock calls. The arena's button
  // sits behind the modal, so trigger it directly rather than waiting minutes.
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".end-button")?.click());
  await expect(page.getByRole("button", { name: /Tap again to finish/ })).toBeVisible();
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".end-button")?.click());

  // The room takes the closing take itself instead of handing the learner
  // back to the typed arena.
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Closing take" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /closes the round/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /is in the book/i })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Skip the take" }).click();
  await expect(dialog.getByText(/Delivery stays unscored/i)).toBeVisible();
  await dialog.getByRole("button", { name: /Skip — see my scores/ }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /is in the book/i })).toBeVisible();
  // The room already asked for the take, so the page gate is not shown again.
  await expect(page.getByRole("heading", { name: /closes the round/i })).toHaveCount(0);
});

test("the score run can be stopped and resumed from the verdict", async ({ page }) => {
  await mockDebateApi(page);
  let reviewCalls = 0;
  await page.route("**/api/debate/analyze/stream", async (route) => {
    reviewCalls += 1;
    // Hold the review open so the stop control is reachable, then fail it.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route
      .fulfill({ status: 503, json: { detail: "Analysis is outside this rehearsal test." } })
      .catch(() => {});
  });

  await startRehearsal(page);
  await submitCase(page, "Schools should ban phones because attention improves in class.");
  await page.getByRole("button", { name: "Finish & review" }).click();
  await page.getByRole("button", { name: /Tap again to finish/ }).click();
  await page.getByRole("button", { name: "Skip the take" }).click();
  await page.getByRole("button", { name: /Skip — see my scores/ }).click();

  await page.getByRole("button", { name: "Stop scoring" }).click();
  await expect(page.getByText("SCORING STOPPED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop scoring" })).toHaveCount(0);

  await page.getByRole("button", { name: "Resume scoring" }).click();
  await expect(page.getByRole("button", { name: "Stop scoring" })).toBeVisible();
  await expect.poll(() => reviewCalls).toBeGreaterThanOrEqual(2);
  // Once the run ends the control goes away; only the failure stays on screen.
  await expect(page.getByRole("alert")).toContainText(/outside this rehearsal test/i);
  await expect(page.getByRole("button", { name: "Stop scoring" })).toHaveCount(0);
});

test("a brief tap on hold to speak shows an inline hint without a screen-shifting error banner", async ({
  page,
}) => {
  await mockDebateApi(page);
  await startRehearsal(page);

  await page.routeWebSocket(/\/ws\/voice/, (socket) => {
    socket.onMessage((message) => {
      if (typeof message !== "string") return;
      const payload = JSON.parse(message) as { type?: string };
      if (payload.type === "auth") {
        socket.send(JSON.stringify({ type: "authenticated" }));
        return;
      }
      if (payload.type === "start") {
        socket.send(
          JSON.stringify({
            type: "ready",
            tts: "kokoro",
            persona_voices: {},
            recognition: "local",
            turn_end_ms: 1100,
          }),
        );
        socket.send(JSON.stringify({ type: "started", topic: "Test motion", persona: "skeptic", reply_length: "standard" }));
      }
    });
  });

  await page.getByRole("button", { name: "Open voice debate" }).click();
  const dialog = page.getByRole("dialog");
  const microphone = dialog.getByRole("button", { name: "Hold to speak your turn" });
  await expect(microphone).toBeEnabled();

  // Quick tap: mouse down and immediate mouse up (< 500ms)
  await microphone.hover();
  await page.mouse.down();
  await page.waitForTimeout(50);
  await page.mouse.up();

  // Ensure no error banner popup was triggered
  await expect(dialog.locator(".voice-alerts .voice-error")).toHaveCount(0);
  // Ensure the exchange empty state didn't switch to a microphone access error
  await expect(dialog.getByText(/Microphone access needs attention|Voice input needs attention/i)).toHaveCount(0);
  // Ensure the inline quiet hint is shown in the heard note
  await expect(dialog.locator(".voice-heard-note")).toContainText("Hold the key a little longer so the turn registers.");
});

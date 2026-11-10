import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mockHealth, seedSignedIn } from "./support";

// Two seconds of 16 kHz speech-shaped audio, also used as the fake microphone.
const SPOKEN_CLIP = readFileSync(
  fileURLToPath(new URL("./fixtures/spoken.wav", import.meta.url)),
);

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

test("a lagging playback queue never duplicates the opponent's reply", async ({ page }) => {
  const first = "First, the ban changes the corridor.";
  const second = "Second, attention has to be measured.";
  const reply = `${first} ${second}`;
  await mockDebateApi(page);
  await startRehearsal(page);

  await page.routeWebSocket(/\/ws\/voice/, (socket) => {
    socket.onMessage((message) => {
      if (typeof message !== "string") {
        socket.send(JSON.stringify({ type: "state", state: "thinking" }));
        socket.send(JSON.stringify({ type: "transcript", speaker: "learner", content: SPOKEN_LEARNER }));
        socket.send(JSON.stringify({ type: "reply", text: reply, verified: true }));
        // The pipeline sends every clip and then the canonical transcript,
        // while the browser is still playing the first sentence.
        for (const [index, text] of [first, second].entries()) {
          socket.send(JSON.stringify({
            type: "caption",
            text,
            index,
            total: 2,
            duration_ms: 2000,
            sample_rate: 16000,
          }));
          socket.send(SPOKEN_CLIP);
        }
        socket.send(JSON.stringify({ type: "transcript", speaker: "opponent", content: reply }));
        socket.send(JSON.stringify({ type: "state", state: "listening" }));
        return;
      }
      const payload = JSON.parse(message) as { type?: string };
      if (payload.type === "auth") {
        socket.send(JSON.stringify({ type: "authenticated" }));
        return;
      }
      if (payload.type === "start") {
        socket.send(JSON.stringify({
          type: "ready",
          tts: "kokoro",
          persona_voices: {},
          recognition: "local",
          turn_end_ms: 1100,
        }));
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
  await page.waitForTimeout(1200);
  await page.mouse.up();

  const replyLines = dialog.locator(".voice-line.opponent").filter({ hasText: first });
  await expect(replyLines).toHaveCount(1);
  // Sentence two starts after the transcript has already arrived. If the
  // archive line were committed at transcript time, that start would open a
  // second chatbox underneath it.
  await page.waitForTimeout(2600);
  await expect(replyLines).toHaveCount(1);
  await expect(dialog.locator(".voice-line.opponent.is-streaming")).toHaveCount(0);
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
  // The room carries the round clock, so time is visible without the arena.
  await expect(dialog.locator(".voice-clock")).toContainText(/0[45]:\d\d/);

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
  await expect(dialog.locator(".voice-clock")).toHaveCount(0);
  await expect(dialog.getByText("Round complete")).toBeVisible();
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

test("Act V records a closing take and reviews it with the verdict automatically", async ({ page }) => {
  // Whisper segments often arrive with a leading space; the closing transcript
  // must still match the analyzed text so the verdict does not re-run analysis.
  const closingTranscript = " Phones away help students focus on the lesson.";
  const deliveryReview = {
    transcript: closingTranscript,
    segments: [{ text: closingTranscript, start: 0, end: 2 }],
    signals: {
      wpm: 120,
      words: 8,
      duration_sec: 2,
      filler_count: 0,
      filler_rate_per_100w: 0,
      pause_count: 0,
      longest_pause_sec: 0,
      repetition_count: 0,
      revision_count: 0,
      prolongation_count: 0,
      events: [],
    },
    retained: false,
  };
  const deliveryReport = {
    transcript: closingTranscript,
    communication_score: 4,
    strengths: ["Steady pace."],
    drills: [{
      start: 0,
      end: 2,
      pattern: "steady",
      what_happened: "The close stayed at one pace.",
      try_this: "Land the final claim a little slower.",
      example: "That is why the ban should stand.",
    }],
    next_line: "Keep the closing claim in one sentence.",
  };
  const report = {
    ratings: {
      clarity: { score: 4, note: "Clear claim." },
      relevance: { score: 4, note: "On the motion." },
      evidence_strength: { score: 3, note: "One example." },
      logical_consistency: { score: 4, note: "Consistent case." },
      persuasiveness: { score: 4, note: "Direct appeal." },
    },
    fallacies: [],
    strengths: ["Clear structure."],
    next_steps: ["Add one more source."],
    counterarguments: [],
    gaps: [],
  };
  const verdict = {
    overall: 4.2,
    dimensions: [
      { key: "argument", weight_pct: 30, score: 4, note: "Clear case.", citations: [] },
      { key: "evidence", weight_pct: 20, score: 3, note: "One example.", citations: [] },
      { key: "logical", weight_pct: 20, score: 4, note: "Consistent.", citations: [] },
      { key: "rebuttal", weight_pct: 15, score: 4, note: "Answers the reply.", citations: [] },
      { key: "communication", weight_pct: 15, score: 4.5, note: "Steady close.", citations: [] },
    ],
    gaps: [],
  };
  let transcribeCalls = 0;
  let secondAnalysisCalls = 0;
  let closingStatement = "";
  let judgedDelivery = "";

  await mockDebateApi(page);
  await page.route(/\/api\/presentation\/transcribe$/, (route) => {
    transcribeCalls += 1;
    return route.fulfill({ json: deliveryReview });
  });
  await page.route(/\/api\/presentation\/coach$/, (route) =>
    route.fulfill({ json: deliveryReport }),
  );
  await page.route(/\/api\/debate\/analyze\/stream$/, (route) => {
    const payload = route.request().postDataJSON() as { closing_statement?: string };
    closingStatement = payload.closing_statement ?? "";
    return route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: `event: review\ndata: ${JSON.stringify(report)}\n\ndata: [DONE]\n\n`,
    });
  });
  // The closing words now ride the single transcript pass. A second full
  // analysis here would mean the duplicate work is back.
  await page.route(/\/api\/debate\/analyze$/, (route) => {
    secondAnalysisCalls += 1;
    return route.fulfill({ json: report });
  });
  await page.route(/\/api\/debate\/judge$/, (route) => {
    const payload = route.request().postDataJSON() as { delivery?: { transcript?: string } | null };
    judgedDelivery = payload.delivery?.transcript ?? "";
    return route.fulfill({ json: verdict });
  });

  await startRehearsal(page);
  // Keep the archive writes successful so the verdict shows the final score
  // instead of a save-retry banner.
  await page.route("**/rest/v1/debate_analyses*", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: null });
    return route.fulfill({ status: 201, json: { session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } });
  });
  await page.route("**/rest/v1/presentation_feedbacks*", (route) =>
    route.fulfill({ status: 201, json: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } }),
  );
  await submitCase(page, "Schools should ban phones because attention improves in class.");
  await page.getByRole("button", { name: "Finish & review" }).click();
  await page.getByRole("button", { name: /Tap again to finish/ }).click();

  await expect(page.getByRole("heading", { name: /closes the round/i })).toBeVisible();
  await page.getByRole("button", { name: "Record a closing take" }).click();
  // Act V is only the recording booth: delivery is reviewed after the verdict
  // handoff, never from a second button inside the booth.
  await expect(page.getByRole("button", { name: "Review delivery" })).toHaveCount(0);
  await page.getByLabel("Upload audio file").setInputFiles({
    name: "closing.wav",
    mimeType: "audio/wav",
    buffer: SPOKEN_CLIP,
  });
  await expect(page.getByText("TAKE READY")).toBeVisible();

  await page.getByRole("button", { name: "Continue to the verdict" }).click();

  await expect(page.getByRole("heading", { name: /is in the book/i })).toBeVisible();
  await expect(page.getByText(/Closing take reviewed\. Your weighted score now includes delivery\./)).toBeVisible();
  await expect(page.locator(".score-figure")).toContainText("84");
  await expect(page.getByRole("img", { name: "communication scores 90 of 100" })).toBeVisible();
  await expect.poll(() => transcribeCalls).toBe(1);
  expect(secondAnalysisCalls).toBe(0);
  expect(closingStatement).toContain("Phones away");
  expect(judgedDelivery).toContain("Phones away");
});

test("a voice closing take is handed from the room to the verdict review", async ({ page }) => {
  const transcript = "Phones away help students focus on the lesson.";
  let transcribeCalls = 0;
  await mockDebateApi(page);
  await mockVoiceRoom(page);
  await page.route(/\/api\/presentation\/transcribe$/, (route) => {
    transcribeCalls += 1;
    return route.fulfill({
      json: {
        transcript,
        segments: [{ text: transcript, start: 0, end: 2 }],
        signals: {
          wpm: 120,
          words: 8,
          duration_sec: 2,
          filler_count: 0,
          filler_rate_per_100w: 0,
          pause_count: 0,
          longest_pause_sec: 0,
          repetition_count: 0,
          revision_count: 0,
          prolongation_count: 0,
          events: [],
        },
        retained: false,
      },
    });
  });
  await page.route(/\/api\/presentation\/coach$/, (route) =>
    route.fulfill({
      json: {
        transcript,
        communication_score: 4,
        strengths: ["Steady pace."],
        drills: [{
          start: 0,
          end: 2,
          pattern: "steady",
          what_happened: "The close stayed at one pace.",
          try_this: "Land the final claim a little slower.",
          example: "That is why the ban should stand.",
        }],
        next_line: "Keep the closing claim in one sentence.",
      },
    }),
  );
  await page.route("**/api/debate/analyze/stream", (route) =>
    route.fulfill({ status: 503, json: { detail: "Analysis is outside this rehearsal test." } }),
  );
  await startRehearsal(page);

  await page.getByRole("button", { name: "Open voice debate" }).click();
  const dialog = page.getByRole("dialog");
  const microphone = dialog.getByRole("button", { name: "Hold to speak your turn" });
  await expect(microphone).toBeEnabled();
  await microphone.hover();
  await page.mouse.down();
  await expect(dialog.getByRole("button", { name: "Release to send your spoken turn" })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(dialog.locator(".voice-line.learner")).toBeVisible();

  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".end-button")?.click());
  await expect(page.getByRole("button", { name: /Tap again to finish/ })).toBeVisible();
  await page.evaluate(() => document.querySelector<HTMLButtonElement>(".end-button")?.click());
  await expect(dialog.getByRole("region", { name: "Closing take" })).toBeVisible();

  await dialog.getByRole("button", { name: "Record a closing take" }).click();
  await expect(dialog.getByRole("button", { name: "Review delivery" })).toHaveCount(0);
  await dialog.getByLabel("Upload audio file").setInputFiles({
    name: "closing.wav",
    mimeType: "audio/wav",
    buffer: SPOKEN_CLIP,
  });
  await dialog.getByRole("button", { name: "Continue to the verdict" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /is in the book/i })).toBeVisible();
  // The take left the room and was analyzed automatically; the transcript
  // review in this test is intentionally outside the mocked surface.
  await expect.poll(() => transcribeCalls).toBe(1);
  await expect(page.getByRole("alert")).toContainText(/outside this rehearsal test/i);
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

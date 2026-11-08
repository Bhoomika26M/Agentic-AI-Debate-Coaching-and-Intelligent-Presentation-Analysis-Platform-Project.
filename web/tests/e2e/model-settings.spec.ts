import { expect, test, type Page } from "@playwright/test";
import { USER_ID, seedSignedIn } from "./support";

const GEMMA = "gemma4:e4b";

async function mockSupabase(page: Page) {
  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").pop();
    if (request.method() === "GET") {
      if (table === "profiles") {
        return route.fulfill({
          json: {
            user_id: USER_ID,
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

test("switching the local model reaches the next health check and debate turn", async ({ page }) => {
  const healthModels: string[] = [];
  const turnModels: Array<string | undefined> = [];

  await seedSignedIn(page);
  await mockSupabase(page);
  await page.route("**/api/health*", (route) => {
    healthModels.push(new URL(route.request().url()).searchParams.get("model") ?? "");
    return route.fulfill({
      json: {
        status: "ready",
        model_available: true,
        adaptive_tactics_available: true,
        laya_available: false,
      },
    });
  });
  await page.route("**/api/debate/stream", async (route) => {
    const payload = route.request().postDataJSON() as { model?: string };
    turnModels.push(payload.model);
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body:
        `data: ${JSON.stringify({ final_delta: "Which evidence supports that?" })}\n\n` +
        "data: [DONE]\n\n",
    });
  });

  await page.goto("/");
  await page.waitForFunction(() => window.location.hash === "#/home");
  await page.evaluate(() => {
    window.location.hash = "#/settings";
  });

  await expect(page.getByRole("heading", { name: "Local model" })).toBeVisible();
  const gemma = page.getByRole("radio", { name: /Gemma 4 E4B/ });
  await gemma.click();
  await expect(gemma).toHaveAttribute("aria-checked", "true");

  const stored = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "{}").model,
    `verdict-app-settings-v1-${USER_ID}`,
  );
  expect(stored).toBe(GEMMA);

  await page.evaluate(() => {
    window.location.hash = "#/home";
  });
  await page.getByRole("button", { name: "Set up debate" }).first().click();
  await expect(page.getByRole("heading", { name: /Set up your debate/ })).toBeVisible();
  await expect.poll(() => healthModels).toContain(GEMMA);

  for (const heading of ["Your motion", "Choose your side.", "Your opponent"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    if (heading === "Choose your side.") {
      // The affirmative side opens, so pick Against to let the opponent speak first.
      await page.locator(".fixture-side-options").getByRole("button", { name: /Against/ }).click();
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(page.getByRole("heading", { name: "Set the round." })).toBeVisible();
  await page.getByRole("button", { name: "Start rehearsal" }).click();

  await expect(page.getByText("LIVE REHEARSAL")).toBeVisible();
  await expect.poll(() => turnModels).toContain(GEMMA);
});

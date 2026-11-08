import { expect, type Page } from "@playwright/test";

export const USER_ID = "11111111-1111-4111-8111-111111111111";

export type Theme = "classic" | "new";

/**
 * Put a signed-in learner in localStorage before the app boots. The new theme
 * is the default, so every flow test starts on the programme home.
 */
export async function seedSignedIn(page: Page, theme: Theme = "new") {
  const session = {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "learner-a@example.com",
      app_metadata: {},
      user_metadata: {},
      created_at: "2026-10-01T10:00:00.000Z",
    },
  };
  await page.addInitScript(
    ([key, value, doneKey, prefsKey, prefs, settingsKey, settings]) => {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem(doneKey, "done");
      window.localStorage.setItem(prefsKey, prefs);
      window.localStorage.setItem(settingsKey, settings);
    },
    [
      "sb-test-auth-token",
      JSON.stringify(session),
      `verdict-onboarding-v2-${USER_ID}`,
      `verdict-learner-prefs-v1-${USER_ID}`,
      JSON.stringify({
        focus: ["argument", "confidence"],
        purpose: "university",
        goal: "structure",
        experience: "developing",
        completedAt: "2026-10-20T10:00:00.000Z",
      }),
      `verdict-app-settings-v1-${USER_ID}`,
      JSON.stringify({
        adaptiveTactics: true,
        usePracticeHistory: true,
        streamReplies: true,
        replyLength: "standard",
        theme,
        model: "qwen3.5:4b",
      }),
    ],
  );
}

export async function mockHealth(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route("**/api/health*", (route) =>
    route.fulfill({
      json: {
        status: "ready",
        model_available: true,
        adaptive_tactics_available: true,
        laya_available: false,
        ...overrides,
      },
    }),
  );
}

export async function goToHome(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => window.location.hash === "#/home");
}

export async function goToAccount(page: Page, heading: RegExp = /Your progress, in focus\./) {
  await goToHome(page);
  await page.evaluate(() => {
    window.location.hash = "#/account";
  });
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

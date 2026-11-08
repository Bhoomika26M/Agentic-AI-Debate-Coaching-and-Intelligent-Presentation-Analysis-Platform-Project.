import { expect, test, type Page } from "@playwright/test";
import { USER_ID, goToAccount, goToHome, seedSignedIn } from "./support";

const TOPICS = [
  "Should schools ban phones?",
  "Should cities make public transport free?",
  "Is AI a threat to creative work?",
  "Should voting be compulsory?",
  "Should universities abolish legacy admissions?",
  "Should social media verify every user?",
  "Should governments tax sugary drinks?",
  "Should we ban single-use plastics?",
];

const SESSIONS = TOPICS.map((topic, index) => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index}`,
  topic,
  learner_position: index % 2 === 0 ? "for" : "against",
  persona: index % 3 === 0 ? "skeptic" : index % 3 === 1 ? "strategist" : "diplomat",
  difficulty: index % 2 === 0 ? "challenge" : "warm-up",
  duration_minutes: 5,
  status: index === 2 || index === 5 ? "in_progress" : "completed",
  started_at: `2026-10-${String(20 - index).padStart(2, "0")}T10:00:00.000Z`,
  finished_at: index === 2 || index === 5 ? null : `2026-10-${String(20 - index).padStart(2, "0")}T10:05:00.000Z`,
  created_at: `2026-10-${String(20 - index).padStart(2, "0")}T10:00:00.000Z`,
}));

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
    kind: "standard",
    challenge_depth: null,
    challenge_target: null,
  },
];

const PROFILE = {
  user_id: USER_ID,
  display_name: "Learner A",
  experience: "developing",
  goals: "Hold my nerve in cross-examination.",
  retain_audio: false,
  purpose: "university",
  practice_goal: "structure",
  focus_areas: ["argument", "confidence"],
  preferences_updated_at: "2026-10-20T10:00:00.000Z",
  // No saved settings: the local copy must keep deciding the theme.
  app_settings: null,
};

async function mockSupabase(page: Page) {
  await page.route("**/rest/v1/**", async (route) => {
    if (route.request().method() !== "GET") return route.fulfill({ status: 204 });
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").pop();
    if (table === "profiles") return route.fulfill({ json: PROFILE });
    if (table === "debate_sessions") {
      return route.fulfill({ json: url.search.includes("id=eq.") ? SESSIONS[0] : SESSIONS });
    }
    if (table === "debate_turns") return route.fulfill({ json: TURNS });
    if (table === "debate_analyses") return route.fulfill({ json: null });
    return route.fulfill({ json: [] });
  });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/health*", (route) =>
    route.fulfill({
      json: { status: "ready", adaptive_tactics_available: true, laya_available: false },
    }),
  );
}

test("the archive shows five sessions first and expands on demand", async ({ page }) => {
  await seedSignedIn(page);
  await mockSupabase(page);
  await goToAccount(page);

  await page.getByRole("tab", { name: "Archive" }).click();
  await expect(page.getByRole("heading", { name: "Saved debates" })).toBeVisible();
  await expect(page.locator(".archive-row")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Show all 8 sessions/ })).toBeVisible();

  await page.getByRole("button", { name: /Show all 8 sessions/ }).click();
  await expect(page.locator(".archive-row")).toHaveCount(8);
  await expect(page.getByRole("button", { name: /Show latest 5/ })).toBeVisible();

  await page.getByRole("button", { name: /Show latest 5/ }).click();
  await expect(page.locator(".archive-row")).toHaveCount(5);
});

test("the home opens the delivery room as a first-class mode", async ({ page }) => {
  await seedSignedIn(page);
  await mockSupabase(page);

  await goToHome(page);
  await page.getByRole("button", { name: "Delivery", exact: true }).click();
  await expect(page.locator(".programme-header")).toBeVisible();
  await expect(page.locator(".verdict-header")).toHaveCount(0);
  await expect(page.getByText("DELIVERY ROOM / SOLO PRACTICE")).toBeVisible();
  await expect(page.getByText("THE MIC IS YOURS.")).toBeVisible();
});

test("opening a recent round from the home page opens that record in the archive", async ({ page }) => {
  await seedSignedIn(page);
  await mockSupabase(page);

  await goToHome(page);
  await expect(page.locator(".programme-recent-row")).toHaveCount(3);
  await page.locator(".programme-recent-row").first().click();

  await expect(page.getByRole("heading", { name: /Your progress, in focus\./ })).toBeVisible();
  await expect(
    page.locator(".record-detail").getByRole("heading", { name: TOPICS[0] }),
  ).toBeVisible();
  await expect(page.locator(".archive-row.selected")).toHaveCount(1);
});

test("settings keeps the profile, coach settings, and data together", async ({ page }) => {
  await seedSignedIn(page);
  await mockSupabase(page);
  await goToAccount(page);

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Learner profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your room" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How your debate coach works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your data" })).toBeVisible();
});

test("a guest deep link to the archive offers sign-in instead of the private view", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.location.hash === "#/");
  await page.evaluate(() => {
    window.location.hash = "#/account";
  });

  await expect(page.locator("#welcome-title")).toBeVisible();
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/#\/auth$/);
});

test("opening the account with no saved app settings keeps a classic learner classic", async ({ page }) => {
  await seedSignedIn(page, "classic");
  await mockSupabase(page);
  await goToHome(page);

  await page.evaluate(() => {
    window.location.hash = "#/account";
  });
  await expect(page.getByRole("heading", { name: /Your practice/ })).toBeVisible();

  const theme = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "{}").theme,
    `verdict-app-settings-v1-${USER_ID}`,
  );
  expect(theme).toBe("classic");
});

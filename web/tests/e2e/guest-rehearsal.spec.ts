import { expect, test, type Page } from "@playwright/test";

const OPPONENT_REPLY =
  "You lean on attention gains, but a ban moves the same distraction into the corridor. " +
  "Which evidence shows classroom focus improving without it?";
const FOLLOW_UP = "Which study shows attention improving after a ban?";

async function mockDebateApi(page: Page) {
  await page.route("**/api/debate/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream; charset=utf-8" },
      body: `data: ${JSON.stringify({ final_delta: OPPONENT_REPLY })}\n\ndata: [DONE]\n\n`,
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
}

async function submitCase(page: Page, text: string) {
  const composer = page.getByLabel(/Your argument/);
  await composer.fill(text);
  await composer.press("Enter");
  await expect(page.getByText("YOUR CASE", { exact: true })).toBeVisible();
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

  await page.getByRole("button", { name: /Ask a follow-up/ }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByRole("button", { name: /Follow-ups done/ })).toBeDisabled();

  // The active room lives in sessionStorage, so the same tab can resume it.
  await page.getByRole("button", { name: "Return home" }).click();
  await page.reload();
  await expect(page.getByText(/REHEARSAL IN PROGRESS/)).toBeVisible();
  await page.getByRole("button", { name: "Resume rehearsal" }).click();
  await expect(page.getByText("FOLLOW-UP 2 OF 2")).toBeVisible();
  await expect(page.getByText("YOUR CASE", { exact: true })).toBeVisible();
  await expect(page.getByText(`${FOLLOW_UP} (2)`)).toBeVisible();
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

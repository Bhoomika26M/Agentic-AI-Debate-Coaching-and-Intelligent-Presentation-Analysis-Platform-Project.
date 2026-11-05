import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const FAKE_MIC_AUDIO = fileURLToPath(new URL("./tests/e2e/fixtures/spoken.wav", import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${FAKE_MIC_AUDIO}`,
      ],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: ORIGIN,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      // Keep the suite hermetic: no real project, no real API origin.
      VITE_API_BASE_URL: "",
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});

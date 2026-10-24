export type ReplyLength = "concise" | "standard";

export type ApplicationSettings = {
  adaptiveTactics: boolean;
  usePracticeHistory: boolean;
  replyLength: ReplyLength;
};

const DEFAULT_SETTINGS: ApplicationSettings = {
  adaptiveTactics: true,
  usePracticeHistory: true,
  replyLength: "standard",
};

const settingsKey = (userId: string) => `verdict-app-settings-v1-${userId}`;
const memoryCache = new Map<string, ApplicationSettings>();

export function normalizeApplicationSettings(value: unknown): ApplicationSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const raw = value as Record<string, unknown>;
  return {
    adaptiveTactics: typeof raw.adaptiveTactics === "boolean" ? raw.adaptiveTactics : DEFAULT_SETTINGS.adaptiveTactics,
    usePracticeHistory: typeof raw.usePracticeHistory === "boolean" ? raw.usePracticeHistory : DEFAULT_SETTINGS.usePracticeHistory,
    replyLength: raw.replyLength === "concise" ? "concise" : "standard",
  };
}

export function loadApplicationSettings(userId: string): ApplicationSettings {
  const cached = memoryCache.get(userId);
  if (cached) return { ...cached };
  try {
    const stored = window.localStorage.getItem(settingsKey(userId));
    const settings = stored ? normalizeApplicationSettings(JSON.parse(stored)) : { ...DEFAULT_SETTINGS };
    memoryCache.set(userId, settings);
    return { ...settings };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function cacheApplicationSettings(userId: string, settings: ApplicationSettings): boolean {
  memoryCache.set(userId, normalizeApplicationSettings(settings));
  try {
    window.localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

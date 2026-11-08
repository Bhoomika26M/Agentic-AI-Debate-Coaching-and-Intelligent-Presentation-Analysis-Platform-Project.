export type ReplyLength = "concise" | "standard";
export type ThemePreference = "classic" | "new";

/** The local Ollama models the settings screen can switch between. */
export const LOCAL_MODEL_OPTIONS = [
  {
    id: "qwen3.5:4b",
    name: "Qwen 3.5 4B",
    detail: "The compact default. Quick replies for everyday rehearsals.",
  },
  {
    id: "gemma4:e4b",
    name: "Gemma 4 E4B",
    detail: "A different voice and reasoning style for varied practice.",
  },
] as const;

export type LocalModel = (typeof LOCAL_MODEL_OPTIONS)[number]["id"];
export const DEFAULT_LOCAL_MODEL: LocalModel = "qwen3.5:4b";

export function isLocalModel(value: unknown): value is LocalModel {
  return LOCAL_MODEL_OPTIONS.some((option) => option.id === value);
}

export type ApplicationSettings = {
  adaptiveTactics: boolean;
  usePracticeHistory: boolean;
  /** Show opponent replies in the exchange as they are written or spoken. */
  streamReplies: boolean;
  replyLength: ReplyLength;
  theme: ThemePreference;
  /** Which local Ollama model answers turns and reviews practice. */
  model: LocalModel;
};

const DEFAULT_SETTINGS: ApplicationSettings = {
  adaptiveTactics: true,
  usePracticeHistory: true,
  streamReplies: true,
  replyLength: "standard",
  theme: "new",
  model: DEFAULT_LOCAL_MODEL,
};

const settingsKey = (userId: string) => `verdict-app-settings-v1-${userId}`;
const memoryCache = new Map<string, ApplicationSettings>();

export function normalizeApplicationSettings(value: unknown): ApplicationSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const raw = value as Record<string, unknown>;
  return {
    adaptiveTactics: typeof raw.adaptiveTactics === "boolean" ? raw.adaptiveTactics : DEFAULT_SETTINGS.adaptiveTactics,
    usePracticeHistory: typeof raw.usePracticeHistory === "boolean" ? raw.usePracticeHistory : DEFAULT_SETTINGS.usePracticeHistory,
    streamReplies: typeof raw.streamReplies === "boolean" ? raw.streamReplies : DEFAULT_SETTINGS.streamReplies,
    replyLength: raw.replyLength === "concise" ? "concise" : "standard",
    theme: raw.theme === "classic" ? "classic" : "new",
    model: isLocalModel(raw.model) ? raw.model : DEFAULT_LOCAL_MODEL,
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
  const normalized = normalizeApplicationSettings(settings);
  memoryCache.set(userId, normalized);
  try {
    window.localStorage.setItem(settingsKey(userId), JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

import { supabase } from "../features/auth/supabase";

export type LearnerProfile = {
  display_name: string | null;
  experience: "new" | "developing" | "confident" | null;
  goals: string | null;
  retain_audio: boolean;
  purpose: string | null;
  practice_goal: string | null;
  focus_areas: string[];
  preferences_updated_at: string | null;
};

const COLUMNS = "display_name, experience, goals, retain_audio, purpose, practice_goal, focus_areas, preferences_updated_at";

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

export function emptyProfile(): LearnerProfile {
  return {
    display_name: null,
    experience: null,
    goals: null,
    retain_audio: false,
    purpose: null,
    practice_goal: null,
    focus_areas: [],
    preferences_updated_at: null,
  };
}

export async function loadProfile(userId: string): Promise<LearnerProfile | null> {
  const { data, error } = await requireClient().from("profiles")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Omit<LearnerProfile, "focus_areas"> & { focus_areas: string[] | null };
  return { ...row, focus_areas: row.focus_areas ?? [] };
}

export async function saveProfile(userId: string, profile: LearnerProfile) {
  const { error } = await requireClient().from("profiles").upsert({
    user_id: userId,
    display_name: profile.display_name,
    experience: profile.experience,
    goals: profile.goals,
    retain_audio: profile.retain_audio,
    purpose: profile.purpose,
    practice_goal: profile.practice_goal,
    focus_areas: profile.focus_areas,
    preferences_updated_at: profile.preferences_updated_at,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

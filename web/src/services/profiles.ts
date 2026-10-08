import { supabase } from "../features/auth/supabase";

export type LearnerProfile = {
  display_name: string | null;
  experience: "new" | "developing" | "confident" | null;
  goals: string | null;
  retain_audio: boolean;
};

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

export async function loadProfile(userId: string): Promise<LearnerProfile | null> {
  const { data, error } = await requireClient().from("profiles")
    .select("display_name, experience, goals, retain_audio")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as LearnerProfile | null) ?? null;
}

export async function saveProfile(userId: string, profile: LearnerProfile) {
  const { error } = await requireClient().from("profiles").upsert({
    user_id: userId,
    display_name: profile.display_name,
    experience: profile.experience,
    goals: profile.goals,
    retain_audio: profile.retain_audio,
  }, { onConflict: "user_id" });
  if (error) throw error;
}

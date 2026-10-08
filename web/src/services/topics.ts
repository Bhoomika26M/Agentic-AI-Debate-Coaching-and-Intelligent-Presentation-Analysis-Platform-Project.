import { supabase } from "../features/auth/supabase";

export type BankTopic = {
  id: string;
  title: string;
  domain: string | null;
  user_id: string | null;
};

function requireClient() {
  if (!supabase) throw new Error("Account storage is not configured.");
  return supabase;
}

export async function listBankTopics(): Promise<BankTopic[]> {
  const { data, error } = await requireClient().from("custom_topics")
    .select("id, title, domain, user_id")
    .order("created_at", { ascending: true })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as BankTopic[];
}

export async function addBankTopic(userId: string, title: string, domain?: string | null) {
  const { data, error } = await requireClient().from("custom_topics").insert({
    user_id: userId,
    title,
    domain: domain ?? null,
  }).select("id, title, domain, user_id").single();
  if (error) throw error;
  return data as BankTopic;
}

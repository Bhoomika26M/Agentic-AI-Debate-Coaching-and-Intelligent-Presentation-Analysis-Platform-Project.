// Deploy with: supabase functions deploy delete-account
// The function verifies the caller's JWT, then removes only that auth user with
// the platform-provided service-role key. Never expose that key to the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }
  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers,
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceRole || !anonKey) {
    return new Response(JSON.stringify({ error: "Server is not configured" }), {
      status: 503,
      headers,
    });
  }

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
      headers,
    });
  }

  const userId = data.user.id;
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Auth cascades remove database rows, but storage objects need explicit cleanup.
  let audioCleared = false;
  for (let pass = 0; pass < 20; pass += 1) {
    const { data: files, error: listError } = await admin.storage
      .from("presentation-audio")
      .list(userId, { limit: 100 });
    if (listError) {
      return new Response(JSON.stringify({ error: "Stored audio could not be removed" }), {
        status: 500,
        headers,
      });
    }
    if (!files || files.length === 0) {
      audioCleared = true;
      break;
    }
    const { error: removeError } = await admin.storage
      .from("presentation-audio")
      .remove(files.map((file) => `${userId}/${file.name}`));
    if (removeError) {
      return new Response(JSON.stringify({ error: "Stored audio could not be removed" }), {
        status: 500,
        headers,
      });
    }
  }
  if (!audioCleared) {
    return new Response(JSON.stringify({ error: "Stored audio is too large to remove in one pass" }), {
      status: 500,
      headers,
    });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: "Account deletion failed" }), {
      status: 500,
      headers,
    });
  }
  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers });
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — never import this from a "use client" component.
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

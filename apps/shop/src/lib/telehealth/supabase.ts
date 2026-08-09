import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Aura Telehealth uses its OWN Supabase project, kept separate from the shop/engine
// project so the telehealth business can spin out cleanly as its own company later.
// Service-role key bypasses RLS — never import this from a "use client" component.
export function getTelehealthSupabaseClient(): SupabaseClient {
  const url = process.env.TELEHEALTH_SUPABASE_URL;
  const serviceRoleKey = process.env.TELEHEALTH_SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing TELEHEALTH_SUPABASE_URL environment variable");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing TELEHEALTH_SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

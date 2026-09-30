"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

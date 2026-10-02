// Public values only (safe in the browser). The service-role key never lives here.
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anonKey };
}

// Where email links (verify, reset) send people back to.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://auraprotocols.com").replace(/\/$/, "");
}

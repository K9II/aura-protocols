import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import { SESSION_ONLY_COOKIE, sessionCookieOptions } from "@/lib/supabase/session-only";

// Auth-only client bound to the visitor's cookies. Table access still goes
// through the service-role client after the DAL has verified the session.
//
// "Remember me" unchecked means the auth cookies must stay session-only
// across every later request too — including a background token refresh
// triggered from here with no opts passed (dal.ts, /api/me/gate). Those
// calls fall back to the aura_session_only marker cookie gateSignInAction
// set at sign-in; an explicit opts.sessionOnly (sign-in itself) always wins.
export async function createSupabaseServerClient(opts: { sessionOnly?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();
  const sessionOnly = opts.sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === "1";
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, sessionCookieOptions(options ?? {}, sessionOnly, value));
        } catch {
          // Called from a Server Component (read-only cookies). proxy.ts refreshes sessions.
        }
      },
    },
  });
}

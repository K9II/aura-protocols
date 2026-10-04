import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";

// Auth-only client bound to the visitor's cookies. Table access still goes
// through the service-role client after the DAL has verified the session.
export async function createSupabaseServerClient(opts: { sessionOnly?: boolean } = {}) {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) {
            // Session-only: no maxAge/expires, so the browser drops it on close.
            // A delete (empty value) keeps its options so it still clears.
            const { maxAge: _m, expires: _e, ...rest } = options ?? {};
            cookieStore.set(name, value, opts.sessionOnly && value ? rest : options);
          }
        } catch {
          // Called from a Server Component (read-only cookies). proxy.ts refreshes sessions.
        }
      },
    },
  });
}

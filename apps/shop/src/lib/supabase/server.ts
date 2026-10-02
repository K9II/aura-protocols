import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/supabase/env";

// Auth-only client bound to the visitor's cookies. Table access still goes
// through the service-role client after the DAL has verified the session.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = publicSupabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component (read-only cookies). proxy.ts refreshes sessions.
        }
      },
    },
  });
}

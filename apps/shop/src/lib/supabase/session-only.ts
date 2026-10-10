// "Remember me" unchecked: this marker cookie is readable in the browser
// (not httpOnly) so both the browser and server Supabase clients can agree
// that auth cookies should die with the browser session. No "server-only"
// import — src/lib/supabase/client.ts (browser) reads it too.
export const SESSION_ONLY_COOKIE = "aura_session_only";

type CookieWriteOptions = { maxAge?: number; expires?: Date | string | number } & Record<string, unknown>;

// Pure: strips maxAge/expires from a cookie's write options when the write
// is session-only and carries a real value. A delete (empty value) always
// keeps its options — including maxAge: 0 — so it still clears.
export function sessionCookieOptions<T extends CookieWriteOptions>(options: T, sessionOnly: boolean, value: string): T {
  if (!sessionOnly || !value) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest as T;
}

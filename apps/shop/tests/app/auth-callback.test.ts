import { describe, it, expect, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn(), signOut = vi.fn(), customerStatus = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession, signOut } }) }));
vi.mock("@/lib/dal", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/dal")>()), customerStatus }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

const get = async (q: string, cookie?: string) => {
  const { GET } = await import("@/app/auth/callback/route");
  return GET(new Request(`http://localhost/auth/callback${q}`, cookie ? { headers: { cookie } } : undefined));
};
// Set by @supabase/ssr when this browser started the Google sign-in (PKCE).
const VERIFIER = "sb-abc-auth-token-code-verifier=base64-xyz";
const ok = (id = "u1") => ({ data: { user: { id }, session: {} }, error: null });

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [exchangeCodeForSession, signOut, customerStatus, alertOwner]) f.mockReset();
    signOut.mockResolvedValue({ error: null });
  });

  it("an existing customer goes to the safe next path", async () => {
    exchangeCodeForSession.mockResolvedValue(ok());
    customerStatus.mockResolvedValue("ok");
    const res = await get("?code=abc&next=/checkout");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/checkout");
    expect(customerStatus).toHaveBeenCalledWith("u1");
  });

  it("a Google user with no customer row finishes their account first, keeping next", async () => {
    exchangeCodeForSession.mockResolvedValue(ok("g1"));
    customerStatus.mockResolvedValue("none");
    const res = await get("?flow=google&code=abc&next=/products");
    expect(res.headers.get("location")).toBe("http://localhost/finish-account?next=%2Fproducts");
  });

  it("an unsafe next falls back to /account", async () => {
    exchangeCodeForSession.mockResolvedValue(ok());
    customerStatus.mockResolvedValue("ok");
    expect((await get("?code=abc&next=https://evil.example")).headers.get("location")).toBe("http://localhost/account");
  });

  it("a blocked customer is signed out and told the account is closed", async () => {
    exchangeCodeForSession.mockResolvedValue(ok());
    customerStatus.mockResolvedValue("blocked");
    expect((await get("?flow=google&code=abc&next=/")).headers.get("location")).toBe("http://localhost/sign-in?error=closed");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("a banned user (Supabase refuses the sign-in) is told the account is closed", async () => {
    expect((await get("?flow=google&error=access_denied&error_code=user_banned&error_description=User+is+banned")).headers.get("location"))
      .toBe("http://localhost/sign-in?error=closed");
    exchangeCodeForSession.mockResolvedValue({ data: { user: null, session: null }, error: { code: "user_banned", message: "User is banned" } });
    expect((await get("?flow=google&code=abc")).headers.get("location")).toBe("http://localhost/sign-in?error=closed");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("email links that fail keep the link message", async () => {
    expect((await get("")).headers.get("location")).toBe("http://localhost/sign-in?error=link");
    exchangeCodeForSession.mockResolvedValue({ data: { user: null, session: null }, error: { message: "expired" } });
    expect((await get("?code=abc&next=/reset-password")).headers.get("location")).toBe("http://localhost/sign-in?error=link");
  });

  it("Google failures go to sign-in with the Google message; a cancel isn't alerted, a provider error is", async () => {
    expect((await get("?flow=google&error=access_denied&error_description=cancelled")).headers.get("location")).toBe("http://localhost/sign-in?error=google");
    expect(alertOwner).not.toHaveBeenCalled();
    expect((await get("?flow=google&error=server_error&error_description=Unable+to+exchange+external+code", `a=1; ${VERIFIER}`)).headers.get("location")).toBe("http://localhost/sign-in?error=google");
    expect(alertOwner).toHaveBeenCalledWith("Google sign-in failed", expect.stringContaining("server_error"));
    exchangeCodeForSession.mockResolvedValue({ data: { user: null, session: null }, error: { message: "invalid flow state" } });
    expect((await get("?flow=google&code=abc")).headers.get("location")).toBe("http://localhost/sign-in?error=google");
  });

  it("a provider error without the PKCE verifier cookie (nobody started a sign-in here) isn't alerted", async () => {
    expect((await get("?flow=google&error=server_error&error_description=x")).headers.get("location")).toBe("http://localhost/sign-in?error=google");
    expect((await get("?flow=google&error=server_error", "sb-abc-auth-token=x; other-code-verifier=y")).headers.get("location")).toBe("http://localhost/sign-in?error=google");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("a failed customer check is loud and fails closed", async () => {
    exchangeCodeForSession.mockResolvedValue(ok());
    customerStatus.mockRejectedValue(new Error("customer read failed: down"));
    expect((await get("?flow=google&code=abc&next=/")).headers.get("location")).toBe("http://localhost/sign-in?error=google");
    expect(alertOwner).toHaveBeenCalledWith("Sign-in account check failed", expect.stringContaining("u1"));
  });
});

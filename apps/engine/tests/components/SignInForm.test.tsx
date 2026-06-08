import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const signInWithOAuth = vi.fn();
const signInWithOtp = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("next=/dashboard"),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { signInWithOAuth, signInWithOtp },
  }),
}));

import SignInForm from "@/app/connect/SignInForm";

describe("SignInForm", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    signInWithOtp.mockReset().mockResolvedValue({ error: null });
  });

  it("starts Google OAuth with a same-origin callback that carries the safe next param", async () => {
    render(<SignInForm />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledOnce());
    const arg = signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    const redirectTo = arg.options.redirectTo as string;
    expect(redirectTo).toContain("/auth/callback");
    expect(redirectTo).toContain("next=%2Fdashboard");
  });

  it("surfaces an error when Google sign-in fails", async () => {
    signInWithOAuth.mockResolvedValue({ error: { message: "oauth provider not enabled" } });
    render(<SignInForm />);
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() =>
      expect(screen.getByText(/oauth provider not enabled/i)).toBeInTheDocument(),
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("still sends an email magic link via OTP", async () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByPlaceholderText(/you@example/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign-in link/i }));

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledOnce());
    expect(signInWithOtp.mock.calls[0][0]).toMatchObject({ email: "a@b.com" });
    expect(signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toContain("/auth/callback");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { letterStatusAction, subscribeLetterAction } = vi.hoisted(() => ({ letterStatusAction: vi.fn(), subscribeLetterAction: vi.fn() }));
vi.mock("@/app/letter-actions", () => ({ letterStatusAction, subscribeLetterAction }));

import AuraLetter from "@/components/store/AuraLetter";

describe("AuraLetter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("pitches promotions, research and store news — lots are one item — and says no spam", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: true, email: "a@lab.org", state: "none", verified: true });
    render(<AuraLetter />);
    expect(screen.getByRole("heading", { name: /the aura letter/i })).toBeInTheDocument();
    for (const t of [/promotions & member pricing/i, /research updates/i, /lot releases/i, /store news/i, /no spam/i]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    await waitFor(() => expect(screen.getByLabelText(/your account email/i)).toHaveValue("a@lab.org"));
  });

  it("subscribes and shows the confirmation", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: true, email: "a@lab.org", state: "none", verified: true });
    subscribeLetterAction.mockResolvedValue({ ok: true, state: "confirmed", email: "a@lab.org" });
    render(<AuraLetter />);
    await waitFor(() => expect(screen.getByRole("button", { name: /subscribe/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
  });

  it("keeps the box when already subscribed or waiting on verification, with the state inside it", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: true, email: "a@lab.org", state: "confirmed", verified: true });
    const { unmount } = render(<AuraLetter />);
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your account email/i)).toHaveValue("a@lab.org");
    expect(screen.getByRole("button", { name: "Subscribed ✓" })).toBeDisabled();
    unmount();
    letterStatusAction.mockResolvedValue({ signedIn: true, email: "a@lab.org", state: "pending", verified: false });
    render(<AuraLetter />);
    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Waiting on verification" })).toBeDisabled();
  });

  it("asks a signed-out visitor to sign in", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: false });
    render(<AuraLetter />);
    expect(await screen.findByRole("link", { name: "Sign in to subscribe →" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByLabelText(/your account email/i)).toBeInTheDocument();
  });

  it("shows the error when the subscribe fails", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: true, email: "a@lab.org", state: "none", verified: true });
    subscribeLetterAction.mockResolvedValue({ ok: false, message: "We couldn't add you just now — please try again." });
    render(<AuraLetter />);
    await waitFor(() => expect(screen.getByRole("button", { name: /subscribe/i })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't add you/i);
  });
});

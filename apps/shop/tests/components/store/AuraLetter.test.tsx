import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { letterStatusAction, subscribeLetterAction } = vi.hoisted(() => ({ letterStatusAction: vi.fn(), subscribeLetterAction: vi.fn() }));
vi.mock("@/app/letter-actions", () => ({ letterStatusAction, subscribeLetterAction }));

import AuraLetter from "@/components/store/AuraLetter";

const me = (state: string, verified = true) => ({ signedIn: true, email: "a@lab.org", state, verified });
const box = () => screen.getByLabelText(/email address/i);
const ready = () => waitFor(() => expect(box()).toHaveValue("a@lab.org"));
const send = () => { fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: /subscribe/i })); };

describe("AuraLetter", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("pitches research updates and research news — lots are one item — and says no spam", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    render(<AuraLetter />);
    expect(screen.getByRole("heading", { name: /the aura letter/i })).toBeInTheDocument();
    for (const t of [/research updates/i, /lot releases/i, /research news/i, /no spam/i]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/member pricing/i)).not.toBeInTheDocument();
    await ready();
  });

  it("subscribes the account email and shows the confirmation", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    subscribeLetterAction.mockResolvedValue({ ok: true, state: "confirmed", email: "a@lab.org" });
    render(<AuraLetter />);
    await ready();
    send();
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
  });

  it("shows the account email in a box that can't be changed", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    render(<AuraLetter />);
    await ready();
    expect(box()).toHaveAttribute("readonly");
    expect(screen.getByText(/we send to your account email/i)).toBeInTheDocument();
  });

  it("keeps the box when already subscribed or waiting on verification, with the state inside it", async () => {
    letterStatusAction.mockResolvedValue(me("confirmed"));
    const { unmount } = render(<AuraLetter />);
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    expect(box()).toHaveValue("a@lab.org");
    expect(screen.getByRole("button", { name: "Subscribed ✓" })).toBeDisabled();
    unmount();
    letterStatusAction.mockResolvedValue(me("pending", false));
    render(<AuraLetter />);
    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Waiting on verification" })).toBeDisabled();
  });

  it("asks a signed-out visitor to sign in", async () => {
    letterStatusAction.mockResolvedValue({ signedIn: false });
    render(<AuraLetter />);
    expect(await screen.findByRole("link", { name: "Sign in to subscribe →" })).toHaveAttribute("href", "/sign-in");
    expect(box()).toBeDisabled();
  });

  it("shows the error when the subscribe fails", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    subscribeLetterAction.mockResolvedValue({ ok: false, message: "We couldn't add you just now — please try again." });
    render(<AuraLetter />);
    await ready();
    send();
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't add you/i);
  });
});

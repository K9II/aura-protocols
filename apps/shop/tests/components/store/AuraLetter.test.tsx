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

  it("pitches promotions, research and store news — lots are one item — and says no spam", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    render(<AuraLetter />);
    expect(screen.getByRole("heading", { name: /the aura letter/i })).toBeInTheDocument();
    for (const t of [/promotions & member pricing/i, /research updates/i, /lot releases/i, /store news/i, /no spam/i]) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    await ready();
  });

  it("subscribes the account email and shows the confirmation", async () => {
    letterStatusAction.mockResolvedValue(me("none"));
    subscribeLetterAction.mockResolvedValue({ ok: true, state: "confirmed", email: "a@lab.org" });
    render(<AuraLetter />);
    await ready();
    send();
    expect(await screen.findByText(/you're on the list/i)).toBeInTheDocument();
    expect((subscribeLetterAction.mock.calls[0][0] as FormData).get("email")).toBe("a@lab.org");
  });

  it("takes a different address and says to check that inbox", async () => {
    letterStatusAction.mockResolvedValue(me("confirmed"));
    subscribeLetterAction.mockResolvedValue({ ok: true, state: "check_inbox", email: "lab@other.org" });
    render(<AuraLetter />);
    await ready();
    expect(screen.getByRole("button", { name: "Subscribed ✓" })).toBeDisabled();
    fireEvent.change(box(), { target: { value: "lab@other.org" } });
    // The account's "on the list" state no longer applies to the box.
    expect(screen.queryByText(/you're on the list/i)).not.toBeInTheDocument();
    send();
    expect(await screen.findByText(/check lab@other\.org/i)).toBeInTheDocument();
    expect((subscribeLetterAction.mock.calls[0][0] as FormData).get("email")).toBe("lab@other.org");
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

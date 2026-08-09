import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TelehealthStartVisit from "@/app/telehealth/TelehealthStartVisit";

describe("TelehealthStartVisit", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });

  it("shows the Start visit button and no modal initially", () => {
    render(<TelehealthStartVisit category="weight-loss" productId="p1" />);
    expect(screen.getByRole("button", { name: /start visit/i })).toBeInTheDocument();
    expect(screen.queryByText(/save your .* match to aura/i)).not.toBeInTheDocument();
  });

  it("opens a modal with the category-specific headline", () => {
    render(<TelehealthStartVisit category="mens-health" productId="p1" />);
    fireEvent.click(screen.getByRole("button", { name: /start visit/i }));
    expect(screen.getByText("Save your Men's Health match to Aura")).toBeInTheDocument();
  });

  it("captures the opt-in then routes to the hand-off", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const navigate = vi.fn();
    render(<TelehealthStartVisit category="weight-loss" productId="p1" navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: /start visit/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to my visit/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/telehealth/go/weight-loss/p1"));
    expect(fetch).toHaveBeenCalledWith(
      "/api/telehealth/optin",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", category: "weight-loss" }),
      }),
    );
  });

  it("still routes to the hand-off if the opt-in save fails (never blocks the visit)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network"));
    const navigate = vi.fn();
    render(<TelehealthStartVisit category="weight-loss" productId="p1" navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: /start visit/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: /continue to my visit/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/telehealth/go/weight-loss/p1"));
  });

  it("skips straight to the hand-off without capturing", () => {
    const navigate = vi.fn();
    render(<TelehealthStartVisit category="weight-loss" productId="p1" navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: /start visit/i }));
    fireEvent.click(screen.getByRole("button", { name: /skip and continue/i }));
    expect(navigate).toHaveBeenCalledWith("/telehealth/go/weight-loss/p1");
    expect(fetch).not.toHaveBeenCalled();
  });
});

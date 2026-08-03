import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeadMagnetForm from "@/components/LeadMagnetForm";

describe("LeadMagnetForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders an email input, a goal select with all 4 options, and a submit button", () => {
    render(<LeadMagnetForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    const select = screen.getByLabelText(/goal/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Weight Loss" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sleep & Recovery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /subscribe/i })).toBeInTheDocument();
  });

  it("posts to /api/subscribe and shows a success message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    render(<LeadMagnetForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/goal/i), {
      target: { value: "Weight Loss" },
    });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "reader@example.com", goal: "Weight Loss" }),
      })
    );
  });

  it("shows an error message if the request fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "bad" }),
    });

    render(<LeadMagnetForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "reader@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/goal/i), {
      target: { value: "Weight Loss" },
    });
    fireEvent.click(screen.getByRole("button", { name: /subscribe/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});

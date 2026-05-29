import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FeedbackWidget from "@/components/FeedbackWidget";

describe("FeedbackWidget", () => {
  it("posts thumbs-up with optional free text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackWidget recommendationId="rec-1" />);
    fireEvent.click(screen.getByRole("button", { name: /thumbs up/i }));
    expect(fetchMock).toHaveBeenCalledWith("/api/feedback", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ recommendationId: "rec-1", thumbs: "UP" });
  });

  it("sends the free-text payload when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<FeedbackWidget recommendationId="rec-2" />);
    fireEvent.change(screen.getByLabelText(/comments/i), { target: { value: "hrv felt off" } });
    fireEvent.click(screen.getByRole("button", { name: /thumbs down/i }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ thumbs: "DOWN", freeText: "hrv felt off" });
  });
});

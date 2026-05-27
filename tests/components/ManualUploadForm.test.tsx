import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ManualUploadForm from "@/components/ManualUploadForm";

describe("ManualUploadForm", () => {
  it("accepts pasted JSON and calls onSubmit with the parsed payload", () => {
    const onSubmit = vi.fn();
    render(<ManualUploadForm onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText(/paste/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: JSON.stringify({ capturedAt: "2026-05-23T07:00:00Z", recoveryScore: 60, hrvMs: 50, sleepHours: 7 }) },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ recoveryScore: 60 });
  });

  it("shows a validation error on malformed JSON", () => {
    const onSubmit = vi.fn();
    render(<ManualUploadForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/paste/i), { target: { value: "not json" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(screen.getByText(/could not parse/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

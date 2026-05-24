import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";
import { LEAD_MAGNET } from "@/lib/constants";

describe("EmailCapture", () => {
  it("renders the lead magnet title and a Beehiiv iframe pointing at the configured embed URL", () => {
    render(<EmailCapture />);
    expect(screen.getByText(LEAD_MAGNET.title)).toBeInTheDocument();
    const iframe = screen.getByTitle(/email signup/i) as HTMLIFrameElement;
    expect(iframe.src).toContain(LEAD_MAGNET.beehiivEmbedUrl);
  });
});

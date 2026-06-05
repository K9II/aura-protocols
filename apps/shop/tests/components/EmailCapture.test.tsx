import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";
import { LEAD_MAGNET } from "@/lib/constants";

describe("EmailCapture", () => {
  it("injects the Beehiiv loader script with the configured form id", async () => {
    const { container } = render(<EmailCapture />);
    const script = container.querySelector(
      `script[data-beehiiv-form="${LEAD_MAGNET.beehiivFormId}"]`,
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toContain(LEAD_MAGNET.beehiivLoaderSrc);
  });
});

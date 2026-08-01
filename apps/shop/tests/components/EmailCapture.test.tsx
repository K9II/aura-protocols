import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";
import { LEAD_MAGNET } from "@/lib/constants";

describe("EmailCapture", () => {
  it("renders the Brevo form iframe with the configured src", () => {
    const { container } = render(<EmailCapture />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(LEAD_MAGNET.brevoFormSrc);
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuraLockup from "@/components/AuraLockup";

describe("AuraLockup", () => {
  it("positions Protocols with CSS alone, centered under ura", () => {
    const { container } = render(<AuraLockup size={70} mode="static" />);
    const sub = container.querySelector("[data-lockup-sub]") as HTMLElement;
    expect(sub.textContent).toBe("Protocols");
    // A child of the "ura" word — not measured by JS.
    expect(sub.parentElement?.firstChild?.textContent).toBe("ura");
    expect(sub.parentElement?.style.position).toBe("relative");
    expect(sub.style.position).toBe("absolute");
    // Centered on the "ura" word it belongs to.
    expect(sub.style.left).toBe("50%");
    expect(sub.style.transform).toBe("translateX(-50%)");
    expect(screen.getByRole("img", { name: "Aura Protocols" })).toBeInTheDocument();
  });
});

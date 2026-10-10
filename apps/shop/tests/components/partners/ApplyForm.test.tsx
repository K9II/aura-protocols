import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/partners/actions", () => ({ applyPartnerAction: vi.fn() }));

describe("ApplyForm (option A, application record)", () => {
  it("three numbered sections; roles and audience sizes are radio choices; the placard shows the code discount", async () => {
    const { default: ApplyForm } = await import("@/components/partners/ApplyForm");
    const { container } = render(<ApplyForm codePct={10} />);
    expect([...container.querySelectorAll("legend")].map((l) => l.textContent)).toEqual(["Who you are", "Where you publish", "Your audience"]);
    expect(screen.getByRole("radio", { name: /Academic researcher/ }).getAttribute("name")).toBe("partnerType");
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("name") === "audienceSize")).toHaveLength(4);
    expect(container.textContent).toContain("saves 10%");
  });

  it("ticking a channel opens its handle field; Other opens a description", async () => {
    const { default: ApplyForm } = await import("@/components/partners/ApplyForm");
    render(<ApplyForm codePct={10} />);
    expect(screen.queryByRole("textbox", { name: "YouTube handle or link" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "YouTube" }));
    const handle = screen.getByRole("textbox", { name: "YouTube handle or link" }) as HTMLInputElement;
    expect([handle.name, handle.required]).toEqual(["h_youtube", true]);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Other/ }));
    expect((screen.getByRole("textbox", { name: "Other places you publish" }) as HTMLTextAreaElement).name).toBe("h_other");
  });

  it("\"How you'll share Aura\" is required and needs real text", async () => {
    const { default: ApplyForm } = await import("@/components/partners/ApplyForm");
    render(<ApplyForm codePct={10} />);
    const t = screen.getByLabelText(/How you.ll share Aura/) as HTMLTextAreaElement;
    expect([t.name, t.required, t.minLength]).toEqual(["promotion", true, 3]);
  });
});

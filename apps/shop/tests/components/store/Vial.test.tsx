import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Vial from "@/components/store/Vial";
import { catalogContent } from "@/data/catalog";
import { vialName, vialParts } from "@/lib/catalog";

// Nicknamed blends: scientific name on top, nickname in the small print (Alvester 2026-10-20,
// mock https://claude.ai/artifact/5Jztza1ZdMz4z1pz5GWGV3).
function drawn(slug: string) {
  const c = catalogContent.find((x) => x.slug === slug)!;
  const [label, label2] = vialName(c);
  const { container } = render(<Vial id={slug} label={label} label2={label2} parts={vialParts(c)} strength="10 mg" />);
  const texts = [...container.querySelectorAll("text")];
  const by = (t: string) => texts.find((el) => el.textContent === t);
  return { container, by };
}

describe("Vial: blend labels", () => {
  it("Wolverine: BPC-157 / over TB-500 at the two-line size, WOLVERINE in the small print", () => {
    const { container, by } = drawn("bpc-157-tb-500-blend");
    expect(by("BPC-157 /")!.getAttribute("font-size")).toBe("9.6");
    expect(by("TB-500")!.getAttribute("font-size")).toBe("9.6");
    expect(by("WOLVERINE")!.getAttribute("y")).toBe("141.5");
    expect(by("LYOPHILIZED")).toBeUndefined();
    expect(container.querySelector("svg")!.getAttribute("aria-label")).toBe("BPC-157 / TB-500 10 mg vial");
  });

  it("KLOW: four names two per line a size smaller, KLOW in the small print", () => {
    const { by } = drawn("bpc-157-tb-500-ghk-cu-kpv");
    expect(by("BPC-157 · TB-500")!.getAttribute("font-size")).toBe("6.9");
    expect(by("GHK-Cu · KPV")!.getAttribute("font-size")).toBe("6.9");
    expect(by("KLOW")!.getAttribute("letter-spacing")).toBe(".8");
  });

  it("a plain compound keeps LYOPHILIZED", () => {
    const { by } = drawn("bpc-157");
    expect(by("BPC-157")).toBeDefined();
    expect(by("LYOPHILIZED")).toBeDefined();
  });
});

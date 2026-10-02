import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MoleculeViewer from "@/components/store/MoleculeViewer";
import MoleculeGrid from "@/components/store/MoleculeGrid";
import { structurePanels } from "@/lib/structure";

const spin = vi.fn();
const viewer = { addModel: vi.fn(), setStyle: vi.fn(), zoomTo: vi.fn(), zoom: vi.fn(), spin, render: vi.fn(), clear: vi.fn() };
vi.mock("3dmol", () => ({ createViewer: vi.fn(() => viewer) }));

class IO { cb: IntersectionObserverCallback; constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
  observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
  disconnect() {} unobserve() {} takeRecords() { return []; } root = null; rootMargin = ""; thresholds = []; }

const bpc = structurePanels("bpc-157")[0];

describe("MoleculeViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IO);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("mol\n  V2000\n$$$$")));
    spin.mockClear();
  });

  it("shows a message, not an empty box, when the browser has no WebGL", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<MoleculeViewer structure={bpc} />);
    expect(await screen.findByText("3D model unavailable in this browser")).toBeInTheDocument();
  });

  it("loads the model and spins it when WebGL is available", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.addModel).toHaveBeenCalledWith(expect.stringContaining("V2000"), "sdf"));
    expect(spin).toHaveBeenCalledWith("y", 0.6);
  });

  it("does not spin under prefers-reduced-motion", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    expect(spin).not.toHaveBeenCalled();
  });
});

describe("MoleculeGrid", () => {
  it("renders one labelled panel per component", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<MoleculeGrid structures={structurePanels("bpc-157-tb-500-ghk-cu-kpv")} />);
    for (const name of ["BPC-157", "TB-500", "GHK-Cu", "KPV"]) expect(screen.getByText(name)).toBeInTheDocument();
  });
});

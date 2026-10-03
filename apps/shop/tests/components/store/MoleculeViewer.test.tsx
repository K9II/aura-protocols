import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import MoleculeViewer from "@/components/store/MoleculeViewer";
import MoleculeGrid from "@/components/store/MoleculeGrid";
import { structurePanels } from "@/lib/structure";

const rotate = vi.fn();
type Atom = { elem: string; x: number; y: number; z: number };
let atoms: Atom[] = [];
const viewer = {
  addModel: vi.fn(), setStyle: vi.fn(), zoomTo: vi.fn(), zoom: vi.fn(), rotate, resize: vi.fn(), render: vi.fn(), clear: vi.fn(),
  addCylinder: vi.fn(), selectedAtoms: vi.fn(() => atoms),
};
vi.mock("3dmol", () => ({
  createViewer: vi.fn((container: HTMLElement) => {
    container.appendChild(document.createElement("canvas"));
    return viewer;
  }),
}));

class IO { cb: IntersectionObserverCallback; constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
  observe() { this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
  disconnect() {} unobserve() {} takeRecords() { return []; } root = null; rootMargin = ""; thresholds = []; }

// Manual animation frames: frame() runs whatever is scheduled, 20 ms later.
let rafQueue = new Map<number, FrameRequestCallback>();
let rafId = 0;
let clock = 0;
function frame() {
  clock = Math.max(clock, performance.now()) + 20;
  const cbs = [...rafQueue.values()];
  rafQueue.clear();
  cbs.forEach((cb) => cb(clock));
}

const bpc = structurePanels("bpc-157")[0];
const ghk = structurePanels("ghk-cu")[0];

// Real coordinates from public/structures/ghk-cu.sdf: the Cu, its three
// coordinating nitrogens (2.06 / 2.28 / 2.06 Å), the imidazole carbon that
// sits 1.87 Å away (not a donor, so no line), and the far lysine nitrogen.
const GHK_ATOMS: Atom[] = [
  { elem: "Cu", x: 2.2114, y: -4.139, z: -0.6965 },
  { elem: "N", x: 2.8337, y: -2.6113, z: -1.9379 },
  { elem: "N", x: 0.589, y: -2.5502, z: -0.5115 },
  { elem: "N", x: 1.589, y: -5.6667, z: 0.5449 },
  { elem: "C", x: 1.291, y: -4.4385, z: 0.9072 },
  { elem: "N", x: -1.5502, y: 6.4514, z: 0.2296 },
];

describe("MoleculeViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IO);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("mol\n  V2000\n$$$$")));
    rafQueue = new Map();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { rafQueue.set(++rafId, cb); return rafId; });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => { rafQueue.delete(id); });
    rotate.mockClear();
    viewer.addCylinder.mockClear();
    viewer.zoom.mockClear();
    atoms = [];
  });

  it("shows a message, not an empty box, when the browser has no WebGL", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<MoleculeViewer structure={bpc} />);
    expect(await screen.findByText("3D model unavailable in this browser")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3D model of BPC-157 unavailable in this browser" })).toBeInTheDocument();
  });

  it("loads the model and spins it when WebGL is available", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.addModel).toHaveBeenCalledWith(expect.stringContaining("V2000"), "sdf"));
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    frame();
    frame();
    // The second frame is exactly 20 ms after the first: 20 ms at 24°/s.
    expect(rotate).toHaveBeenLastCalledWith(expect.closeTo(0.48, 5), "y");
  });

  it("zooms out after fitting so the spinning model stays inside the stage", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    expect(viewer.zoomTo).toHaveBeenCalled();
    expect(viewer.zoom).toHaveBeenCalledWith(0.8);
    expect(viewer.zoom.mock.invocationCallOrder[0]).toBeGreaterThan(viewer.zoomTo.mock.invocationCallOrder[0]);
  });

  it("draws a dashed line from copper to each coordinating N/O atom (GHK-Cu: 3)", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    atoms = GHK_ATOMS;
    render(<MoleculeViewer structure={ghk} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    expect(viewer.addCylinder).toHaveBeenCalledTimes(3);
    for (const [spec] of viewer.addCylinder.mock.calls) {
      expect(spec).toMatchObject({ dashed: true, radius: 0.06, color: "#B87333", start: { x: 2.2114, y: -4.139, z: -0.6965 } });
    }
  });

  it("draws no coordination lines for a molecule without copper", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    atoms = GHK_ATOMS.filter((a) => a.elem !== "Cu");
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    expect(viewer.addCylinder).not.toHaveBeenCalled();
  });

  it("does not spin under prefers-reduced-motion", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    frame();
    frame();
    expect(rotate).not.toHaveBeenCalled();
  });

  it("stops spinning when scrolled out of view and resumes when back", async () => {
    let report: (visible: boolean) => void = () => {};
    class ManualIO extends IO {
      observe() { report = (visible) => this.cb([{ isIntersecting: visible } as IntersectionObserverEntry], this as unknown as IntersectionObserver); report(true); }
    }
    vi.stubGlobal("IntersectionObserver", ManualIO);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.render).toHaveBeenCalled());
    frame();
    expect(rotate).toHaveBeenCalled();
    rotate.mockClear();
    act(() => report(false));
    frame();
    frame();
    expect(rotate).not.toHaveBeenCalled();
    act(() => report(true));
    frame();
    expect(rotate).toHaveBeenCalledWith(expect.any(Number), "y");
  });

  it("releases the WebGL context and removes the canvas on unmount", async () => {
    const loseContext = vi.fn();
    const glContext = { getExtension: vi.fn(() => ({ loseContext })) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(glContext as unknown as RenderingContext);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { container, unmount } = render(<MoleculeViewer structure={bpc} />);
    await waitFor(() => expect(viewer.addModel).toHaveBeenCalled());
    expect(container.querySelector("canvas")).not.toBeNull();

    unmount();

    expect(container.querySelector("canvas")).toBeNull();
    expect(loseContext).toHaveBeenCalled();
  });
});

describe("MoleculeGrid", () => {
  it("renders one labelled panel per component", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<MoleculeGrid structures={structurePanels("bpc-157-tb-500-ghk-cu-kpv")} />);
    for (const name of ["BPC-157", "TB-500", "GHK-Cu", "KPV"]) expect(screen.getByText(name)).toBeInTheDocument();
  });
});

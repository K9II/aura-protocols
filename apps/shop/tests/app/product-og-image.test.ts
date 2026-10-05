import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../helpers/live-catalog";

const { live, ogPicture } = vi.hoisted(() => ({ live: vi.fn(), ogPicture: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live }));
vi.mock("@/lib/og", () => ({ OG_SIZE: { width: 1200, height: 630 }, ogPicture }));
import Image from "@/app/products/[slug]/opengraph-image";

const shown = () => liveFixture().filter((c) => c.chemicalClass !== "Incretin & Amylin Analogs");
const image = (slug: string) => Image({ params: Promise.resolve({ slug }) });

describe("product share image", () => {
  beforeEach(() => {
    live.mockReset(); ogPicture.mockReset(); ogPicture.mockResolvedValue("png");
    live.mockResolvedValue({ all: liveFixture(), shown: shown(), lots: [] });
  });

  it("renders the emblem for a shown product", async () => {
    expect(await image("bpc-157")).toBe("png");
    expect(ogPicture).toHaveBeenCalledWith("emblem.png");
  });

  it("404s a hidden product", async () => {
    await expect(image("semaglutide")).rejects.toThrow();
    expect(ogPicture).not.toHaveBeenCalled();
  });

  it("still renders the emblem (it names no product) when the catalog can't be read", async () => {
    live.mockResolvedValue(null);
    expect(await image("bpc-157")).toBe("png");
  });
});

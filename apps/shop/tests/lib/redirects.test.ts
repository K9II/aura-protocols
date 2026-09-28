import { describe, it, expect } from "vitest";
import { buildRedirects } from "@/lib/redirects";

const find = (list: ReturnType<typeof buildRedirects>, source: string) => list.find((r) => r.source === source);

describe("redirects", () => {
  const list = buildRedirects({ blogPublished: false });

  it.each([
    ["/calculator", "/products"], ["/cheat-sheet", "/products"], ["/cheat-sheet/print", "/products"],
    ["/playbook", "/products"], ["/clinical-waitlist", "/products"], ["/masters", "/products"], ["/women", "/products"],
    ["/validate/:path*", "/"], ["/telehealth", "/"], ["/telehealth/:path*", "/"],
  ])("permanently redirects %s to %s", (source, destination) => {
    expect(find(list, source)).toEqual({ source, destination, permanent: true });
  });

  it("renames the old blend slugs", () => {
    expect(find(list, "/products/glow-stack")).toEqual({ source: "/products/glow-stack", destination: "/products/bpc-157-tb-500-ghk-cu", permanent: true });
    expect(find(list, "/products/klow-stack")?.destination).toBe("/products/bpc-157-tb-500-ghk-cu-kpv");
  });

  it("sends old per-product affiliate links to our own product page", () => {
    expect(find(list, "/go/aura-ignite-bpc-157")).toEqual({ source: "/go/aura-ignite-bpc-157", destination: "/products/bpc-157", permanent: true });
    expect(find(list, "/go/aura-pspeptides-glow-stack")?.destination).toBe("/products/bpc-157-tb-500-ghk-cu");
  });

  it("catches every other /go/ link last", () => {
    const i = list.findIndex((r) => r.source === "/go/:path*");
    expect(list[i]).toEqual({ source: "/go/:path*", destination: "/products", permanent: true });
    expect(i).toBe(list.length - 1 - 2); // followed only by the two blog rules
  });

  it("uses temporary blog redirects only while unpublished", () => {
    expect(find(list, "/blog/:path*")).toEqual({ source: "/blog/:path*", destination: "/", permanent: false });
    expect(find(buildRedirects({ blogPublished: true }), "/blog/:path*")).toBeUndefined();
  });
});

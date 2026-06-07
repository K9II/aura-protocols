import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/safe-next";

describe("safeNext", () => {
  it("allows a normal internal path", () => {
    expect(safeNext("/onboarding")).toBe("/onboarding");
  });
  it("allows an internal path with query", () => {
    expect(safeNext("/connect?next=/dashboard")).toBe("/connect?next=/dashboard");
  });
  it("falls back to /dashboard for null/undefined", () => {
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext(undefined)).toBe("/dashboard");
  });
  it("rejects absolute external URLs", () => {
    expect(safeNext("https://evil.com")).toBe("/dashboard");
  });
  it("rejects protocol-relative URLs", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
  });
  it("rejects backslash trick", () => {
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });
  it("honors a custom fallback", () => {
    expect(safeNext(null, "/connect")).toBe("/connect");
  });
});

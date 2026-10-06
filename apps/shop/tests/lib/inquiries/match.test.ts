import { describe, it, expect } from "vitest";
import { matchPlan, refFromSubject, replyAddress, sameEmail, tokenFromAddress } from "@/lib/inquiries/match";

const D = "in.auraprotocols.com";
const T = "0123456789abcdef0123456789abcdef";

describe("match", () => {
  it("builds and reads reply addresses (our domain only, 32 hex)", () => {
    expect(replyAddress(T, D)).toBe(`r-${T}@${D}`);
    expect(tokenFromAddress(`R-${T.toUpperCase()}@IN.AURAPROTOCOLS.COM`, D)).toBe(T);
    expect(tokenFromAddress(`"Aura" <r-${T}@${D}>`, D)).toBe(T);
    expect(tokenFromAddress(`r-${T}@evil.example`, D)).toBeNull();
    expect(tokenFromAddress(`r-123@${D}`, D)).toBeNull();
  });
  it("reads [Q-n] from a subject", () => {
    expect(refFromSubject("Re: Order question — AP-1052 [Q-1047]")).toBe(1047);
    expect(refFromSubject("Re: hello")).toBeNull();
  });
  it("prefers the token; falls back to the subject ref; else none", () => {
    expect(matchPlan({ recipients: ["support@x.com", `r-${T}@${D}`], subject: "[Q-9]" }, D)).toEqual({ kind: "token", token: T });
    expect(matchPlan({ recipients: [`r-bad@${D}`], subject: "Re: x [Q-1047]" }, D)).toEqual({ kind: "ref", ref: 1047 });
    expect(matchPlan({ recipients: [], subject: "Hello" }, D)).toEqual({ kind: "none" });
  });
  it("compares emails case- and space-insensitively", () => {
    expect(sameEmail(" Dana.W@Example.com", "dana.w@example.com")).toBe(true);
    expect(sameEmail("a@x.com", "b@x.com")).toBe(false);
  });
});

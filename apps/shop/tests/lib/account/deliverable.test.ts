import { describe, it, expect } from "vitest";
import { checkDeliverable } from "@/lib/account/deliverable";

const err = (code: string) => Object.assign(new Error(code), { code });

describe("checkDeliverable", () => {
  it("accepts a domain with an MX record", async () => {
    expect(await checkDeliverable("j@lab.org", async () => [{ exchange: "mx.lab.org", priority: 10 }])).toBe("ok");
  });

  it("rejects a disposable domain without a DNS call", async () => {
    let called = false;
    expect(await checkDeliverable("x@mailinator.com", async () => { called = true; return []; })).toBe("undeliverable");
    expect(called).toBe(false);
  });

  it("rejects a domain with no MX (ENOTFOUND / ENODATA / empty)", async () => {
    expect(await checkDeliverable("x@nope.invalid", async () => { throw err("ENOTFOUND"); })).toBe("undeliverable");
    expect(await checkDeliverable("x@nomx.example", async () => { throw err("ENODATA"); })).toBe("undeliverable");
    expect(await checkDeliverable("x@empty.example", async () => [])).toBe("undeliverable");
  });

  it("can't tell on a DNS timeout — 'unknown' (the account must verify first)", async () => {
    expect(await checkDeliverable("x@slow.example", async () => { throw err("ETIMEOUT"); })).toBe("unknown");
  });

  it("looks up an internationalised domain by its ASCII (punycode) form", async () => {
    const seen: string[] = [];
    expect(await checkDeliverable("x@müller.de", async (d) => { seen.push(d); return [{ exchange: "mx", priority: 1 }]; })).toBe("ok");
    expect(seen).toEqual(["xn--mller-kva.de"]);
  });

  it("rejects a domain that has no valid ASCII form", async () => {
    let called = false;
    expect(await checkDeliverable("x@xn--iñvalid.com", async () => { called = true; return []; })).toBe("undeliverable");
    expect(called).toBe(false);
  });

  it("rejects a malformed address", async () => {
    expect(await checkDeliverable("not-an-email", async () => [])).toBe("undeliverable");
  });
});

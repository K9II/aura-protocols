import { describe, it, expect } from "vitest";
import { messageFlags } from "@/lib/inquiries/flags";

const base = { headers: {} as Record<string, string>, fromEmail: "dana.w@example.com", spam: false };

describe("messageFlags", () => {
  it("a plain reply from the customer has no flags", () => {
    expect(messageFlags(base, "dana.w@example.com")).toEqual([]);
  });
  it.each([
    [{ "auto-submitted": "auto-replied" }], [{ "x-autoreply": "yes" }], [{ "x-autorespond": "1" }],
    [{ precedence: "bulk" }], [{ precedence: "auto_reply" }], [{ "content-type": "multipart/report; report-type=delivery-status" }],
  ])("auto-reply headers %j", (headers) => {
    expect(messageFlags({ ...base, headers }, "dana.w@example.com")).toEqual(["auto_reply"]);
  });
  it("Auto-Submitted: no is a person", () => {
    expect(messageFlags({ ...base, headers: { "auto-submitted": "no" } }, "dana.w@example.com")).toEqual([]);
  });
  it("mailer-daemon and postmaster are auto replies", () => {
    expect(messageFlags({ ...base, fromEmail: "MAILER-DAEMON@googlemail.com" }, "dana.w@example.com")).toEqual(["auto_reply", "other_sender"]);
  });
  it("spam verdict and another sender", () => {
    expect(messageFlags({ ...base, spam: true, fromEmail: "peter@gmail.com" }, "dana.w@example.com")).toEqual(["spam", "other_sender"]);
  });
});

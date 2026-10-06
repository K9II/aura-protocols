// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bodyText, parseRawEmail } from "@/lib/inquiries/mime";

const raw = readFileSync(join(__dirname, "..", "..", "fixtures", "mail", "reply-with-photo.eml"));

describe("parseRawEmail", () => {
  it("reads sender, recipients, subject, ids, text and attachments", async () => {
    const p = await parseRawEmail(new Uint8Array(raw));
    expect(p.fromEmail).toBe("dana.w@example.com");
    expect(p.fromName).toBe("Dana Whitfield");
    expect(p.to).toEqual(["r-0123456789abcdef0123456789abcdef@in.auraprotocols.com"]);
    expect(p.subject).toBe("Re: Order question — AP-1052 [Q-1047]");
    expect(p.messageId).toBe("<CAF-abc-123@mail.gmail.com>");
    expect(p.headers["in-reply-to"]).toBe("<0100abc@us-east-2.amazonses.com>");
    expect(bodyText(p)).toContain("Here you go — both vials and the box.");
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments[0]).toMatchObject({ filename: "box.png", mimeType: "image/png", inline: false });
    expect(p.attachments[0].size).toBe(p.attachments[0].content.byteLength);
  });
  it("falls back to the HTML part when there is no text part", () => {
    expect(bodyText({ text: "", html: "<p>Hi</p>" } as never)).toBe("Hi");
  });
});

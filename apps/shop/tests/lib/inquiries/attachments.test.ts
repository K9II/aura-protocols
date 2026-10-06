import { describe, it, expect } from "vitest";
import { safeFileName, sortAttachments } from "@/lib/inquiries/attachments";
import { ATTACHMENT_MAX_BYTES } from "@/lib/inquiries/constants";

const a = (filename: string | null, mimeType: string, size: number, inline = false) => ({ filename, mimeType, size, inline, content: new Uint8Array(0) });

describe("attachments", () => {
  it("keeps images and PDFs, drops other types by name", () => {
    const r = sortAttachments([a("IMG_4021.heic", "image/heic", 900_000), a("box.jpg", "image/jpeg", 400_000), a("invoice.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 20_000)]);
    expect(r.keep.map((k) => k.filename)).toEqual(["IMG_4021.heic", "box.jpg"]);
    expect(r.dropped).toEqual(["invoice.docx"]);
  });
  it("drops files over the size limit and beyond the per-email count", () => {
    const many = Array.from({ length: 7 }, (_, i) => a(`p${i}.png`, "image/png", 1000));
    const r = sortAttachments([a("big.pdf", "application/pdf", ATTACHMENT_MAX_BYTES + 1), ...many]);
    expect(r.keep).toHaveLength(5);
    expect(r.dropped).toEqual(["big.pdf", "p5.png", "p6.png"]);
  });
  it("ignores small inline signature images entirely", () => {
    const r = sortAttachments([a("image001.png", "image/png", 8000, true)]);
    expect(r).toEqual({ keep: [], dropped: [] });
  });
  it("names unnamed parts and makes storage-safe names", () => {
    expect(sortAttachments([a(null, "application/pdf", 10)]).keep[0].filename).toBe("attachment-1.pdf");
    expect(safeFileName("../My photo (1).HEIC")).toBe("My-photo-1.HEIC");
    expect(safeFileName("???")).toBe("file");
  });
});

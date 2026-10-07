import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NOW, inquiry } from "../helpers/inquiry-fixtures";

const m = vi.hoisted(() => ({
  requireOwner: vi.fn(), getThread: vi.fn(), applyInquiryEvent: vi.fn(), recordInquiryEvent: vi.fn(), listSavedReplies: vi.fn(), getCustomerDetail: vi.fn(),
  getOrderByNumber: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/inquiries/data", () => ({ getThread: m.getThread, applyInquiryEvent: m.applyInquiryEvent, recordInquiryEvent: m.recordInquiryEvent, listSavedReplies: m.listSavedReplies }));
vi.mock("@/lib/customers/data", () => ({ getCustomerDetail: m.getCustomerDetail }));
vi.mock("@/lib/orders", () => ({ getOrderByNumber: m.getOrderByNumber }));
vi.mock("@/lib/clock", () => ({ currentMs: () => NOW }));
vi.mock("@/app/admin/inquiries/actions", () => ({ replyAction: vi.fn(), statusAction: vi.fn(), topicAction: vi.fn(), linkAction: vi.fn(), unlinkAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import InquiryPage from "@/app/admin/inquiries/[ref]/page";

const params = (ref: string) => ({ params: Promise.resolve({ ref }) });
const msg = (o: Record<string, unknown>) => ({ id: "m", direction: "in", source: "email", from_email: "dana.w@example.com", body_text: "", full_text: null, delivery: null, flags: [], dropped_attachments: [], created_at: "2026-10-03T22:12:00Z", authorName: null, files: [], ...o });

describe("/admin/inquiries/[ref]", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset();
    m.requireOwner.mockResolvedValue({ id: "o1", fullName: "Kearney Adams" });
    m.listSavedReplies.mockResolvedValue([]);
    m.getOrderByNumber.mockResolvedValue(null);
    m.getThread.mockResolvedValue({
      inquiry: { ...inquiry(), token: "t" },
      messages: [
        msg({ id: "m1", source: "form", body_text: "Two of the vials arrived cracked.", created_at: "2026-10-03T20:48:00Z" }),
        msg({ id: "m2", direction: "out", source: "admin", from_email: "support@auraprotocols.com", body_text: "Could you reply with a photo?", delivery: "delivered", authorName: "Kearney", created_at: "2026-10-03T21:30:00Z" }),
        msg({ id: "m3", body_text: "Here you go.", full_text: "Here you go.\n\nOn Tue … wrote:\n> Could you…", files: [{ id: "f1", filename: "box.png", content_type: "image/png", size_bytes: 10, url: "https://x/box.png" }, { id: "f2", filename: "IMG_4021.heic", content_type: "image/heic", size_bytes: 10, url: "https://x/i.heic" }], dropped_attachments: ["invoice.docx"] }),
      ],
      events: [{ id: "e1", action: "customer_replied", detail: "2 attachments", at: "2026-10-03T22:12:00Z", actorName: null }],
    });
  });

  it("signs replies as Alvester, never the owner's account name", async () => {
    render(await InquiryPage(params("Q-1047")));
    const box = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;
    expect(box.value).toContain("— Alvester, Aura Protocols");
    expect(box.value).not.toMatch(/Kearney/);
  });

  it("404s a bad ref or an unknown inquiry", async () => {
    await expect(InquiryPage(params("AP-1"))).rejects.toThrow("NOT_FOUND");
    m.getThread.mockResolvedValue(null);
    await expect(InquiryPage(params("Q-9"))).rejects.toThrow("NOT_FOUND");
  });

  it("shows the conversation: form message, our delivered reply, the customer's email with files and the full text", async () => {
    render(await InquiryPage(params("Q-1047")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Order question — AP-1052");
    expect(screen.getByText("Two of the vials arrived cracked.")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "box.png" })).toHaveAttribute("src", "https://x/box.png");
    expect(screen.getByRole("link", { name: /IMG_4021\.heic/ })).toHaveAttribute("href", "https://x/i.heic");
    expect(screen.getByText("1 attachment not kept: invoice.docx")).toBeInTheDocument();
    expect(screen.getByText("Show full email")).toBeInTheDocument();
    expect(screen.getByText("No account for this email.")).toBeInTheDocument();
    expect(screen.getByText("Customer replied · 2 attachments")).toBeInTheDocument();
    expect(m.applyInquiryEvent).not.toHaveBeenCalled();
    // Both kept files (box.png, IMG_4021.heic) are photo types — "photos", not "files".
    expect(screen.getByText("2 photos", { exact: false })).toBeInTheDocument();
    // The order number doesn't match a real order (getOrderByNumber → null): plain text, no link.
    expect(screen.queryByRole("link", { name: "AP-1052" })).not.toBeInTheDocument();
  });

  it("the Order field links to the orders list when the order number matches a real order", async () => {
    m.getOrderByNumber.mockResolvedValue({ id: "ord1", order_number: "AP-1052" });
    render(await InquiryPage(params("Q-1047")));
    expect(m.getOrderByNumber).toHaveBeenCalledWith("AP-1052");
    expect(screen.getByRole("link", { name: "AP-1052" })).toHaveAttribute("href", "/admin/orders/AP-1052");
  });

  it("Messages says 'attachments' (not 'photos' or 'files') when the kept files are mixed", async () => {
    m.getThread.mockResolvedValue({
      inquiry: { ...inquiry(), token: "t" },
      messages: [msg({ files: [
        { id: "f1", filename: "box.png", content_type: "image/png", size_bytes: 10, url: "https://x/box.png" },
        { id: "f2", filename: "coa.pdf", content_type: "application/pdf", size_bytes: 10, url: "https://x/coa.pdf" },
      ] })],
      events: [],
    });
    render(await InquiryPage(params("Q-1047")));
    expect(screen.getByText("2 attachments", { exact: false })).toBeInTheDocument();
  });

  it("opening a new inquiry moves it to Needs reply and logs who opened it", async () => {
    m.getThread.mockResolvedValue({ inquiry: { ...inquiry({ status: "new" }), token: "t" }, messages: [msg({ body_text: "Hi" })], events: [] });
    m.applyInquiryEvent.mockResolvedValue({ from: "new", to: "needs_reply" });
    render(await InquiryPage(params("Q-1047")));
    expect(m.applyInquiryEvent).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "opened", { actorId: "o1" });
    expect(m.recordInquiryEvent).toHaveBeenCalledWith({ inquiryId: "11111111-1111-4111-8111-111111111111", action: "opened", actorId: "o1" });
    expect(screen.getAllByText("Needs reply").length).toBeGreaterThan(0);
  });

  it("a linked customer shows their card with recent orders and credit", async () => {
    m.getThread.mockResolvedValue({ inquiry: { ...inquiry({ customer_id: "c1" }), token: "t" }, messages: [], events: [] });
    m.getCustomerDetail.mockResolvedValue({
      id: "c1", fullName: "Dana Whitfield", email: "dana.w@example.com", createdAt: "2026-09-14T18:00:00Z", verifiedAt: "2026-09-14T18:05:00Z", blockedAt: null,
      orders: [{ id: "o1", order_number: "AP-1052", status: "shipped", created_at: "2026-10-01T18:00:00Z", total_cents: 26800 }],
      ledger: [{ amount_cents: 1000 }, { amount_cents: -400 }],
    });
    render(await InquiryPage(params("Q-1047")));
    expect(screen.getAllByText("AP-1052").length).toBeGreaterThan(0);
    expect(screen.getByText("$6.00")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
});

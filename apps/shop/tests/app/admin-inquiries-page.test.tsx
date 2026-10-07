import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NOW, inquiry } from "../helpers/inquiry-fixtures";
import { ownerStaff } from "../helpers/staff";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(), listInquiries: vi.fn(), inquiryTabCounts: vi.fn(), listUnmatched: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/inquiries/data", () => ({ listInquiries: m.listInquiries, inquiryTabCounts: m.inquiryTabCounts, listUnmatched: m.listUnmatched }));
vi.mock("@/lib/clock", () => ({ currentMs: () => NOW }));
vi.mock("@/app/admin/inquiries/actions", () => ({ dismissUnmatchedAction: vi.fn(), attachUnmatchedAction: vi.fn() }));
import InquiriesPage from "@/app/admin/inquiries/page";

const sp = (o: Record<string, string> = {}) => ({ searchParams: Promise.resolve(o) });

describe("/admin/inquiries", () => {
  beforeEach(() => {
    for (const f of Object.values(m)) f.mockReset();
    m.requirePermission.mockResolvedValue(ownerStaff({ id: "o1" }));
    m.inquiryTabCounts.mockResolvedValue({ open: 4, waiting: 3, closed: 41, all: 48, unmatched: 2 });
    m.listInquiries.mockResolvedValue({ total: 2, rows: [
      inquiry({ customer_id: "c1" }),
      inquiry({ id: "i2", ref: 1049, topic: "wholesale", status: "new", name: "P. Osei", organization: "Meridian Peptide Lab", email: "p.osei@meridianlab.org", customer_id: null, last_from: "customer", message_count: 1, last_preview: "Looking for 200+ vials monthly", last_customer_at: "2026-10-05T15:40:00Z" }),
    ] });
  });

  it("is owner-only", async () => {
    m.requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(InquiriesPage(sp())).rejects.toThrow("NOT_FOUND");
  });

  it("Open tab: tabs with counts, customer tag, topic, preview, waiting clock in red, status", async () => {
    render(await InquiriesPage(sp()));
    expect(screen.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open\s*4/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Unmatched\s*2/ })).toBeInTheDocument();
    const table = screen.getAllByRole("table")[0];
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Dana Whitfield");
    expect(within(rows[1]).getByText("Customer")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Dana:", { exact: false })).toBeInTheDocument();
    expect(within(rows[1]).getByText("3 days")).toHaveClass("red", { exact: false });
    expect(rows[2]).toHaveTextContent("Meridian Peptide Lab");
    expect(rows[2]).toHaveClass("unread");
    expect(within(rows[2]).getByText("Wholesale")).toBeInTheDocument();
    expect(within(rows[2]).getByText("New")).toBeInTheDocument();
    expect(m.listInquiries).toHaveBeenCalledWith({ tab: "open", topic: null, q: "", page: 1 });
    // The footer's "oldest waiting" figure is business days, not the row's
    // calendar-relative clock (that row shows "3 days" above).
    expect(screen.getByText(/4 open · oldest waiting 2 business days/)).toBeInTheDocument();
  });

  it("passes topic, search and page through", async () => {
    await InquiriesPage(sp({ tab: "closed", topic: "order", q: "AP-1052", page: "2" }));
    expect(m.listInquiries).toHaveBeenCalledWith({ tab: "closed", topic: "order", q: "AP-1052", page: 2 });
  });

  it("Unmatched tab: why it's there, Dismiss and Attach; spam collapsed", async () => {
    process.env.INBOUND_MAIL_DOMAIN = "in.auraprotocols.com";
    m.listUnmatched.mockResolvedValue({
      open: [{ id: "u1", ses_message_id: "s1", from_email: "peter.osei@gmail.com", from_name: "Peter Osei", to_address: "r-0123456789abcdef0123456789abcdef@in.auraprotocols.com", subject: "Re: We've got your message [Q-1049]", body_text: "Forwarding from my personal address", full_text: null, raw_key: "raw/s1", spam: false, attachment_names: [], created_at: "2026-10-06T15:05:00Z" }],
      spam: [{ id: "u2", ses_message_id: "s2", from_email: "x@spam.example", from_name: null, to_address: null, subject: "WIN", body_text: "…", full_text: null, raw_key: null, spam: true, attachment_names: [], created_at: "2026-10-05T15:05:00Z" }],
    });
    render(await InquiriesPage(sp({ tab: "unmatched" })));
    expect(screen.getByText("Sent to an old or changed reply address · subject mentions Q-1049 but the sender differs")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Dismiss" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Attach to inquiry…" }).length).toBeGreaterThan(0);
    expect(screen.getByText("1 marked as spam by Amazon — show")).toBeInTheDocument();
    expect(m.listInquiries).not.toHaveBeenCalled();
  });
});

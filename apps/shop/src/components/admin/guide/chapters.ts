// The Guide's table of contents (spec 2026-10-04-admin-guide-design.md).
// Pure — imported by the client AdminShell and GuideNav and by the server page.
// Every command-center module adds its chapter here when it ships.
export const GUIDE_PATH = "/admin/guide";

export const CHAPTERS = [
  { id: "start", title: "Start here", group: null, href: null },
  { id: "today", title: "Today", group: null, href: "/admin" },
  { id: "discounts", title: "Discounts", group: "Sell", href: "/admin/discounts" },
  { id: "orders", title: "Orders", group: "Sell", href: "/admin/orders" },
  { id: "customers", title: "Customers", group: "Sell", href: "/admin/customers" },
  { id: "disputes", title: "Disputes", group: "Sell", href: "/admin/disputes" },
  { id: "catalog", title: "Catalog & lots", group: "Stock", href: "/admin/catalog" },
  { id: "email", title: "Email", group: "Reach", href: "/admin/email" },
  { id: "inquiries", title: "Inquiries", group: "Reach", href: "/admin/inquiries" },
  { id: "partners", title: "Partners", group: "Partners", href: "/admin/partners" },
  { id: "payouts", title: "Payouts", group: "Partners", href: "/admin/payouts" },
  { id: "activity", title: "Activity", group: null, href: "/admin/activity" },
  { id: "team", title: "Team & the Assistant", group: null, href: "/admin/team" },
] as const;
export type ChapterId = (typeof CHAPTERS)[number]["id"];

// Every chapter has these three sections after its lede, in this order.
export const SECTIONS = [
  { key: "tasks", title: "Common tasks" },
  { key: "how", title: "How it works" },
  { key: "watch", title: "Watch out for" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["key"];

export const sectionId = (chapter: ChapterId, section: SectionKey) => `${chapter}-${section}`;
export const guideHref = (chapter: ChapterId) => `${GUIDE_PATH}#${chapter}`;
export const chapterNumber = (id: ChapterId) => CHAPTERS.findIndex((c) => c.id === id) + 1;
export const chapterById = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;

// Today is the front door at /admin, so it owns only its own pages — as a
// prefix, "/admin" would claim every admin page.
const TODAY_PAGES = ["/admin", "/admin/alerts"];

export function chapterForPath(pathname: string): ChapterId | null {
  if (TODAY_PAGES.includes(pathname)) return "today";
  for (const c of CHAPTERS) {
    if (c.id === "today") continue;
    if (c.href && (pathname === c.href || pathname.startsWith(`${c.href}/`))) return c.id;
  }
  return null;
}

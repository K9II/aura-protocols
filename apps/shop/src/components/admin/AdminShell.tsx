"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/admin/ui";
import { GUIDE_PATH, chapterForPath, guideHref } from "@/components/admin/guide/chapters";
import { signOutToSignInAction } from "@/app/auth/actions";

// `also`: other pages that belong to an item. Today's "/admin" is not a prefix
// for the whole admin, so it is current only on itself and Past alerts.
export type ViewKey = "today" | "orders" | "customers" | "discounts" | "disputes" | "catalog" | "email" | "inquiries" | "partners" | "payouts" | "activity";
export type Views = Record<ViewKey, boolean>;
export type Who = { name: string; role: string; assistant: boolean };

type Item = { href: string; label: string; icon: IconName; view: ViewKey; count?: "orders" | "partners" | "email" | "today" | "disputes" | "inquiries"; also?: string[] };
const NAV: Array<{ group?: string; items: Item[] }> = [
  { items: [{ href: "/admin", label: "Today", icon: "today", view: "today", count: "today", also: ["/admin/alerts"] }] },
  { group: "Sell", items: [
    { href: "/admin/orders", label: "Orders", icon: "orders", view: "orders", count: "orders" },
    { href: "/admin/customers", label: "Customers", icon: "customers", view: "customers" },
    { href: "/admin/discounts", label: "Discounts", icon: "discounts", view: "discounts" },
    { href: "/admin/disputes", label: "Disputes", icon: "shield", view: "disputes", count: "disputes" },
  ] },
  { group: "Stock", items: [{ href: "/admin/catalog", label: "Catalog & lots", icon: "catalog", view: "catalog" }] },
  { group: "Reach", items: [
    { href: "/admin/email", label: "Email", icon: "mail", view: "email", count: "email" },
    { href: "/admin/inquiries", label: "Inquiries", icon: "inbox", view: "inquiries", count: "inquiries" },
  ] },
  { group: "Partners", items: [
    { href: "/admin/partners", label: "Partners", icon: "partners", view: "partners", count: "partners" },
    { href: "/admin/payouts", label: "Payouts", icon: "payouts", view: "payouts" },
  ] },
];

export default function AdminShell({ counts, testMode, who, views, canTeam, children }: {
  counts: { orders: number; partners: number; email: number; today: number; disputes: number; inquiries: number };
  testMode: boolean; who: Who; views: Views; canTeam: boolean; children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const chapter = chapterForPath(pathname);
  const guideOn = pathname === GUIDE_PATH;
  const teamOn = pathname === "/admin/team" || pathname.startsWith("/admin/team/");
  const activityOn = pathname === "/admin/activity";
  const initials = who.assistant ? "AI" : who.name.slice(0, 2).toUpperCase();
  const side = (
    <aside className="a-side">
      <div className="a-brand">
        <div className="a-brand-mark" aria-hidden><svg viewBox="0 0 18 18"><path d="M3 15 9 3l6 12M5.5 10h2l1.2-2.2L10.3 12l1-2h1.2" /></svg></div>
        <div className="a-brand-name">Aura Protocols<small>Command center</small></div>
      </div>
      <nav className="a-nav" aria-label="Admin">
        {NAV.map((g, gi) => {
          const items = g.items.filter((it) => views[it.view]);
          if (items.length === 0) return null;
          return (
            <div key={gi}>
              {g.group && <div className="a-nav-group">{g.group}</div>}
              {items.map((it) => {
                const on = pathname === it.href
                  || (it.href !== "/admin" && pathname.startsWith(`${it.href}/`))
                  || (it.also ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
                const n = it.count ? counts[it.count] : 0;
                return (
                  <Link key={it.href} href={it.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined} onClick={() => setOpen(false)}>
                    <Icon name={it.icon} />{it.label}{n > 0 && <span className="a-count">{n}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="a-nav-foot">
        {views.activity && (
          <Link href="/admin/activity" className={activityOn ? "on" : undefined} aria-current={activityOn ? "page" : undefined} onClick={() => setOpen(false)}>
            <Icon name="clock" />Activity
          </Link>
        )}
        {canTeam && (
          <Link href="/admin/team" className={teamOn ? "on" : undefined} aria-current={teamOn ? "page" : undefined} onClick={() => setOpen(false)}>
            <Icon name="customers" />Team
          </Link>
        )}
        <Link href={GUIDE_PATH} className={guideOn ? "on" : undefined} aria-current={guideOn ? "page" : undefined} onClick={() => setOpen(false)}>
          <Icon name="book" />Guide
        </Link>
      </div>
      <div className="a-side-foot">
        <div className={`a-avatar${who.assistant ? " asst" : ""}`} aria-hidden>{initials}</div>
        <div className="a-who">{who.name}<small>{who.role}</small></div>
        <form action={signOutToSignInAction} className="a-signout"><button type="submit">Sign out</button></form>
      </div>
    </aside>
  );
  return (
    <div className="adm">
      <div className="a-app">
        <div className="a-side-desk">{side}</div>
        {open && <div className="a-drawer" role="dialog" aria-label="Menu"><div className="a-drawer-scrim" onClick={() => setOpen(false)} />{side}</div>}
        <div className="a-main">
          <header className="a-top">
            <button type="button" className="a-menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
            <span className="a-top-title">Command center</span>
            <div className="a-top-right">
              {chapter && (
                <Link className="a-help" href={guideHref(chapter)} aria-label="How this works">
                  <span className="q" aria-hidden>?</span><span className="a-help-t">How this works</span>
                </Link>
              )}
              {who.assistant && <span className="a-env asst"><span className="a-env-t">Assistant</span><span className="a-env-s" aria-hidden>AI</span></span>}
              {testMode && <span className="a-env"><span className="a-env-t">Test mode</span><span className="a-env-s" aria-hidden>Test</span></span>}
              <a className="a-toplink" href="/" target="_blank" rel="noopener noreferrer">View store <Icon name="ext" /></a>
            </div>
          </header>
          <div className="a-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/admin/ui";
import { GUIDE_PATH, chapterForPath, guideHref } from "@/components/admin/guide/chapters";

type Item = { href: string; label: string; icon: IconName; live: boolean; count?: "orders" | "partners" };
const NAV: Array<{ group?: string; items: Item[] }> = [
  { items: [{ href: "/admin", label: "Today", icon: "today", live: false }] },
  { group: "Sell", items: [
    { href: "/admin/orders", label: "Orders", icon: "orders", live: true, count: "orders" },
    { href: "/admin/customers", label: "Customers", icon: "customers", live: false },
    { href: "/admin/discounts", label: "Discounts", icon: "discounts", live: true },
  ] },
  { group: "Stock", items: [{ href: "/admin/catalog", label: "Catalog & lots", icon: "catalog", live: false }] },
  { group: "Reach", items: [
    { href: "/admin/email", label: "Email", icon: "mail", live: false },
    { href: "/admin/inquiries", label: "Inquiries", icon: "inbox", live: false },
  ] },
  { group: "Partners", items: [
    { href: "/admin/partners", label: "Partners", icon: "partners", live: true, count: "partners" },
    { href: "/admin/payouts", label: "Payouts", icon: "payouts", live: true },
  ] },
];

export default function AdminShell({ counts, testMode, ownerName, children }: {
  counts: { orders: number; partners: number }; testMode: boolean; ownerName: string; children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const chapter = chapterForPath(pathname);
  const guideOn = pathname === GUIDE_PATH;
  const side = (
    <aside className="a-side">
      <div className="a-brand">
        <div className="a-brand-mark" aria-hidden><svg viewBox="0 0 18 18"><path d="M3 15 9 3l6 12M5.5 10h2l1.2-2.2L10.3 12l1-2h1.2" /></svg></div>
        <div className="a-brand-name">Aura Protocols<small>Command center</small></div>
      </div>
      <nav className="a-nav" aria-label="Admin">
        {NAV.map((g, gi) => (
          <div key={gi}>
            {g.group && <div className="a-nav-group">{g.group}</div>}
            {g.items.map((it) => {
              const on = it.live && (pathname === it.href || pathname.startsWith(`${it.href}/`));
              const n = it.count ? counts[it.count] : 0;
              return it.live ? (
                <Link key={it.href} href={it.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined} onClick={() => setOpen(false)}>
                  <Icon name={it.icon} />{it.label}{n > 0 && <span className="a-count">{n}</span>}
                </Link>
              ) : (
                <span key={it.href} className="soon" aria-disabled="true"><Icon name={it.icon} /><span>{it.label}</span><span className="a-tag">Soon</span></span>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="a-nav-foot">
        <Link href={GUIDE_PATH} className={guideOn ? "on" : undefined} aria-current={guideOn ? "page" : undefined} onClick={() => setOpen(false)}>
          <Icon name="book" />Guide
        </Link>
      </div>
      <div className="a-side-foot">
        <div className="a-avatar" aria-hidden>{ownerName.slice(0, 2).toUpperCase()}</div>
        <div className="a-who">{ownerName}<small>Owner</small></div>
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
              {testMode && <span className="a-env">Test mode</span>}
              <a className="a-toplink" href="/" target="_blank" rel="noopener noreferrer">View store <Icon name="ext" /></a>
            </div>
          </header>
          <div className="a-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

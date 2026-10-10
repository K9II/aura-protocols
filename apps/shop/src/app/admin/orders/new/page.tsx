import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { monthTotal, recipient, saleOrders, searchRecipients, stockOptions } from "@/lib/no-charge/data";
import { currentMs } from "@/lib/clock";
import { Crumbs, Icon } from "@/components/admin/ui";
import NoChargeForm from "@/components/admin/orders/NoChargeForm";

export const metadata: Metadata = { title: "New no-charge order", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const ordersText = (n: number) => `${n} order${n === 1 ? "" : "s"}`;
const HELP = "Search by name or email. Only accounts can receive vials — their 21+ and research-use agreement is on record.";

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return <div className="a-nstep"><span className="sn">{n}</span><h3>{title}</h3>{children}</div>;
}

// Mock Screen 5 (desktop) / Screen 7 right (phone). Step 1 picks the
// recipient (GET ?q= search, then ?customer=<id>); the rest is NoChargeForm.
// "Send a replacement" on a shipped order links here with
// &reason=replacement&replaces=AP-…, which pre-selects both (the original
// only when it's one of the customer's sale orders).
export default async function NewNoChargePage({ searchParams }: { searchParams: Promise<{ customer?: string | string[]; q?: string | string[]; reason?: string | string[]; replaces?: string | string[] }> }) {
  await requirePermission("orders.no_charge");
  const sp = await searchParams;
  const customerRaw = first(sp.customer);
  const head = (
    <>
      <Crumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: "New no-charge order" }]} />
      <div className="a-ph"><div><h1>New no-charge order</h1><p>Vials sent for free — seeding, replacements, samples. It goes straight to To ship and uses stock like any order, but never counts as a sale.</p></div></div>
    </>
  );

  if (customerRaw === undefined) {
    const q = (first(sp.q) ?? "").trim();
    const hits = q ? await searchRecipients(q) : null;
    return (
      <div className="a-page">
        {head}
        <div className="a-nc-grid one"><div className="a-card"><div className="a-card-b">
          <Step n={1} title="Recipient" />
          <form className="a-search a-nc-search" action="/admin/orders/new" role="search">
            <Icon name="search" /><input type="search" name="q" defaultValue={q} placeholder="Name or email" aria-label="Search accounts" autoFocus />
          </form>
          {hits && (hits.length === 0
            ? <div className="a-nc-none">No accounts match &ldquo;{q}&rdquo;.</div>
            : <div className="a-nc-hits">{hits.map((h) => (
              <div key={h.id} className="a-pick">
                <div className="a-avatar">{initials(h.name)}</div>
                <div><b>{h.name}</b><div className="sub">{h.email} · {ordersText(h.orders)}{h.verified && <> · <span className="a-chip ver sm">Verified</span></>}</div></div>
                <div className="r"><Link className="a-ulink" href={`/admin/orders/new?customer=${h.id}`}>Choose</Link></div>
              </div>
            ))}</div>)}
          <div className="a-nc-help">{HELP}</div>
        </div></div></div>
      </div>
    );
  }

  const id = z.string().uuid().safeParse(customerRaw);
  if (!id.success) notFound();
  const who = await recipient(id.data);
  if (!who) notFound();
  const usable = !who.blocked && !!who.agreedAt;
  const [stock, month, originals] = usable
    ? await Promise.all([stockOptions(), monthTotal(currentMs()), saleOrders(who.id)])
    : [[], { orders: 0, retailCents: 0 }, [] as Array<{ number: string; createdAt: string }>];

  const card = (
    <div className="a-card"><div className="a-card-b">
      <Step n={1} title="Recipient" />
      <div className="a-pick">
        <div className="a-avatar">{initials(who.name)}</div>
        <div><b>{who.name}</b><div className="sub">{who.email}<span className="a-only-desk"> · {ordersText(originals.length)} · {who.verified ? <span className="a-chip ver sm">Verified</span> : <span className="a-chip unver sm">Unverified</span>}</span></div></div>
        <div className="r"><Link className="a-ulink" href="/admin/orders/new">Change</Link></div>
      </div>
      {usable
        ? <div className="a-nc-help a-only-desk">{HELP}</div>
        : <div className="a-err" role="alert">That customer can&apos;t receive orders. Pick someone else.</div>}
    </div></div>
  );

  const replacement = first(sp.reason) === "replacement";
  const replacesRaw = (first(sp.replaces) ?? "").trim().toUpperCase();
  const replaces = replacement && originals.some((o) => o.number === replacesRaw) ? replacesRaw : "";

  return (
    <div className="a-page">
      {head}
      {usable
        ? <NoChargeForm customer={who} stock={stock} originals={originals} month={month} submitKey={crypto.randomUUID()} recipientCard={card}
          initialReason={replacement ? "replacement" : null} initialReplaces={replaces} />
        : <div className="a-nc-grid one">{card}</div>}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { getInquiry } from "@/lib/inquiries/data";
import { getCustomerDetail } from "@/lib/customers/data";
import { searchRecipients } from "@/lib/no-charge/data";
import { getLiveCatalog } from "@/lib/catalog-live";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { supplierPricesFor } from "@/lib/wholesale/runs-data";
import { lotDefaults } from "@/lib/catalog-ops/data";
import { aiosReference } from "@/lib/wholesale/margins-data";
import { kitCostCents } from "@/lib/wholesale/margins";
import { kitRows } from "@/lib/wholesale/rules";
import { QUOTE_VALID_DAYS, parseQuoteRequest, quoteCutoffChoices, type KitCost } from "@/lib/wholesale/quote";
import { firstCustomerMessage, getBankDetails } from "@/lib/wholesale/quote-data";
import { PROTECTION_CENTS } from "@/lib/pricing";
import { currentMs } from "@/lib/clock";
import { addDays, dateLabel, localDate } from "@/lib/today/time";
import { Crumbs, Icon } from "@/components/admin/ui";
import QuoteOrderForm from "@/components/admin/orders/QuoteOrderForm";

export const metadata: Metadata = { title: "New quote order", robots: { index: false, follow: false } };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

// Mocks 2026-10-17 "Quote Order Mocks", screen 2. Opened from an inquiry
// (?inquiry=Q-1006: the customer and the kits come from it) or for a customer
// (?customer=<id>); with neither, a customer search first.
export default async function NewQuoteOrderPage({ searchParams }: { searchParams: Promise<{ inquiry?: string | string[]; customer?: string | string[]; q?: string | string[] }> }) {
  await requirePermission("wholesale.quote");
  const sp = await searchParams;
  const head = (
    <>
      <Crumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: "New quote order" }]} />
      <div className="a-ph"><div><h1>New quote order</h1><p>A wholesale order at the prices you quoted. Nothing is charged now. The customer gets a link to pay the deposit, and once it&apos;s paid the order joins its run like any wholesale order.</p></div></div>
    </>
  );

  const inqRaw = (first(sp.inquiry) ?? "").trim().toUpperCase().replace(/^Q-/, "");
  let customerId = (first(sp.customer) ?? "").trim();
  let inquiry: { id: string; ref: number } | null = null;
  let message: string | null = null;
  if (inqRaw) {
    const ref = Number(inqRaw);
    const inq = Number.isInteger(ref) ? await getInquiry({ ref }) : null;
    if (!inq) notFound();
    if (!inq.customer_id) {
      return (
        <div className="a-page">{head}
          <div className="a-callout warn" style={{ maxWidth: 720 }}><span>Q-{inq.ref} isn&apos;t linked to a customer account yet. On the inquiry, use <b>Link account</b>, then come back with <b>Create quote order</b>. A quote order needs an account (their research-use agreement is on record).</span></div>
          <p style={{ marginTop: 12 }}><Link className="a-ulink" href={`/admin/inquiries/Q-${inq.ref}`}>Back to Q-{inq.ref}</Link></p>
        </div>
      );
    }
    inquiry = { id: inq.id, ref: inq.ref };
    customerId = inq.customer_id;
    message = await firstCustomerMessage(inq.id);
  }

  if (!customerId) {
    const q = (first(sp.q) ?? "").trim();
    const hits = q ? await searchRecipients(q) : null;
    return (
      <div className="a-page">{head}
        <div className="a-nc-grid one"><div className="a-card"><div className="a-card-b">
          <div className="a-nstep"><span className="sn">1</span><h3>Customer</h3></div>
          <form className="a-search a-nc-search" action="/admin/orders/new-quote" role="search">
            <Icon name="search" /><input type="search" name="q" defaultValue={q} placeholder="Name or email" aria-label="Search accounts" autoFocus />
          </form>
          {hits && (hits.length === 0
            ? <div className="a-nc-none">No accounts match &ldquo;{q}&rdquo;.</div>
            : <div className="a-nc-hits">{hits.map((h) => (
              <div key={h.id} className="a-pick">
                <div className="a-avatar">{initials(h.name)}</div>
                <div><b>{h.name}</b><div className="sub">{h.email}</div></div>
                <div className="r"><Link className="a-ulink" href={`/admin/orders/new-quote?customer=${h.id}`}>Choose</Link></div>
              </div>
            ))}</div>)}
          <div className="a-nc-help">Usually you start from the inquiry: open it and click Create quote order.</div>
        </div></div></div>
      </div>
    );
  }

  if (!z.string().uuid().safeParse(customerId).success) notFound();
  const today = localDate(currentMs());
  const [who, settings, bank, live] = await Promise.all([getCustomerDetail(customerId), getWholesaleSettings(), getBankDetails(), getLiveCatalog()]);
  if (!who) notFound();
  if (who.blockedAt || !who.wholesale.enabledAt || who.wholesale.disabledAt) {
    return (
      <div className="a-page">{head}
        <div className="a-callout warn" style={{ maxWidth: 720 }}><span>{who.blockedAt ? `${who.fullName}'s account is blocked.` : `Wholesale isn't on for ${who.fullName}.`} A quote order needs an account with wholesale on. <Link className="a-ulink" href={`/admin/customers/${who.id}`}>Open their customer page</Link>.</span></div>
      </div>
    );
  }
  const rows = kitRows(live.shown);
  const parsed = message ? parseQuoteRequest(message, rows) : { lines: [], unmatched: [] };

  // The owner's profit estimate: a failed read leaves the costs out (the form says so).
  let costs: Record<string, KitCost | undefined> = {};
  try {
    const keys = rows.map((r) => `${r.slug}/${r.variantId}`);
    const [prices, d, ref] = await Promise.all([supplierPricesFor(keys), lotDefaults(), aiosReference()]);
    const inputs = {
      tiers: settings.tiers, minKits: settings.minKits, lotTestCents: d.testCents, labPerStrength: ref.lab?.perStrength,
      inboundPerBoxCents: d.inboundPerBoxCents, labelPerVialCents: d.labelPerVialCents, kitBoxCents: settings.kitBoxCents,
      fulfillment: ref.fulfillment, insuranceChargedCents: PROTECTION_CENTS, glpPct: ref.glpPct,
    };
    costs = Object.fromEntries(keys.flatMap((k) => {
      const boxes = Object.values(prices[k] ?? {});
      if (!boxes.length) return [];
      return [[k, { kitCents: Math.round(kitCostCents(Math.min(...boxes), inputs)), labCents: ref.lab?.perStrength?.[k] ?? d.testCents }]];
    }));
  } catch (err) {
    console.error("quote cost read failed:", err);
  }

  const runs = quoteCutoffChoices(today, settings).map((r, i) => ({
    cutoffOn: r.cutoffOn, label: `${i === 0 ? "Open now · " : ""}order by ${dateLabel(r.cutoffOn)} · lot tested ≈ ${dateLabel(r.testedAbout)} · ships ≈ ${dateLabel(r.shipsAbout)}`,
  }));
  return (
    <div className="a-page">{head}
      <QuoteOrderForm
        customer={{ id: who.id, name: who.fullName, email: who.email, orders: who.orders.length, verified: !!who.verifiedAt }}
        inquiry={inquiry} unmatched={parsed.unmatched} rows={rows} initialLines={parsed.lines}
        settings={{ depositPct: settings.depositPct, tiers: settings.tiers, balanceDays: settings.balanceDays }}
        runs={runs} bankReady={!!bank} costs={costs} validUntil={addDays(today, QUOTE_VALID_DAYS)}
      />
    </div>
  );
}

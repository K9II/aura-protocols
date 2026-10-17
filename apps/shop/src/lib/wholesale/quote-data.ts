import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getOrderById, transitionOrder, type OrderRow } from "@/lib/orders";
import { afterOrderPaid } from "@/lib/order-paid";
import { afterDepositPaid, depositRunPatch } from "@/lib/wholesale/after-deposit";
import type { BankDetails, QuotePrice, TransferForm } from "@/lib/wholesale/quote";
import { alertOwner } from "@/lib/notify";
import { addDays } from "@/lib/today/time";
import type { ShipAddress } from "@/lib/ship-address";

// Quote orders (quote-orders.sql). Status changes go through transitionOrder.
const db = () => getSupabaseAdminClient();

// ---------- bank details (Admin → Wholesale → Settings) ----------
export async function getBankDetails(): Promise<BankDetails | null> {
  const { data, error } = await db().from("shop_settings").select("bank_account_name, bank_name, bank_routing, bank_account, bank_note").eq("id", true).single();
  if (error || !data) throw new Error(`bank details read failed: ${JSON.stringify(error)}`);
  const r = data as { bank_account_name: string | null; bank_name: string | null; bank_routing: string | null; bank_account: string | null; bank_note: string | null };
  if (!r.bank_account_name || !r.bank_name || !r.bank_routing || !r.bank_account) return null;
  return { accountName: r.bank_account_name, bankName: r.bank_name, routing: r.bank_routing, account: r.bank_account, note: r.bank_note };
}

export async function saveBankDetails(b: BankDetails | null): Promise<void> {
  const { error } = await db().from("shop_settings").update({
    bank_account_name: b?.accountName ?? null, bank_name: b?.bankName ?? null, bank_routing: b?.routing ?? null,
    bank_account: b?.account ?? null, bank_note: b?.note ?? null,
  }).eq("id", true);
  if (error) throw new Error(`bank details save failed: ${JSON.stringify(error)}`);
}

// The kits a volume-quote inquiry asked for: its first message from the customer.
export async function firstCustomerMessage(inquiryId: string): Promise<string | null> {
  const { data, error } = await db().from("inquiry_messages").select("body_text")
    .eq("inquiry_id", inquiryId).eq("direction", "in").order("created_at", { ascending: true }).limit(1);
  if (error) throw new Error(`inquiry message read failed: ${JSON.stringify(error)}`);
  return (data as Array<{ body_text: string }> | null)?.[0]?.body_text ?? null;
}

// ---------- create (owner) ----------
// Waits as 'quoted' (Awaiting deposit). No address, tax or research-use
// confirmation yet: the customer adds them on their pay page.
export async function createQuoteOrder(input: {
  customerId: string; email: string; price: QuotePrice; cutoffOn: string; depositPct: number; validUntil: string;
  payBank: boolean; payCard: boolean; note: string | null; inquiryId: string | null; kitBoxCents: number; actorId: string;
}): Promise<{ id: string; orderNumber: string }> {
  const p = input.price;
  const depositCents = Math.round(p.subtotalCents * input.depositPct / 100);
  const { data, error } = await db().from("orders").insert({
    customer_id: input.customerId, email: input.email, status: "quoted", channel: "wholesale", kind: "sale", wholesale_cutoff_on: input.cutoffOn,
    subtotal_cents: p.subtotalCents, shipping_cents: p.shippingCents, insurance_cents: p.insuranceCents, tax_cents: 0, total_cents: p.totalBeforeTaxCents,
    partner_id: null, attributed_by: null, partner_discount_cents: 0, new_account_discount: false, store_credit_cents: 0,
    deposit_cents: depositCents, balance_cents: p.totalBeforeTaxCents - depositCents,
    packaging_cents: p.kits * input.kitBoxCents,
    quote_inquiry_id: input.inquiryId, quote_valid_until: input.validUntil, quote_note: input.note,
    quote_pay_bank: input.payBank, quote_pay_card: input.payCard, quote_created_by: input.actorId,
    // Never used for a quote (nothing cancels a quoted order by expires_at); set for the not-null column.
    expires_at: new Date(Date.parse(`${addDays(input.validUntil, 1)}T12:00:00Z`)).toISOString(),
  }).select("id, order_number").single();
  if (error || !data) throw new Error(`quote order insert failed: ${JSON.stringify(error)}`);
  const order = data as { id: string; order_number: string };
  const { error: itemsError } = await db().from("order_items").insert(p.items.map((i) => ({
    order_id: order.id, compound_slug: i.compoundSlug, compound_name: i.compoundName, variant_id: i.variantId,
    strength: i.strength, pack_qty: i.packQty, quantity: i.quantity, unit_price_cents: i.unitPriceCents,
    line_total_cents: i.lineTotalCents, lot_number: i.lotNumber, retail_unit_cents: i.listUnitCents,
  })));
  if (itemsError) {
    await db().from("orders").delete().eq("id", order.id);
    throw new Error(`quote order_items insert failed: ${JSON.stringify(itemsError)}`);
  }
  if (input.inquiryId) {
    const { error: e } = await db().from("inquiries").update({ order_number: order.order_number }).eq("id", input.inquiryId);
    if (e) await alertOwner("Quote order not linked to its inquiry", `${order.order_number}: inquiry ${input.inquiryId}: ${JSON.stringify(e)}`);
  }
  return { id: order.id, orderNumber: order.order_number };
}

// ---------- the customer's pay page ----------
// Address, research use and sales tax (on the whole order; carried in the balance,
// as on the order sheet). Only while the order is still waiting for its deposit.
export async function saveQuoteShip(order: OrderRow, ship: ShipAddress, tax: { calculationId: string; taxCents: number }): Promise<boolean> {
  const total = order.subtotal_cents + order.shipping_cents + order.insurance_cents + tax.taxCents;
  const { data, error } = await db().from("orders").update({
    ship_name: ship.name, ship_line1: ship.line1, ship_line2: ship.line2, ship_city: ship.city, ship_state: ship.state, ship_zip: ship.zip,
    ruo_confirmed_at: new Date().toISOString(), tax_cents: tax.taxCents, tax_calculation_id: tax.calculationId,
    total_cents: total, balance_cents: total - (order.deposit_cents ?? 0),
  }).eq("id", order.id).eq("status", "quoted").select("id");
  if (error) throw new Error(`quote ship save failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

export async function markTransferSent(orderId: string, payment: "deposit" | "balance", from: "quoted" | "balance_due"): Promise<boolean> {
  const { data, error } = await db().from("orders").update({ transfer_sent_at: new Date().toISOString(), transfer_sent_for: payment })
    .eq("id", orderId).eq("status", from).select("id");
  if (error) throw new Error(`transfer-sent save failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

// A bank transfer has no card fee: recorded as 0 so profit doesn't estimate one.
async function recordNoFee(orderId: string, payment: "deposit" | "balance", orderNumber: string): Promise<void> {
  const { error } = await db().from("payment_fees").upsert({ order_id: orderId, payment, fee_cents: 0 }, { onConflict: "order_id,payment" });
  if (error) await alertOwner("Bank transfer fee not recorded", `${orderNumber} ${payment}: profit will estimate a card fee. ${JSON.stringify(error)}`);
}

// ---------- the owner records a bank transfer ----------
// Deposit: quoted → deposit_paid (joins its run), then the usual deposit steps.
// Balance: balance_due → paid, then the usual after-payment steps (tax record, emails).
export async function recordBankTransfer(order: OrderRow, t: TransferForm, actorId: string): Promise<"moved" | "stale"> {
  const common = { transfer_recorded_by: actorId, transfer_sent_at: null, transfer_sent_for: null };
  if (t.payment === "deposit") {
    const run = await depositRunPatch(order);
    const moved = await transitionOrder(order.id, "quoted", "deposit_paid", {
      ...common, ...run, deposit_method: "bank", deposit_bank_ref: t.reference, deposit_received_on: t.receivedOn,
    });
    if (!moved) return "stale";
    await recordNoFee(order.id, "deposit", order.order_number);
    await afterDepositPaid(order.id);
    return "moved";
  }
  const moved = await transitionOrder(order.id, "balance_due", "paid", {
    ...common, balance_method: "bank", balance_bank_ref: t.reference, balance_received_on: t.receivedOn,
  });
  if (!moved) return "stale";
  await recordNoFee(order.id, "balance", order.order_number);
  await afterOrderPaid(order.id);
  return "moved";
}

// ---------- expiry (reconcile cron) ----------
// A quote still waiting for its deposit after its "valid until" date is
// cancelled (nothing was paid, nothing held). Returns the order numbers.
export async function expireQuotes(today: string): Promise<string[]> {
  const { data, error } = await db().from("orders").select("id, order_number").eq("status", "quoted").lt("quote_valid_until", today);
  if (error) throw new Error(`expired quotes read failed: ${JSON.stringify(error)}`);
  const out: string[] = [];
  for (const o of (data ?? []) as Array<{ id: string; order_number: string }>) {
    if (await transitionOrder(o.id, "quoted", "cancelled")) out.push(o.order_number);
  }
  return out;
}

export async function getQuoteOrder(orderId: string): Promise<OrderRow | null> {
  const o = await getOrderById(orderId);
  return o && o.channel === "wholesale" ? o : null;
}

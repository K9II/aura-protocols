import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ShipAddress } from "@/lib/ship-address";
import { getPartnerForCustomer, type PartnerRow } from "@/lib/partners/data";

// Data Access Layer (Next 16 auth guide): every account page, order action,
// route handler and the owner page calls these next to the data. proxy.ts only
// refreshes sessions — it is never the authorization check.

export type SessionUser = { id: string; email: string; emailConfirmed: boolean };
export type Customer = SessionUser & {
  fullName: string;
  organization: string | null;
  isOwner: boolean;
  stripeCustomerId: string | null;
  ship: ShipAddress | null;
  createdAt: string;
};

type CustomerRow = {
  id: string; full_name: string; organization: string | null; is_owner: boolean; stripe_customer_id: string | null;
  ship_name: string | null; ship_line1: string | null; ship_line2: string | null;
  ship_city: string | null; ship_state: string | null; ship_zip: string | null;
  created_at: string;
};

export const verifySession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(); // verified with the auth server, not just the cookie
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email, emailConfirmed: !!data.user.email_confirmed_at };
});

export const getCustomer = cache(async (): Promise<Customer | null> => {
  const user = await verifySession();
  if (!user) return null;
  const { data } = await getSupabaseAdminClient().from("customers").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  const r = data as CustomerRow;
  const ship = r.ship_name && r.ship_line1 && r.ship_city && r.ship_state && r.ship_zip
    ? { name: r.ship_name, line1: r.ship_line1, line2: r.ship_line2, city: r.ship_city, state: r.ship_state as ShipAddress["state"], zip: r.ship_zip }
    : null;
  return {
    ...user, fullName: r.full_name, organization: r.organization, isOwner: r.is_owner,
    stripeCustomerId: r.stripe_customer_id, ship, createdAt: r.created_at,
  };
});

export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function requireCustomer(nextPath: string): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`/sign-in?next=${encodeURIComponent(safeNext(nextPath))}`);
  return customer;
}

export async function requireOwner(): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer || !customer.isOwner) notFound();
  return customer;
}

// Partner pages: signed-in customer with a partner record (any status);
// no record → the application form.
export async function requirePartner(): Promise<{ customer: Customer; partner: PartnerRow }> {
  const customer = await requireCustomer("/partners");
  const partner = await getPartnerForCustomer(customer.id);
  if (!partner) redirect("/partners/apply");
  return { customer, partner };
}

// Partner actions that change payout settings: approved partners only.
export async function requireApprovedPartner(): Promise<{ customer: Customer; partner: PartnerRow }> {
  const r = await requirePartner();
  if (r.partner.status !== "approved") notFound();
  return r;
}

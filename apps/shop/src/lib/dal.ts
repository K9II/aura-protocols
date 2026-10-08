import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ShipAddress } from "@/lib/ship-address";
import { getPartnerForCustomer, type PartnerRow } from "@/lib/partners/data";
import { readStaffRow } from "@/lib/staff/data";
import { rolePermissions, type Staff } from "@/lib/staff/roles";
import type { Permission } from "@/lib/staff/permissions";
import type { ResearchField, ResearchInfo } from "@/lib/account/research";

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
  verifyRequired: boolean;
  // First-order research verification (null/absent = not given yet).
  research?: ResearchInfo | null;
  // Wholesale (self-serve): on once the terms were accepted; the owner can switch it off.
  wholesale?: { enabledAt: string | null; disabledAt: string | null };
};

// unfinished: signed in (Google) but the account was never finished — no
// customers row yet. They can't browse or buy until /finish-account.
export type AccountState = { customer: Customer | null; blocked: boolean; unfinished: boolean };
export type UnfinishedUser = { id: string; email: string; suggestedName: string; viaGoogle: boolean };

type CustomerRow = {
  id: string; full_name: string; organization: string | null; is_owner: boolean; stripe_customer_id: string | null;
  ship_name: string | null; ship_line1: string | null; ship_line2: string | null;
  ship_city: string | null; ship_state: string | null; ship_zip: string | null;
  created_at: string;
  email_verified_at: string | null; verify_required: boolean;
  blocked_at: string | null;
  research_field: string | null; research_org: string | null; research_verified_at: string | null;
  wholesale_enabled_at: string | null; wholesale_disabled_at: string | null;
};

type Profile = { name: string | null; viaGoogle: boolean };

// The name Google gave us (full_name, else name) and whether this user has a Google identity.
function profileOf(u: Pick<User, "user_metadata" | "app_metadata">): Profile {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  const raw = typeof m.full_name === "string" ? m.full_name : typeof m.name === "string" ? m.name : "";
  const a = (u.app_metadata ?? {}) as Record<string, unknown>;
  const providers: unknown[] = Array.isArray(a.providers) ? a.providers : typeof a.provider === "string" ? [a.provider] : [];
  return { name: raw.trim().slice(0, 100) || null, viaGoogle: providers.includes("google") };
}

// Supabase refuses a banned user's still-live access token with "user_banned";
// that's a blocked account, not a signed-out visitor.
const readSession = cache(async (): Promise<{ user: SessionUser | null; banned: boolean; profile: Profile | null }> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(); // verified with the auth server, not just the cookie
  if (error) return { user: null, banned: (error as { code?: string }).code === "user_banned", profile: null };
  if (!data.user?.email) return { user: null, banned: false, profile: null };
  return {
    user: { id: data.user.id, email: data.user.email, emailConfirmed: !!data.user.email_confirmed_at },
    banned: false,
    profile: profileOf(data.user),
  };
});

// A read error must never look like "no customers row": that would send a
// real customer to /finish-account. It throws instead (callers fail closed).
async function readCustomerRow(id: string): Promise<CustomerRow | null> {
  const { data, error } = await getSupabaseAdminClient().from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`customer read failed: ${JSON.stringify(error)}`);
  return (data as CustomerRow | null) ?? null;
}

export const verifySession = cache(async (): Promise<SessionUser | null> => (await readSession()).user);

// A blocked account (admin Customers → Block) is treated as signed out
// everywhere: no page, action or checkout gets a customer. Supabase's ban
// stops new sign-ins and token refreshes; this covers an access token that
// is still live (up to an hour). The gate asks getAccountState to say "closed".
export const getAccountState = cache(async (): Promise<AccountState> => {
  const { user, banned } = await readSession();
  if (!user) return { customer: null, blocked: banned, unfinished: false };
  const r = await readCustomerRow(user.id);
  if (!r) return { customer: null, blocked: false, unfinished: true };
  if (r.blocked_at) return { customer: null, blocked: true, unfinished: false };
  const ship = r.ship_name && r.ship_line1 && r.ship_city && r.ship_state && r.ship_zip
    ? { name: r.ship_name, line1: r.ship_line1, line2: r.ship_line2, city: r.ship_city, state: r.ship_state as ShipAddress["state"], zip: r.ship_zip }
    : null;
  return {
    blocked: false,
    unfinished: false,
    customer: {
      ...user, fullName: r.full_name, organization: r.organization, isOwner: r.is_owner,
      stripeCustomerId: r.stripe_customer_id, ship, createdAt: r.created_at,
      emailConfirmed: !!r.email_verified_at, verifyRequired: r.verify_required,
      research: r.research_verified_at && r.research_field && r.research_org
        ? { field: r.research_field as ResearchField, org: r.research_org, verifiedAt: r.research_verified_at }
        : null,
      wholesale: { enabledAt: r.wholesale_enabled_at ?? null, disabledAt: r.wholesale_disabled_at ?? null },
    },
  };
});

// Supabase "Confirm email" is OFF (sign-up signs in at once), so Supabase
// marks every address confirmed; a verified address is our own
// customers.email_verified_at (lib/account/verify.ts).
export const getCustomer = cache(async (): Promise<Customer | null> => (await getAccountState()).customer);

// /finish-account: who is finishing, and what Google told us about them.
export const getUnfinishedUser = cache(async (): Promise<UnfinishedUser | null> => {
  if (!(await getAccountState()).unfinished) return null;
  const { user, profile } = await readSession();
  if (!user || !profile) return null;
  return { id: user.id, email: user.email, suggestedName: profile.name ?? "", viaGoogle: profile.viaGoogle };
});

// /auth/callback, right after a code exchange (the new session isn't readable yet).
export async function customerStatus(userId: string): Promise<"none" | "ok" | "blocked"> {
  const r = await readCustomerRow(userId);
  if (!r) return "none";
  return r.blocked_at ? "blocked" : "ok";
}

// Same-site paths only. Browsers strip tabs/newlines and read "\" as "/",
// so "/\t/evil.com" would become "//evil.com" — any control character or
// backslash is refused, and the path must still resolve to our own origin.
const SAFE_BASE = "https://x.invalid";
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\x00-\x1F\x7F\\]/.test(next)) return fallback;
  let u: URL;
  try { u = new URL(next, SAFE_BASE); } catch { return fallback; }
  if (u.origin !== SAFE_BASE) return fallback;
  return u.pathname + u.search + u.hash;
}

export async function requireCustomer(nextPath: string): Promise<Customer> {
  const { customer, unfinished } = await getAccountState();
  if (customer) return customer;
  const next = encodeURIComponent(safeNext(nextPath));
  if (unfinished) redirect(`/finish-account?next=${next}`);
  redirect(`/sign-in?next=${next}`);
}

// Signed out → sign in and come back to the same admin page (proxy.ts passes
// it as x-admin-path). Signed in but not staff, disabled, or missing the
// permission → 404, so the admin stays invisible.
export const ADMIN_PATH_HEADER = "x-admin-path";

// The command center's one gatekeeper (spec 2026-10-06-admin-staff-logins-design.md).
// A staff login = a customer account + an active staff row. Read fresh on
// every request, so Disable takes effect on the next click. A read error throws.
export const getStaff = cache(async (): Promise<Staff | null> => {
  const customer = await getCustomer();
  if (!customer) return null;
  const row = await readStaffRow(customer.id);
  if (!row || row.status !== "active") return null;
  return {
    id: customer.id, email: customer.email, fullName: customer.fullName,
    role: row.role, status: row.status, isAssistant: row.role === "assistant",
    permissions: rolePermissions(row.role),
  };
});

async function denied(): Promise<never> {
  if (!(await verifySession())) {
    const path = (await headers()).get(ADMIN_PATH_HEADER);
    redirect(`/sign-in?next=${encodeURIComponent(safeNext(path, "/admin"))}`);
  }
  notFound();
}

export async function requireStaff(): Promise<Staff> {
  return (await getStaff()) ?? denied();
}

export async function requirePermission(p: Permission): Promise<Staff> {
  const staff = await getStaff();
  if (staff?.permissions.has(p)) return staff;
  return denied();
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

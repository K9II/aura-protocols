import type { Metadata } from "next";
import { requireCustomer } from "@/lib/dal";
import { listOrdersForCustomer } from "@/lib/orders";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { signOutAction } from "@/app/auth/actions";
import OrderCard from "@/components/account/OrderCard";
import AddressForm from "@/components/account/AddressForm";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const customer = await requireCustomer("/account");
  const orders = await listOrdersForCustomer(customer.id);
  const { data: agreement } = await getSupabaseAdminClient().from("account_agreements")
    .select("terms_version, agreed_at").eq("customer_id", customer.id).order("agreed_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16"><div style={{ maxWidth: 760 }}>
        <div className="flex items-center gap-4 mb-2.5">
          <p className="s-micro text-[color:var(--specimen)]">Account · {customer.email}</p>
          <form action={signOutAction} className="flex"><button type="submit" className="s-micro underline bg-transparent border-0 cursor-pointer text-[color:var(--specimen)]">Sign out</button></form>
        </div>
        <h1 className="s-h1 mb-8" style={{ fontSize: 48 }}>My <em>orders.</em></h1>
        {!customer.emailConfirmed && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-6">Please verify your email address — we sent a link to {customer.email}.</p>}
        {orders.length === 0 ? <p className="text-[color:var(--ink-soft)]">No orders yet.</p> : orders.map((o) => <OrderCard key={o.id} order={o} />)}
        <div className="border-t border-[color:var(--line)] pt-6 mt-6" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div><p className="s-micro mb-2">Shipping address</p><AddressForm ship={customer.ship} /></div>
          <div><p className="s-micro mb-2">Agreements on file</p>
            <p className="text-sm leading-relaxed">21+ · Research use only · Dispute policy<br />
              {agreement && <span className="text-[color:var(--ink-soft)]">Terms version {agreement.terms_version} · agreed {new Date(agreement.agreed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
            </p></div>
        </div>
      </div></div>
    </div>
  );
}

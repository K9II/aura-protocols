import Link from "next/link";
import { STRIPE_PAYMENT_LINKS, EXTERNAL_REL } from "@/lib/constants";

export default function DepositRecoveryPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
        Recovery Stack — Waitlist Deposit
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white">
        Reserve your first month: compounded BPC-157 + TB-500, prescribed by a US doctor.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        $50 refundable deposit. Holds your slot when Aura Clinical opens enrollment. If we
        cannot serve your state, we refund automatically.
      </p>
      <ul className="mt-6 space-y-2 text-slate-300">
        <li>• Compounded by a US-licensed 503A pharmacy.</li>
        <li>• Prescribed by a US-licensed MD after a 10-minute async intake.</li>
        <li>• Shipped monthly. Cancel anytime.</li>
      </ul>
      <Link
        href={STRIPE_PAYMENT_LINKS.depositRecovery}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Reserve with $50 deposit →
      </Link>
      <p className="mt-6 text-xs text-slate-500">
        This is a research preview. No prescription is issued at deposit time. Deposits are
        held by Stripe and refunded in full if Aura Clinical cannot serve your state at launch.
      </p>
    </main>
  );
}

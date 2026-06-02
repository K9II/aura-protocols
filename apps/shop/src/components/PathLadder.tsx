import Link from "next/link";
import { ENGINE_URL, EXTERNAL_REL, CLINICAL_WAITLIST_URL } from "@/lib/constants";

export default function PathLadder() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-5 md:grid-cols-3">
        {/* Card 1 — Editorial */}
        <div className="glass rounded-2xl p-7 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Editorial · Free
          </p>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Learn what works
          </h3>
          <p className="text-slate-400 leading-relaxed mb-6 flex-1">
            Independent vendor reviews, third-party COA verification, and research references for every compound we cover. Built on the evidence.
          </p>
          <Link href="/#protocols" className="btn-outline self-start">
            Browse the library →
          </Link>
        </div>

        {/* Card 2 — Engine */}
        <div className="glass rounded-2xl p-7 flex flex-col glow-cyan border-cyan-400/20">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            Engine · Free
          </p>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Personalize it
          </h3>
          <p className="text-slate-400 leading-relaxed mb-6 flex-1">
            Connect Whoop, Oura, or Apple Health. Get a protocol tuned to your recovery, sleep, and HRV — refreshed as your data evolves.
          </p>
          <a href={ENGINE_URL} rel={EXTERNAL_REL} className="btn-primary self-start">
            Connect a wearable →
          </a>
        </div>

        {/* Card 3 — Clinical */}
        <div className="glass rounded-2xl p-7 flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
            Clinical · Coming soon
          </p>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Get it prescribed
          </h3>
          <p className="text-slate-400 leading-relaxed mb-6 flex-1">
            Compounded peptides via a US-licensed MD — planned. Target $249–$499/mo, cash-pay. Join the waitlist for early access.
          </p>
          <Link href={CLINICAL_WAITLIST_URL} className="btn-outline self-start">
            Join the waitlist →
          </Link>
        </div>
      </div>
    </section>
  );
}

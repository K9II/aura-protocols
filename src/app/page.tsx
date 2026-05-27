import Link from "next/link";
import { SUPPORTED_WEARABLES } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Free Peptide Protocol Engine</p>
      <h1 className="mt-3 text-4xl font-bold text-white md:text-5xl">
        Connect your wearable. Get a peptide protocol tuned to your data.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        We read your recovery, sleep, HRV, and (optionally) glucose, then return a personalized peptide + lifestyle protocol. Educational only.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-2 text-slate-300 md:grid-cols-3">
        {SUPPORTED_WEARABLES.map((w) => (
          <li key={w.id} className="rounded-md border border-white/10 px-3 py-2 text-center">{w.label}</li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/connect" className="inline-flex items-center justify-center rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-900 hover:bg-cyan-300">
          Connect a wearable
        </Link>
        <Link href="/upload" className="inline-flex items-center justify-center rounded-lg border border-white/10 px-5 py-3 font-semibold text-slate-100 hover:bg-white/10">
          Don&apos;t have one? Paste manual data
        </Link>
      </div>
      <p className="mt-12 text-xs text-slate-500">
        Aura Protocols produces educational protocol suggestions, not medical advice. The Engine handles biometric fitness data — never PHI. For prescribed peptides, see Aura Clinical.
      </p>
    </main>
  );
}

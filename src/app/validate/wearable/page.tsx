import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

const WEARABLES = ["Whoop", "Oura", "Apple Health", "Garmin", "Fitbit", "Dexcom CGM"];

export default function WearablePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-white md:text-5xl">
        Connect your wearable. Get a peptide protocol tuned to your data.
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        Free. We read your recovery, sleep, HRV, and (optionally) glucose, then return a
        personalized peptide + lifestyle protocol. No generic &quot;stack of the week.&quot;
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-2 text-slate-300 md:grid-cols-3">
        {WEARABLES.map((w) => (
          <li key={w} className="rounded-md border border-white/10 px-3 py-2 text-center">
            {w}
          </li>
        ))}
      </ul>
      <Link
        href={ENGINE_URL}
        target="_blank"
        rel={EXTERNAL_REL}
        className="btn-primary mt-8 inline-flex"
      >
        Connect a wearable →
      </Link>
      <div className="mt-10">
        <EmailCapture />
      </div>
    </main>
  );
}

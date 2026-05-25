import Link from "next/link";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

const pillars = [
  {
    eyebrow: "Personalize",
    title: "The Engine",
    body: "Connect Whoop, Oura, Apple Health. The Engine reads your biometrics and returns a peptide + lifestyle protocol tuned to you.",
    href: ENGINE_URL,
    external: true,
    cta: "Open the Engine →",
    accent: "from-cyan-500/20 to-cyan-500/0 border-cyan-400/30",
  },
  {
    eyebrow: "Educate",
    title: "Editorial",
    body: "Vendor reviews, dosing guides, compound deep-dives. Independent. Affiliate-disclosed. No pay-to-play.",
    href: "/blog",
    external: false,
    cta: "Read the library →",
    accent: "from-violet-500/20 to-violet-500/0 border-violet-400/30",
  },
  {
    eyebrow: "Prescribe",
    title: "Aura Clinical",
    body: "Recovery and GH stacks, compounded by a US 503A pharmacy and prescribed by a US-licensed MD. Coming soon.",
    href: "/validate/deposit-recovery",
    external: false,
    cta: "Join the waitlist →",
    accent: "from-emerald-500/20 to-emerald-500/0 border-emerald-400/30",
  },
];

export default function ValuePropTriad() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
      {pillars.map((p) => (
        <div
          key={p.title}
          className={`rounded-2xl border bg-gradient-to-br ${p.accent} p-6 overflow-visible`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
            {p.eyebrow}
          </p>
          <h3 className="font-display mt-2 text-2xl font-bold text-white pl-px">{p.title}</h3>
          <p className="mt-3 text-slate-300">{p.body}</p>
          {p.external ? (
            <a
              href={p.href}
              target="_blank"
              rel={EXTERNAL_REL}
              className="mt-5 inline-flex font-medium text-cyan-300 hover:text-cyan-200"
            >
              {p.cta}
            </a>
          ) : (
            <Link
              href={p.href}
              className="mt-5 inline-flex font-medium text-cyan-300 hover:text-cyan-200"
            >
              {p.cta}
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}

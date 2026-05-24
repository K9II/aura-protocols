const stats = [
  { value: "100%", label: "Third-party COA required" },
  { value: "0", label: "Pay-to-play vendor placements" },
  { value: "100%", label: "Affiliate relationships disclosed" },
  { value: "Manual", label: "Every vendor reviewed by a human" },
];

export default function TrustBlock() {
  return (
    <section className="border-y border-white/10 bg-[#0d1117]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-bold text-cyan-300">{s.value}</p>
            <p className="mt-1 text-sm text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export type ProseSection = { heading: string; body: React.ReactNode };

export default function ProsePage({ eyebrow, title, updated, intro, sections }: {
  eyebrow: string; title: React.ReactNode; updated?: string; intro?: React.ReactNode; sections: ProseSection[];
}) {
  return (
    <div className="pharmacopoeia">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="s-micro s-eyebrow">{eyebrow}</p>
        <h1 className="s-h1 mb-4">{title}</h1>
        {updated && <p className="s-micro text-[color:var(--ink-soft)] mb-8">Last updated {updated}</p>}
        {intro && <div className="text-[15.5px] leading-relaxed text-[color:var(--ink-soft)] mb-6">{intro}</div>}
        {sections.map((s) => (
          <section key={s.heading} className="py-6" style={{ borderBottom: "1px solid var(--line)" }}>
            <h2 className="p-serif text-xl mb-3">{s.heading}</h2>
            <div className="text-[15px] leading-relaxed text-[color:var(--ink-soft)] space-y-3">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

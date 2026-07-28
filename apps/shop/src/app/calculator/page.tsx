import type { Metadata } from "next";
import Link from "next/link";
import ReconstitutionCalculator from "@/components/ReconstitutionCalculator";

export const metadata: Metadata = {
  title: "Reconstitution Calculator — Aura Protocols",
  description:
    "Work out concentration and exact syringe units from a vial strength, bacteriostatic water volume, and target dose.",
  alternates: { canonical: "/calculator" },
};

const HOW_IT_WORKS = [
  {
    num: "I.",
    title: "Concentration",
    body: "5mg vial ÷ 2ml water = 2.5 mg/ml. Vial strength divided by the water you reconstitute with.",
  },
  {
    num: "II.",
    title: "Units to draw",
    body: "A 0.5mg dose ÷ 2.5 mg/ml = 0.2ml = 20 units, using the 100-units-per-ml scale every U-100 insulin syringe shares — 30-unit, 50-unit, and 100-unit barrels all read the same way, just with a shorter or longer barrel.",
  },
  {
    num: "III.",
    title: "When a dose is too big for one draw",
    body: "If a dose needs more units than your syringe holds, the calculator splits it into equal injections instead of overfilling — the same total dose, drawn in more than one shot.",
  },
];

const FAQ = [
  {
    q: "How do I convert a peptide dose into syringe units?",
    a: "First calculate concentration in mg per mL, then convert that concentration into mg per unit on a U-100 insulin syringe. This calculator performs those steps automatically from vial size, reconstitution volume, and target dose.",
  },
  {
    q: "Does syringe size change the mg-per-unit math?",
    a: "No. U-100 insulin syringes use the same 100-units-per-mL standard across 30-unit, 50-unit, and 100-unit syringe bodies. Syringe size changes visual range and handling comfort, not the underlying per-unit volume.",
  },
  {
    q: "What if my target dose is less than 2 units?",
    a: "Very small doses are harder to measure accurately. The usual fix is to lower concentration by adding more diluent or switch to a syringe that gives better practical readability for the same U-100 standard.",
  },
  {
    q: "Why does concentration matter more than vial size alone?",
    a: "Vial size does not determine dose by itself. The practical dose per unit depends on how much peptide is in the vial and how much liquid was added during reconstitution.",
  },
  {
    q: "Can I use this calculator for tirzepatide, semaglutide, and BPC-157?",
    a: "Yes. The calculator handles the concentration math for any peptide where you know the total vial amount, the reconstitution volume, and the target dose.",
  },
  {
    q: "Is bacteriostatic water different from saline or sterile water?",
    a: "Yes. BAC water includes 0.9% benzyl alcohol as a bacteriostatic preservative, while sterile water has no preservative and saline has sodium chloride instead. Solvent choice changes handling workflow and may change practical stability expectations.",
  },
  {
    q: "Can I rely on the example rows as dosing instructions?",
    a: "No. The example rows are calculation examples only. They show how concentration and syringe math work; they are not medical, prescribing, or protocol instructions.",
  },
  {
    q: "Why does the page emphasize U-100 insulin syringes?",
    a: "Because they are the most common syringe format used for this style of calculation. Their fixed 0.01 mL per unit standard makes conversion logic consistent and easier to explain.",
  },
];

const SOURCES = [
  {
    text: "1. FDA Recognized Consensus Standards — ISO 8537:2016, Sterile single-use syringes for insulin.",
    href: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfStandards/detail.cfm?standard__identification_no=33873",
    label: "FDA",
  },
  {
    text: "2. DailyMed: Bacteriostatic Water for Injection.",
    href: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=87d6e9dc-fe3b-4593-ac9a-d7493d1959c7&type=display",
    label: "DailyMed",
  },
  {
    text: "3. DailyMed: Sterile Water for Injection.",
    href: "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=88403fcf-a276-42c0-88b6-bd84a720b564&type=display",
    label: "DailyMed",
  },
  {
    text: "4. CDC Injection Safety — Clinical Guidance.",
    href: "https://www.cdc.gov/injection-safety/hcp/clinical-guidance/index.html",
    label: "CDC",
  },
];

export default function CalculatorPage() {
  return (
    <div className="pharmacopoeia">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Tools</p>
        <h1 className="p-serif text-4xl mb-4 text-[color:var(--ink)]">Reconstitution Calculator</h1>
        <p className="text-[color:var(--ink-soft)] max-w-xl leading-relaxed mb-12">
          Work out concentration and exact syringe units from a vial strength, bacteriostatic water volume, and
          target dose — the same math researchers use to prepare a working solution.
        </p>

        <ReconstitutionCalculator />

        <h2 className="p-serif text-2xl mt-16 mb-5 text-[color:var(--ink)]">How This Is Calculated</h2>
        <div className="space-y-[30px]">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.num} className="p-roman flex gap-[18px] pl-[18px]">
              <span className="p-serif-italic text-xl text-[color:var(--specimen)] w-8 flex-shrink-0">
                {step.num}
              </span>
              <div>
                <h3 className="text-[15.5px] mb-1 text-[color:var(--ink)]">{step.title}</h3>
                <p className="text-[13.5px] text-[color:var(--ink-soft)] m-0">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="p-serif text-2xl mt-16 mb-4 text-[color:var(--ink)]">Sources</h2>
        {SOURCES.map((s) => (
          <p key={s.href} className="text-[color:var(--ink-soft)] leading-relaxed my-4">
            {s.text}{" "}
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="p-link">
              {s.label}
            </a>
          </p>
        ))}

        <section className="mt-16">
          <h2 className="p-serif text-2xl mb-5 text-[color:var(--ink)]">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="p-card p-5">
                <p className="font-semibold text-[color:var(--ink)] mb-2">{item.q}</p>
                <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="p-callout p-5 space-y-3 mt-12">
          <div>
            <p className="text-xs font-semibold text-[color:var(--specimen)] uppercase tracking-widest mb-1">
              Research Use Only
            </p>
            <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">
              This compound is intended for laboratory and research purposes only. It is not approved for human
              consumption and is not intended to diagnose, treat, cure, or prevent any disease. Always consult a
              qualified healthcare professional.
            </p>
          </div>
          <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">
            This tool performs concentration math only — it is not medical advice and does not verify safe or
            effective dosing. Always verify calculations independently and consult a qualified professional.
          </p>
        </div>

        <aside className="mt-10 border border-[color:var(--specimen)]/30 bg-[color:var(--specimen)]/5 p-6">
          <h3 className="p-serif text-xl text-[color:var(--ink)]">Looking for COA-verified sources?</h3>
          <p className="mt-2 text-[color:var(--ink-soft)]">
            Every compound in our catalog links to a vetted vendor with batch-specific third-party testing.
          </p>
          <Link
            href="/products"
            className="p-btn-primary mt-4 inline-flex px-6 py-3 text-sm uppercase tracking-[0.06em]"
          >
            Browse research compounds →
          </Link>
        </aside>
      </div>
    </div>
  );
}

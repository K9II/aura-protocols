export const metadata = {
  title: "Reading a Certificate of Analysis — Aura Protocols",
  description:
    "What a peptide Certificate of Analysis should prove, and how our vendors' published COAs compare on the same compound.",
};

type VendorRow = {
  vendor: string;
  lab: string;
  labNote?: string;
  accredited?: boolean;
  identity: string;
  identityNote?: string;
  identityState: "yes" | "no" | "part";
  purity: string;
  content: string;
  contentState: "yes" | "no" | "part";
  endotoxin: "yes" | "no" | "part";
  metals: "yes" | "no" | "part";
  sterility: string;
  sterilityState: "yes" | "no" | "part";
  sterilityNote?: string;
  verifiable: string;
};

const VENDORS: VendorRow[] = [
  {
    vendor: "American Peptides",
    lab: "Bioviridian",
    labNote: "signed",
    identity: "Mass spec",
    identityState: "yes",
    purity: "99.8–99.9%",
    content: "Yes",
    contentState: "yes",
    endotoxin: "yes",
    metals: "yes",
    sterility: "–",
    sterilityState: "no",
    verifiable: "Verified",
  },
  {
    vendor: "Evolve",
    lab: "MZ Biolabs",
    labNote: "+ Janoshik",
    identity: "Mass spec",
    identityState: "yes",
    purity: "99.5–99.97%",
    content: "Yes",
    contentState: "yes",
    endotoxin: "no",
    metals: "no",
    sterility: "–",
    sterilityState: "no",
    verifiable: "Verify key",
  },
  {
    vendor: "Ignite",
    lab: "ILS Labs",
    labNote: "ISO 17025 accredited",
    accredited: true,
    identity: "Confirmed",
    identityNote: "RP-HPLC UV",
    identityState: "yes",
    purity: "99.35%",
    content: "Yes · 10.49mg",
    contentState: "yes",
    endotoxin: "yes",
    metals: "yes",
    sterility: "Yes",
    sterilityState: "yes",
    sterilityNote: "+ fentanyl screen",
    verifiable: "Yes",
  },
  {
    vendor: "Improved Peptides",
    lab: "Freedom Diagnostics",
    identity: "Mass spec",
    identityState: "yes",
    purity: "99.96%",
    content: "Yes · 10.67mg",
    contentState: "yes",
    endotoxin: "no",
    metals: "no",
    sterility: "–",
    sterilityState: "no",
    verifiable: "Verified",
  },
  {
    vendor: "Mile High",
    lab: "Chromate / Kovera / ILS",
    identity: "Conforms",
    identityNote: "RP-HPLC UV",
    identityState: "part",
    purity: "99.09%",
    content: "Yes · 10.31mg",
    contentState: "yes",
    endotoxin: "yes",
    metals: "no",
    sterility: "Yes",
    sterilityState: "yes",
    sterilityNote: "Kovera batches",
    verifiable: "Verified",
  },
  {
    vendor: "Peak Lab",
    lab: "Bioviridian",
    labNote: "College Station, TX",
    identity: "Mass spec",
    identityState: "yes",
    purity: "99.7%",
    content: "Yes",
    contentState: "yes",
    endotoxin: "no",
    metals: "no",
    sterility: "–",
    sterilityState: "no",
    verifiable: "Verified",
  },
  {
    vendor: "PSPeptides",
    lab: "3rd-party",
    labNote: "Austin, TX",
    identity: "Mass spec",
    identityState: "yes",
    purity: "99.93%",
    content: "Yes",
    contentState: "yes",
    endotoxin: "yes",
    metals: "yes",
    sterility: "–",
    sterilityState: "no",
    verifiable: "Yes",
  },
];

const PANEL = [
  {
    num: "01 · Identity",
    q: "Is it the right molecule?",
    a: 'Mass spectrometry (LC-MS/MS or MALDI) weighs the peptide to confirm its exact mass. A chromatography-only "reference match" compares peak timing — weaker evidence.',
  },
  {
    num: "02 · Purity",
    q: "How much is the peptide?",
    a: "RP-HPLC separates the sample and reports the percentage that is the target compound versus everything else. Look for a single sharp peak.",
  },
  {
    num: "03 · Content",
    q: "Is the vial filled right?",
    a: "Quantitation measures the actual milligrams present, not just purity. A 99% pure vial that is underfilled still shortchanges the buyer.",
  },
  {
    num: "04 · Safety",
    q: "Is it contaminated?",
    a: "Endotoxin, heavy metals, sterility, and adulterant screens catch what purity can't: bacterial toxins, metals, microbes, and dangerous cutting agents.",
  },
  {
    num: "05 · Provenance",
    q: "Can you trust the paper?",
    a: "An accredited lab, a signed chemist, a web-verifiable code, and tamper-evident marks are what separate a real report from a printed graphic.",
  },
];

function Mark({ state, children }: { state: "yes" | "no" | "part"; children: React.ReactNode }) {
  if (state === "no") {
    return <span className="text-[color:var(--ink-soft)] opacity-55">{children}</span>;
  }
  if (state === "part") {
    return <span className="text-[color:var(--ink-soft)]">{children}</span>;
  }
  return <span className="text-[color:var(--ink)] font-semibold">{children}</span>;
}

export default function QualityStandardsPage() {
  return (
    <div className="pharmacopoeia">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Masthead */}
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-3">
            How we vet every compound
          </p>
          <h1 className="p-serif text-4xl md:text-5xl mb-5 text-[color:var(--ink)] leading-tight">
            Reading a <em className="p-serif-italic text-[color:var(--specimen)] not-italic">Certificate of Analysis</em>
          </h1>
          <p className="text-[color:var(--ink-soft)] leading-relaxed text-[1.05rem]">
            Every vendor we link to publishes a third-party lab report. But not all reports test the
            same things — and a high purity number alone tells you almost nothing. Here is what we
            actually look for, and how our vendors compare on the same compound.
          </p>
        </div>

        {/* The panel */}
        <section className="mb-16 pb-16 border-b border-[color:var(--line)]">
          <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">
            The panel
          </p>
          <h2 className="p-serif text-2xl md:text-3xl mb-3 text-[color:var(--ink)]">
            What a certificate should prove
          </h2>
          <p className="text-[color:var(--ink-soft)] max-w-2xl mb-8 leading-relaxed">
            A complete report answers five separate questions. Most COAs answer two or three. Knowing
            which is missing is the whole point.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-[color:var(--line)]">
            {PANEL.map((item) => (
              <div
                key={item.num}
                className="border-b border-r border-[color:var(--line)] p-5 md:p-6 [&:nth-child(3n)]:border-r-0"
              >
                <span className="text-[11px] font-semibold tracking-wider text-[color:var(--specimen)] uppercase">
                  {item.num}
                </span>
                <h3 className="p-serif text-lg mt-1.5 mb-1.5 text-[color:var(--ink)]">{item.q}</h3>
                <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The full roster */}
        <section className="mb-16 pb-16 border-b border-[color:var(--line)]">
          <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">
            The full roster
          </p>
          <h2 className="p-serif text-2xl md:text-3xl mb-3 text-[color:var(--ink)]">
            Every vendor, one compound
          </h2>
          <p className="text-[color:var(--ink-soft)] max-w-2xl mb-8 leading-relaxed">
            We benchmarked on <em>Retatrutide</em> because every vendor carries it, so the reports are
            directly comparable. Each row is a real published document we read line by line. Vendors
            are listed alphabetically — this is a map of what each report proves, not a ranking.
          </p>

          <div className="border border-[color:var(--ink)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 md:px-5 py-3 border-b border-[color:var(--ink)] bg-[color:var(--paper-deep)]">
              <span className="text-[11px] font-bold tracking-wider uppercase">
                Assay Comparison — Retatrutide
              </span>
              <span className="text-[10.5px] text-[color:var(--ink-soft)] tracking-wide">
                Marks reflect the published reference report
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left w-1/3 font-semibold text-[color:var(--ink-soft)] text-[11px] uppercase tracking-wide px-3.5 py-4 border-b border-[color:var(--ink)] align-bottom">
                      Vendor
                    </th>
                    {["Lab", "Identity", "Purity", "Content", "Endotoxin", "Metals", "Sterility", "Verifiable"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-center font-bold text-[11.5px] uppercase tracking-wide px-3.5 py-4 border-b border-[color:var(--ink)] align-bottom text-[color:var(--ink)]"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {VENDORS.map((v, i) => (
                    <tr
                      key={v.vendor}
                      className={i % 2 === 1 ? "bg-[color:var(--paper-deep)]/45" : ""}
                    >
                      <th className="text-left font-normal p-serif text-[15px] px-3.5 py-3.5 border-b border-[color:var(--line)] text-[color:var(--ink)]">
                        {v.vendor}
                      </th>
                      <td
                        className={`text-center font-sans text-sm tabular-nums px-3.5 py-3.5 border-b border-l border-[color:var(--line)] border-l-[color:var(--line)]/70 ${
                          v.accredited
                            ? "bg-[color:var(--specimen)]/[0.12] shadow-[inset_3px_0_0_var(--specimen)]"
                            : ""
                        }`}
                      >
                        <span className={v.accredited ? "text-[color:var(--specimen)] font-bold" : "text-[color:var(--ink)]"}>
                          {v.lab}
                        </span>
                        {v.labNote && (
                          <span className="block text-[10.5px] text-[color:var(--ink-soft)] mt-0.5">
                            {v.labNote}
                          </span>
                        )}
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)]">
                        <Mark state={v.identityState}>{v.identity}</Mark>
                        {v.identityNote && (
                          <span className="block text-[10.5px] text-[color:var(--ink-soft)] mt-0.5">
                            {v.identityNote}
                          </span>
                        )}
                      </td>
                      <td className="text-center font-sans text-sm tabular-nums px-3.5 py-3.5 border-b border-l border-[color:var(--line)] text-[color:var(--ink)]">
                        {v.purity}
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)]">
                        <Mark state={v.contentState}>{v.content}</Mark>
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)]">
                        <Mark state={v.endotoxin}>{v.endotoxin === "yes" ? "Yes" : "–"}</Mark>
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)]">
                        <Mark state={v.metals}>{v.metals === "yes" ? "Yes" : "–"}</Mark>
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)]">
                        <Mark state={v.sterilityState}>{v.sterility}</Mark>
                        {v.sterilityNote && (
                          <span className="block text-[10.5px] text-[color:var(--ink-soft)] mt-0.5">
                            {v.sterilityNote}
                          </span>
                        )}
                      </td>
                      <td className="text-center font-sans text-sm px-3.5 py-3.5 border-b border-l border-[color:var(--line)] text-[color:var(--ink)] font-semibold">
                        {v.verifiable}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-6 text-[13px] font-sans text-[color:var(--ink-soft)]">
            <span className="inline-flex items-center gap-2">
              <b className="text-[color:var(--ink)] font-semibold">Yes</b> shown on the report
            </span>
            <span className="inline-flex items-center gap-2">
              <b className="text-[color:var(--ink)] font-semibold">–</b> not on this report
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-3 shrink-0 bg-[color:var(--specimen)]/[0.12] shadow-[inset_2px_0_0_var(--specimen)]" />
              Accreditation stated on the certificate
            </span>
          </div>

          <div className="mt-6 border border-[color:var(--line)] bg-[color:var(--paper-deep)]/45 p-5 md:p-6">
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-4">
              Notes on the marks
            </p>
            <dl className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:gap-5">
                <dt className="shrink-0 font-sans text-[13px] font-semibold text-[color:var(--ink)] sm:w-28">
                  Verified
                </dt>
                <dd className="font-sans text-[13px] leading-relaxed text-[color:var(--ink-soft)] max-w-2xl">
                  We personally queried the issuing lab&apos;s own public record — not just the vendor&apos;s
                  page copy — and confirmed that exact certificate is real and on file: American Peptides
                  &amp; Peak Lab against Bioviridian&apos;s COA search, Mile High against Kovera Labs&apos;
                  verification record, and Improved Peptides against Freedom Diagnostics&apos; public
                  database.
                  <br className="hidden sm:block" />
                  <span className="block mt-2">
                    Every other &ldquo;Verify key&rdquo;, &ldquo;Yes&rdquo;, or &ldquo;Batch-verified&rdquo; label
                    means the certificate offers a lookup mechanism we have not — yet, or could not —
                    independently exercised ourselves: Ignite&apos;s ILS Labs portal requires an account
                    login, Evolve&apos;s Janoshik verification page blocks automated checks, and PSPeptides
                    publishes its reports directly rather than through a separate lab registry.
                  </span>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-5 pt-4 border-t border-[color:var(--line)]">
                <dt className="shrink-0 font-sans text-[13px] font-semibold text-[color:var(--ink)] sm:w-28">
                  PSPeptides
                </dt>
                <dd className="font-sans text-[13px] leading-relaxed text-[color:var(--ink-soft)] max-w-2xl">
                  Documents its data across three separate public reports per batch: certificate
                  (identity, purity, content), endotoxin, and heavy metals.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* How to read this */}
        <section className="mb-14">
          <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">
            How to read this
          </p>
          <h2 className="p-serif text-2xl md:text-3xl mb-3 text-[color:var(--ink)]">What the marks mean</h2>
          <p className="text-[color:var(--ink-soft)] max-w-2xl leading-relaxed">
            No single certificate here covers every test — each vendor documents a different
            combination, and a strong purity figure on its own answers only one of the five questions
            above. A filled mark means the test appears on that vendor&apos;s published report; a dash
            means it does not. Use the table to see which questions a certificate answers, then obtain
            the current lot-specific document from the vendor before you buy.
          </p>
        </section>

        {/* Disclaimer */}
        <div className="border-t border-[color:var(--line)] pt-8">
          <p className="text-xs font-sans leading-relaxed text-[color:var(--ink-soft)] max-w-3xl border-l-2 border-[color:var(--specimen)] pl-4">
            <b className="text-[color:var(--ink)]">As reviewed 30 August 2026.</b> The certificate
            details summarized here reflect each vendor&apos;s published Certificate of Analysis as
            reviewed by Aura Protocols on the date shown. A Certificate of Analysis is issued per
            production lot; testing laboratories, methods, and results may differ for other lots and
            may be changed by a vendor at any time without notice. Aura Protocols does not perform,
            commission, or control this testing and assumes no responsibility for any subsequent
            change to a vendor&apos;s COA methods, results, or availability, nor for the accuracy of
            any vendor-issued document. Always obtain and review the current lot-specific Certificate
            of Analysis directly from the vendor before purchase. For research use only — not for
            human consumption; the compounds referenced are not approved by the FDA to prevent, treat,
            or cure any disease. Aura Protocols does not manufacture, test, or sell these compounds.
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import VialTurn from "@/components/store/VialTurn";
import type { Compound } from "@/data/catalog";
import type { PublicCert, PublicLot } from "@/data/catalog-types";
import { vialCap, vialName, vialParts } from "@/lib/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";
import { NOT_RECORDED_LAB } from "@/lib/coa/rules";
import { lotQrUrl, qrRows } from "@/lib/vial-qr";

// Desktop home, option A "Scan strip" (2026-10-17, https://claude.ai/artifact/9QomoXo9brSgbXvQEfD13c):
// three engraved figures in the "How an order runs" plate style — the newest lot's vial turning
// to its QR code, that lot's certificate page as a phone shows it (the live page, framed), and
// the lab's own copy — beside a side column; the newest lot's row underneath.
export default function ScanStrip({ lot, compound, certs, row = true }: { lot: PublicLot; compound: Compound; certs: PublicCert[]; row?: boolean }) {
  const [label, label2] = vialName(compound);
  const lab = certs.find((c) => c.lot === lot.lot && c.labName !== NOT_RECORDED_LAB)?.labName ?? null;
  const tested = new Date(`${lot.testedOn}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section className="s-scan" aria-labelledby="scan-strip-h">
      <div className="s-scan-plate">
        <div className="s-scan-figs">
          <figure>
            <span className="s-scan-tag"><b>Fig. 1</b><span>The vial</span></span>
            <div className="s-scan-art s-scan-vial">
              <VialTurn
                id={`scan-${compound.slug}`} slug={`scan-${compound.slug}`} label={label} label2={label2}
                cap={vialCap(compound)} rule={CLASS_COLOR[compound.chemicalClass]} parts={vialParts(compound)}
                strengths={[{ id: lot.variantId, strength: lot.strength, lot: lot.lot, qr: qrRows(lotQrUrl(lot.lot)) }]}
              />
            </div>
            <figcaption><b>Scan the code.</b>It&apos;s printed on every vial, under the lot number.</figcaption>
          </figure>
          <figure>
            <span className="s-scan-tag"><b>Fig. 2</b><span>Your phone</span></span>
            <div className="s-scan-art">
              <div className="s-scan-phone">
                <iframe src={`/coa/${encodeURIComponent(lot.lot)}`} title={`Lot ${lot.lot}'s certificate page, as a phone shows it`} loading="lazy" tabIndex={-1} />
              </div>
            </div>
            <figcaption><b>Its certificate opens.</b>That lot&apos;s results, nothing to type.</figcaption>
          </figure>
          <figure>
            <span className="s-scan-tag"><b>Fig. 3</b><span>The lab</span></span>
            <div className="s-scan-art">
              {/* a successful check against the lab's own copy; the lab is named only when it's a real
                  lab on file (never the "Not recorded" placeholder of the old test lots) */}
              <div className="s-scan-lab" aria-hidden>
                <span className="k">The lab&apos;s own copy</span>
                {lab && <span className="v">{lab}</span>}
                <span className="s-scan-ok"><i />Verified</span>
                <span className="r"><span>Lot</span><span>{lot.lot}</span><b>Matches</b></span>
                <span className="r"><span>Purity</span><span>{lot.purityPct}%</span><b>Matches</b></span>
                <span className="r"><span>Tested</span><span>{tested}</span><b>Matches</b></span>
              </div>
            </div>
            <figcaption><b>Check it at the source.</b>Each certificate links to the lab&apos;s own copy.</figcaption>
          </figure>
        </div>
        <div className="s-scan-side">
          <span className="s-micro s-scan-eyebrow">On every vial</span>
          <h2 id="scan-strip-h" className="s-h2">Scan the vial. <em>Read the certificate.</em></h2>
          <p>Each vial carries a QR code for its lot. It opens that lot&apos;s certificate here, with a link to the lab&apos;s own copy.</p>
          <Link href="/coa" className="s-micro s-record-link">Look up a lot →</Link>
        </div>
      </div>
      {row && (
        <div className="s-rec-detail s-scan-row">
          <div><small>Newest lot</small><b className="s-mono">{lot.lot}</b></div>
          <div><small>Compound</small><b>{compound.name} {lot.strength}</b></div>
          <div><small>Purity</small><b>{lot.purityPct}%</b></div>
          <div><small>Method</small><b>{lot.method}</b></div>
          <div><small>Tested</small><b>{tested}</b></div>
          <div><small>Status</small><b className="st-live">In stock</b></div>
          <Link href={`/coa/${encodeURIComponent(lot.lot)}`}>Open this lot&apos;s certificate →</Link>
        </div>
      )}
    </section>
  );
}

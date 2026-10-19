import Link from "next/link";
import ProofLead from "@/components/store/ProofLead";
import VialTurn from "@/components/store/VialTurn";
import type { Compound } from "@/data/catalog";
import type { PublicCert, PublicLot } from "@/data/catalog-types";
import { vialCap, vialName, vialParts } from "@/lib/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";
import { lotProofRows } from "@/lib/lot-proof";
import { lotQrUrl, qrRows } from "@/lib/vial-qr";

// Home hero, under the headline (option C "Vial + certificate", chosen 2026-10-17,
// https://claude.ai/artifact/9QomoXo9brSgbXvQEfD13c): the newest lot's vial turns twice and
// rests facing front (Alvester, 2026-10-18; it rested on its QR code); a dotted line runs from
// the code to that lot's certificate while it pauses on the code. Side by side on phones too.
// Every row is the lot's own result — "Not tested" where its certificates don't show one.
export default function LotProof({ lot, compound, certs }: { lot: PublicLot; compound: Compound; certs: PublicCert[] }) {
  const rows = lotProofRows(lot, certs);
  const tested = new Date(`${lot.testedOn}T12:00:00Z`);
  const [label, label2] = vialName(compound);
  return (
    <div className="s-proof" role="group" aria-label={`Lot ${lot.lot}: the code on its vial and the certificate it opens`}>
      <p className="s-proof-h"><span>The code on every vial</span><span>Opens its lot&apos;s certificate</span></p>
      <div className="s-proof-body">
        <div className="s-proof-vial">
          <div className="s-proof-vialbox">
            <VialTurn
              id={`proof-${compound.slug}`} slug={compound.slug} label={label} label2={label2}
              cap={vialCap(compound)} rule={CLASS_COLOR[compound.chemicalClass]} parts={vialParts(compound)}
              strengths={[{ id: lot.variantId, strength: lot.strength, lot: lot.lot, qr: qrRows(lotQrUrl(lot.lot)) }]}
              turns={2}
            />
            <ProofLead slug={compound.slug} />
          </div>
        </div>
        <div className="s-proof-cert">
          <div className="s-proof-ch">
            <span className="s-proof-k">Lot {lot.lot}<span className="s-proof-dk"> · newest</span></span>
            <span className="s-proof-n">{compound.name} <small>{lot.strength}</small></span>
          </div>
          <div className="s-proof-nums">
            <div><b>{lot.purityPct}%</b><span>Purity<span className="s-proof-dk"> · {lot.method}</span></span></div>
            <div>
              <b>{tested.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</b>
              <span>Tested {tested.getUTCFullYear()}</span>
            </div>
          </div>
          <ol className="s-proof-list">
            {rows.map((r) => <li key={r.test} className={r.done ? "" : "is-open"}>{r.test}<span>{r.result}</span></li>)}
          </ol>
          <div className="s-proof-f">
            <small className="s-proof-dk">Links to the lab&apos;s own copy</small>
            <Link href={`/coa/${encodeURIComponent(lot.lot)}`} className="s-proof-link">
              <span className="s-proof-dk">Open this lot&apos;s certificate →</span><span className="s-proof-ph">Open certificate →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

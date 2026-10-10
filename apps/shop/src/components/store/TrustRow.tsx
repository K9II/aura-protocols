import { FREE_SHIPPING_THRESHOLD_USD } from "@/lib/cart";
import { PURITY_FLOOR_PCT } from "@/lib/constants";

// Four claims the site already makes, with "Bench line" icons (approved 2026-10-10).
// Lab vocabulary on purpose: parcel with a stamp, a purity chart with the floor line,
// a separation column (Tsvet's 1906 plate on the home page), a certificate with a seal.
// One proof-green accent per icon. Never promise delivery days or a city.
const ACC = "var(--tested)";

const ICONS = {
  usa: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden>
      <path d="M8 15 L14 9 H34 L40 15" /><rect x="8" y="15" width="32" height="25" /><path d="M24 9 V21" />
      <rect x="28.5" y="25" width="8" height="9" stroke={ACC} /><path d="M30.5 28 H34.5 M30.5 31 H34.5" stroke={ACC} strokeWidth="1" />
      <path d="M12 35 H22" strokeWidth="1" />
    </svg>
  ),
  purity: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" aria-hidden>
      <path d="M6 41 H43" /><path d="M6 41 V7" strokeWidth="1" />
      <path d="M6 13 H43" stroke={ACC} strokeWidth="1.1" strokeDasharray="2 2.5" />
      <path d="M7 39 C12 39 13 38.4 14.5 36.5 C15.5 35.2 16.5 35.2 17.5 36.6 C19 38.6 21 39 24 39 C26.2 39 26.6 12 28 12 C29.4 12 29.8 39 32 39 C36 39 40 38.8 43 38.6" />
    </svg>
  ),
  lab: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" aria-hidden>
      <path d="M20 5 H28 M21 5 V37 H27 V5" />
      <rect x="21.7" y="12" width="4.6" height="4" fill={ACC} stroke="none" />
      <rect x="21.7" y="20" width="4.6" height="3" fill="#7E5B1C" stroke="none" />
      <rect x="21.7" y="27" width="4.6" height="2.5" fill="#A32B1F" stroke="none" />
      <path d="M24 37 V42 M21 42 H27" /><path d="M27 15 H35 M35 9 V44 M30 44 H41" />
    </svg>
  ),
  coa: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" aria-hidden>
      <path d="M10 5 H31 L38 12 V43 H10 Z" /><path d="M31 5 V12 H38" />
      <path d="M15 17 H31 M15 22 H33 M15 27 H25" strokeWidth="1" />
      <circle cx="30" cy="34" r="5" stroke={ACC} />
      <path d="M27.5 38.5 L26 44.5 L28.6 43 L30 45 M32.5 38.5 L34 44.5" stroke={ACC} strokeWidth="1.1" />
      <path d="M28 34 L29.5 35.5 L32.3 32.6" stroke={ACC} strokeWidth="1.2" />
    </svg>
  ),
};

export const TRUST_CLAIMS = [
  { icon: "usa", title: "Ships from the USA", sub: `Tracked · free over $${FREE_SHIPPING_THRESHOLD_USD}` },
  { icon: "purity", title: `≥${PURITY_FLOOR_PCT}% purity floor`, sub: "Every lot, by HPLC" },
  { icon: "lab", title: "Independent US lab", sub: "Third-party tested" },
  { icon: "coa", title: "Certificate every lot", sub: "Matched to your vial" },
] as const;

export default function TrustRow({ className = "" }: { className?: string }) {
  return (
    <ul className={`s-trust ${className}`.trim()} aria-label="Why researchers order from Aura">
      {TRUST_CLAIMS.map((c) => (
        <li key={c.icon}>{ICONS[c.icon]}<b>{c.title}</b><span>{c.sub}</span></li>
      ))}
    </ul>
  );
}

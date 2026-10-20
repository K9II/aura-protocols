// North light behind the home hero (option D, chosen 2026-10-11; mock artifact
// AXG9ymUY7hnEVpDyrqDU7g): soft window light that drifts, a sheer curtain swaying
// through it, a cloud passing now and then, and paper grain. CSS only, decorative;
// stills for visitors who turn motion off.
// where="sphere": just the window, laid behind the sphere itself — phones, where the sphere
// sits mid-hero and the band's window (pinned to the band's foot) would miss it (2026-10-17).
// where="about": the product page's "About this compound" band, the window falling across the
// text and the molecule (2026-10-19).
export default function HeroLight({ where = "band" }: { where?: "band" | "sphere" | "about" }) {
  const windowLight = (
    <div className="s-hl-window">
      <div className="s-hl-clouds"><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
  if (where === "sphere") return <div className="s-hero-light s-hero-light--sphere" aria-hidden>{windowLight}</div>;
  return (
    <div className={`s-hero-light${where === "about" ? " s-hero-light--about" : ""}`} aria-hidden>
      <div className="s-hl-shade" />
      {windowLight}
      <div className="s-hl-grain" />
    </div>
  );
}

// The same light carried through the whole home page (Alvester, 2026-10-19, "Behind panels"):
// the window falls again down the page, left and right in turn, as if the room had a row of
// tall windows. It sits behind the sections, so it shows on the paper between the panels.
// Desktop only; phones keep the hero light alone.
export function PageLight() {
  return (
    <div className="s-page-light" aria-hidden>
      <div className="s-hl-shade" />
      {[1, 2, 3, 4, 5].map((k) => (
        <div key={k} className={`s-hl-window s-pl-w s-pl-w${k}`}>
          <div className="s-hl-clouds"><i /><i /><i /><i /><i /><i /></div>
        </div>
      ))}
      <div className="s-hl-grain" />
    </div>
  );
}

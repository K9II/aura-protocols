// North light behind the home hero (option D, chosen 2026-10-11; mock artifact
// AXG9ymUY7hnEVpDyrqDU7g): soft window light that drifts, a sheer curtain swaying
// through it, a cloud passing now and then, and paper grain. CSS only, decorative;
// stills for visitors who turn motion off.
// where="sphere": just the window, laid behind the sphere itself — phones, where the sphere
// sits mid-hero and the band's window (pinned to the band's foot) would miss it (2026-10-17).
export default function HeroLight({ where = "band" }: { where?: "band" | "sphere" }) {
  const windowLight = (
    <div className="s-hl-window">
      <div className="s-hl-clouds"><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
  if (where === "sphere") return <div className="s-hero-light s-hero-light--sphere" aria-hidden>{windowLight}</div>;
  return (
    <div className="s-hero-light" aria-hidden>
      <div className="s-hl-shade" />
      {windowLight}
      <div className="s-hl-grain" />
    </div>
  );
}

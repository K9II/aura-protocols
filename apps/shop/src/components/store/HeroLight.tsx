// North light behind the home hero (option D, chosen 2026-10-11; mock artifact
// AXG9ymUY7hnEVpDyrqDU7g): soft window light that drifts, a sheer curtain swaying
// through it, a cloud passing now and then, and paper grain. CSS only, decorative;
// stills for visitors who turn motion off. The sphere's shadow is HeroShadow.
export default function HeroLight() {
  return (
    <div className="s-hero-light" aria-hidden>
      <div className="s-hl-shade" />
      <div className="s-hl-window">
        <div className="s-hl-clouds"><i /><i /><i /><i /><i /><i /></div>
      </div>
      <div className="s-hl-grain" />
    </div>
  );
}

// The soft contact shadow under the sphere: it slides against the light and fades
// while a cloud passes, so the molecule reads as floating above the paper.
export function HeroShadow() {
  return <span className="s-hl-track" aria-hidden><span className="s-hl-contact" /></span>;
}

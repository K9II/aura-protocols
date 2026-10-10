// The order minimum, called out so it can't be missed (intro and order sheet).
export default function MinimumKits({ minKits, perStrength }: { minKits: number; perStrength: number }) {
  return (
    <div className="s-ws-min" role="note" aria-label={`Minimum ${minKits} kits per order`}>
      <span className="n" aria-hidden="true">{minKits}</span>
      <div>
        <p className="s-micro k">Minimum order</p>
        <p className="h">Kits <span>({minKits * 10} vials) · mix compounds and strengths, at least {perStrength} kits of each</span></p>
        <p className="t">Every batch is independently tested, and you receive its certificate.</p>
      </div>
    </div>
  );
}

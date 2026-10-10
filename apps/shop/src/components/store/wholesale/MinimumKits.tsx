// The order minimum, called out so it can't be missed (intro and order sheet).
export default function MinimumKits({ minKits }: { minKits: number }) {
  return (
    <div className="s-ws-min" role="note" aria-label={`Minimum ${minKits} kits per order`}>
      <span className="n" aria-hidden="true">{minKits}</span>
      <div>
        <p className="s-micro k">Minimum order</p>
        <p className="h">Kits <span>({minKits * 10} vials) · mix any compounds and strengths</span></p>
        <p className="t">Every batch is independently tested, and you receive its certificate.</p>
      </div>
    </div>
  );
}

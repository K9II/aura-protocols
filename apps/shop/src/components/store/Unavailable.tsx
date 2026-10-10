// Fail-closed panel: the live catalog couldn't be read. Never show code prices.
export default function Unavailable() {
  return (
    <div className="pharmacopoeia"><div className="p-container" style={{ padding: "96px 0" }}>
      <p className="s-micro">Catalog</p>
      <h1 className="s-pdp-h1">Unavailable right <em>now</em></h1>
      <p className="text-[color:var(--ink-soft)]">We can&apos;t load prices and stock at the moment. Please try again in a few minutes.</p>
    </div></div>
  );
}

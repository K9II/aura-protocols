import KitBox from "@/components/store/wholesale/KitBox";
import { featuredKits, kitTitle, type KitSheetRow } from "@/lib/wholesale/rules";

// Signed-out page (mock w2): five kit pictures, then every strength offered as
// a kit by name, grouped by chemical class. No prices.
export default function FeaturedKits({ rows }: { rows: KitSheetRow[] }) {
  const classes = [...new Set(rows.map((r) => r.chemicalClass))];
  return (
    <>
      <p className="s-micro" style={{ margin: "0 0 8px" }}>Offered as kits · {rows.length} strengths</p>
      <div className="s-ws-feat">
        {featuredKits(rows).map((r) => {
          const t = kitTitle(r);
          return (
            <div key={`${r.slug}/${r.variantId}`}>
              <KitBox title={t.title} strength={r.strength} art={r.art} width={200} />
              <span className="s-ws-nm">{t.title}</span>
              {t.scientific && <span className="s-ws-pv" style={{ display: "block" }}>{t.scientific}</span>}
              <span className="s-ws-pv">{r.strength} · kit of 10</span>
            </div>
          );
        })}
      </div>
      <div className="s-ws-names">
        {classes.map((c) => (
          <p key={c}><span className="s-ws-cls">— {c}</span>
            {rows.filter((r) => r.chemicalClass === c).map((r) => {
              const t = kitTitle(r);
              return `${t.title}${t.scientific ? ` (${t.scientific})` : ""} ${r.strength}`;
            }).join(" · ")}
          </p>
        ))}
      </div>
    </>
  );
}

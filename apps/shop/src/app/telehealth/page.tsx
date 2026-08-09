import { getPartnerId, TELEHEALTH_CATEGORIES } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import type { CatalogProduct } from "@/lib/telehealth/types";
import TelehealthStartVisit from "./TelehealthStartVisit";

export const dynamic = "force-dynamic"; // catalog is no-store / live

export const metadata = {
  title: "Telehealth — Aura Protocols",
  description: "Clinician-prescribed telehealth protocols, matched to your biometrics.",
};

function priceLabel(p: CatalogProduct): string {
  if (!p.fromPrice) return "See pricing";
  return `from $${p.fromPrice.amount}/mo`;
}

export default async function TelehealthPage() {
  const partnerId = getPartnerId();
  const sections = await Promise.all(
    TELEHEALTH_CATEGORIES.map(async (category) => {
      const res = await fetchCatalog(category, partnerId);
      return { category, products: res.ok ? res.products : [] };
    }),
  );
  const total = sections.reduce((n, s) => n + s.products.length, 0);

  return (
    <div className="pharmacopoeia">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-[color:var(--specimen)] font-semibold mb-2">Aura Telehealth</p>
        <h1 className="p-serif text-4xl mb-8 text-[color:var(--ink)]">Prescription care, matched to your biometrics</h1>

        {total === 0 && (
          <p className="text-sm text-[color:var(--specimen)]">
            Catalog is currently unavailable. (Check TELEHEALTH_PARTNER_ID.)
          </p>
        )}

        {sections.map(({ category, products }) => (
          products.length > 0 && (
            <section key={category} className="mb-12">
              <h2 className="p-serif text-xl mb-6 capitalize text-[color:var(--ink)]">{category.replace("-", " ")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map((p) => (
                  <div key={p.id} className="pharmacopoeia p-card p-6 flex flex-col gap-3">
                    <h3 className="p-serif text-lg text-[color:var(--ink)]">{p.name}</h3>
                    <p className="text-xs text-[color:var(--ink-soft)]">{p.availability}</p>
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-[color:var(--line)]">
                      <span className="text-sm font-mono text-[color:var(--ink)]">{priceLabel(p)}</span>
                      <TelehealthStartVisit category={category} productId={p.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        ))}

        <div className="mt-16 border-t border-[color:var(--line)] pt-6">
          <p className="text-xs leading-relaxed text-[color:var(--ink-faint)]">
            <strong className="text-[color:var(--ink-soft)]">Aura Protocols is not a medical provider and does not prescribe, dispense, or provide medical advice.</strong>{" "}
            Telehealth programs are offered through our licensed partner, Leg Up Recovery, and its affiliated medical group; independent licensed clinicians make all treatment decisions, and prescriptions are issued only when clinically appropriate. Programs, pricing, and availability are set by the partner and vary by state. This page is not a substitute for professional medical care &mdash; for emergencies, call 911. Aura may receive compensation when you use these services.{" "}
            <a href="/telehealth/disclosures" className="p-link">Full telehealth disclosures &rarr;</a>
          </p>
        </div>
      </div>
    </div>
  );
}

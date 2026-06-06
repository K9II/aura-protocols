"use client";

import { useState, useMemo } from "react";
import RecommendationCard from "@/components/RecommendationCard";
import VendorRail from "@/components/VendorRail";
import EngineLogDrawer from "@/components/EngineLogDrawer";
import type { ProtocolOutput, RulesSummary, Tension } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";
import type { RoutingDecision } from "@/components/ClinicalRouter";
import { routeByVendor, type RailItem } from "@/lib/recommend/vendor-router";
import { products } from "@/data/products";
import { PROTOCOL_LABELS } from "@/lib/constants";

interface RecState { id: string; output: ProtocolOutput; rules: RulesSummary; }

const FALLBACK_RULES: RulesSummary = { template: "RECOVERY", triggers: [], contraindications: [], doseCeilings: {} };

interface Props {
  initial: RecState | null;
  profile: ProfileContext | null;
  completenessScore: number;
  nextPrompt: string | null;
  protocolAgeDays: number | null;
  routingDecision: RoutingDecision | null;
}

function buildRailItems(output: ProtocolOutput): RailItem[] {
  const nameIndex = new Map<string, { slug: string; category: string }>();
  for (const p of products) {
    nameIndex.set(p.name.toLowerCase(), { slug: p.slug, category: p.category });
    nameIndex.set(p.slug.toLowerCase(), { slug: p.slug, category: p.category });
  }

  function resolve(compound: string): { slug: string; category: string } {
    const key = compound.toLowerCase().trim();
    const exact = nameIndex.get(key);
    if (exact) return exact;
    const stripped = key.replace(/\s*\(.*?\)\s*/g, "").trim();
    const noPar = nameIndex.get(stripped);
    if (noPar) return noPar;
    const firstWord = stripped.split(/\s+/)[0];
    const firstWordHit = nameIndex.get(firstWord);
    if (firstWordHit) return firstWordHit;
    return { slug: `unknown-${stripped.replace(/\s+/g, "-")}`, category: "Peptides" };
  }

  const items: RailItem[] = [];

  for (const step of output.steps) {
    const { slug, category } = resolve(step.compound);
    items.push({
      slug,
      name: step.compound,
      dose: `${step.dose} · ${step.timing}`,
      category,
    });
  }

  for (const v of output.vitamins ?? []) {
    items.push({
      slug: `slot-vitamin-${v.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: v.name,
      dose: v.dose,
      category: "Vitamins",
    });
  }

  for (const p of output.protein ?? []) {
    items.push({
      slug: `slot-protein-${p.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: p.name,
      dose: p.dose,
      category: "Protein",
    });
  }

  return items;
}

export default function RecommendationClient({
  initial,
  profile: _profile,
  completenessScore,
  nextPrompt,
  protocolAgeDays,
  routingDecision,
}: Props) {
  const [rec, setRec] = useState<RecState | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Option A: engine is affiliate-only. Preserve the contraindication safety
  // floor (clinical_only), but never offer the clinical_primary handoff —
  // users who want Rx will choose Aura Clinical at the homepage door.
  const [liveSafetyOnly, setLiveSafetyOnly] = useState(routingDecision === "clinical_only");
  const liveCardRouting: RoutingDecision = liveSafetyOnly ? "clinical_only" : "affiliate_primary";

  async function generate() {
    setLoading(true); setError(null);
    const res = await fetch("/api/recommend", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Could not generate. Try again.");
      return;
    }
    const j = (await res.json()) as { id: string; output: ProtocolOutput; rules: RulesSummary; tensions?: Tension[] };
    const rules: RulesSummary = j.rules ?? FALLBACK_RULES;
    setRec({ id: j.id, output: j.output, rules });
    setLiveSafetyOnly(rules.contraindications.length > 0);
  }

  const railGroups = useMemo(() => {
    if (!rec || liveSafetyOnly) return [];
    const items = buildRailItems(rec.output);
    return routeByVendor(items, products);
  }, [rec, liveSafetyOnly]);

  const liveVendorCount = railGroups.filter((g) => g.kind === "live").length;
  const tbdCount = railGroups.filter((g) => g.kind === "tbd").length;

  return (
    <div>
      {completenessScore < 100 && nextPrompt && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Profile completeness</span>
            <span>{completenessScore}%</span>
          </div>
          <div className="mb-3 h-1.5 w-full rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-cyan-500 transition-all" style={{ width: `${completenessScore}%` }} />
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-cyan-400">→</span>{" "}
            <a href="/onboarding" className="underline hover:text-white">{nextPrompt}</a>
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

      {rec && (
        <>
          <RecommendationCard
            id={rec.id}
            output={rec.output}
            rules={rec.rules}
            routing={liveCardRouting}
            protocolAgeDays={protocolAgeDays}
            onRegenerate={generate}
            loading={loading}
          />

          {!liveSafetyOnly && railGroups.length > 0 && (
            <>
              <EngineLogDrawer
                rules={rec.rules}
                vendorCount={liveVendorCount}
                tbdCount={tbdCount}
              />
              <VendorRail
                groups={railGroups}
                templateLabel={PROTOCOL_LABELS[rec.rules.template]}
              />
            </>
          )}
        </>
      )}

      {!rec && !loading && (
        <div className="rounded-xl border border-dashed border-white/20 p-12 text-center text-slate-500 text-sm">
          <p className="mb-4">Connect your wearable or upload data, then generate your protocol.</p>
          <button
            type="button"
            onClick={generate}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-[#04060f] transition hover:bg-cyan-400"
          >
            Generate my protocol
          </button>
        </div>
      )}

      {!rec && loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-slate-500 text-sm">
          Generating your protocol…
        </div>
      )}
    </div>
  );
}

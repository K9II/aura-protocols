"use client";

import { useState } from "react";
import type { ProtocolOutput, RulesSummary, NutritionItem, FoodItem, TitrationPhase, Tension, TensionSeverity } from "@/lib/recommend/schema";
import type { RoutingDecision } from "@/components/ClinicalRouter";
import { CLINICAL_URL, DISCLAIMER } from "@/lib/constants";
import FeedbackWidget from "@/components/FeedbackWidget";

type Tab = "peptides" | "protein" | "vitamins" | "foods";

const SEVERITY: Record<TensionSeverity, string> = {
  watch: "#fbbf24",
  elevated: "#fb923c",
  high: "#fb7185",
};

function humanizeTensionId(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface TelemetryDisplay {
  hrvAvg: string; hrvTrend: "up" | "down" | "neutral";
  rhr: string;
  sleepAvg: string; sleepTrend: "up" | "down" | "neutral";
  sleepEff: string; remRatio: string; deepSleep: string;
  recovery: string; recoveryTrend: "up" | "down" | "neutral";
  strain: string; respRate: string; spo2: string;
  cgmMean: string; goal: string;
  hrvSparkPath: string; recoverySparkPath: string;
}

export interface RecommendationCardProps {
  id: string;
  output: ProtocolOutput;
  rules: RulesSummary;
  routing: RoutingDecision;
  telemetry?: TelemetryDisplay | null;
  sessionId?: string;
  protocolAgeDays?: number | null;
  onRegenerate?: () => void;
  loading?: boolean;
  tensions?: Tension[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trendColor(t: "up" | "down" | "neutral") {
  return t === "up" ? "#34d399" : t === "down" ? "#fb7185" : "#ffffff";
}

function StatRow({ label, value, trend = "neutral" }: { label: string; value: string; trend?: "up" | "down" | "neutral" | "dim" }) {
  const color = trend === "dim" ? "#475569" : trend === "neutral" ? "#ffffff" : trendColor(trend as "up" | "down" | "neutral");
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", fontSize: 10, borderBottom: "1px dotted rgba(255,255,255,.04)" }}>
      <span style={{ color: "#64748b", letterSpacing: ".06em" }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Sparkline({ label, path, color }: { label: string; path: string; color: string }) {
  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 9, color: "#64748b", letterSpacing: ".1em", marginBottom: 3 }}>{label}</div>
      <div style={{ background: "rgba(255,255,255,.02)", borderRadius: 4, padding: 4, height: 26 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d={path} fill="none" stroke={color} strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

// ─── Left panel ──────────────────────────────────────────────────────────────

function TelemetryPanel({ t }: { t: TelemetryDisplay | null | undefined }) {
  const d = t ?? null;
  const dash = "—";
  return (
    <div style={{ padding: 16, borderRight: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg,rgba(255,255,255,.012),transparent)", minHeight: 580 }}>
      <div style={{ fontSize: 9, letterSpacing: ".22em", color: "#00d4ff", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "1px dashed rgba(0,212,255,.2)", display: "flex", justifyContent: "space-between" }}>
        <span>▸ Telemetry · 7d</span>
        <span style={{ color: "#34d399" }}>● live</span>
      </div>
      <StatRow label="HRV avg" value={d?.hrvAvg ?? dash} trend={d?.hrvTrend ?? "neutral"} />
      <StatRow label="RHR" value={d?.rhr ?? dash} />
      <StatRow label="Sleep avg" value={d?.sleepAvg ?? dash} trend={d?.sleepTrend ?? "neutral"} />
      <StatRow label="Sleep eff." value={d?.sleepEff ?? dash} />
      <StatRow label="REM ratio" value={d?.remRatio ?? dash} />
      <StatRow label="Deep sleep" value={d?.deepSleep ?? dash} />
      <StatRow label="Recovery" value={d?.recovery ?? dash} trend={d?.recoveryTrend ?? "neutral"} />
      <StatRow label="Strain avg" value={d?.strain ?? dash} />
      <StatRow label="Resp. rate" value={d?.respRate ?? dash} />
      <StatRow label="SpO₂" value={d?.spo2 ?? dash} />
      <StatRow label="CGM mean" value={d?.cgmMean ?? dash} trend={d?.cgmMean && d.cgmMean !== dash ? "neutral" : "dim"} />
      <StatRow label="Goal" value={d?.goal ?? dash} trend="dim" />
      {d && <>
        <Sparkline label="HRV · 14d" path={d.hrvSparkPath} color="#fb7185" />
        <Sparkline label="Recovery · 14d" path={d.recoverySparkPath} color="#00d4ff" />
      </>}
    </div>
  );
}

// ─── Center panel ─────────────────────────────────────────────────────────────

function BiosignaturePanel({ steps, sessionId }: { steps: ProtocolOutput["steps"]; sessionId: string }) {
  const t1 = steps[0]?.compound ?? "—";
  const t2 = steps[1]?.compound ?? null;
  return (
    <div style={{ background: "radial-gradient(ellipse 65% 80% at 50% 45%,rgba(0,212,255,.06) 0%,rgba(139,92,246,.04) 35%,rgba(4,6,15,0) 75%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 14px 10px" }}>
      <div style={{ fontSize: 9, letterSpacing: ".22em", color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Your Biosignature</div>
      <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: ".15em", marginBottom: 0 }}>{sessionId} · day 14</div>
      <svg style={{ width: "100%", maxWidth: 340, aspectRatio: "1", margin: "4px 0" }} viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="rc-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.18"/>
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.05"/>
            <stop offset="100%" stopColor="#04060f" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="rc-ln" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff"/><stop offset="100%" stopColor="#8b5cf6"/>
          </linearGradient>
          <filter id="rc-gw">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="210" cy="210" r="200" fill="url(#rc-bg)"/>
        <circle cx="210" cy="210" r="190" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        <circle cx="210" cy="210" r="155" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="2 5"/>
        <circle cx="210" cy="210" r="115" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="2 5"/>
        <circle cx="210" cy="210" r="75"  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="2 5"/>
        <circle cx="210" cy="210" r="38"  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"/>
        <text x="210" y="22"  textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace" letterSpacing="2">HRV</text>
        <text x="400" y="213" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace" letterSpacing="2">SLEEP</text>
        <text x="210" y="408" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace" letterSpacing="2">RECOVERY</text>
        <text x="20"  y="213" textAnchor="middle" fill="#475569" fontSize="9" fontFamily="monospace" letterSpacing="2">STRAIN</text>
        <path d="M210,40 L305,90 L370,210 L320,330 L210,378 L105,335 L50,210 L115,85 Z" fill="rgba(0,212,255,0.05)" stroke="url(#rc-ln)" strokeWidth="1.6"/>
        <path d="M210,65 Q280,95 320,170 Q355,235 295,310 Q230,355 145,320 Q75,285 70,205 Q70,120 145,90 Q180,75 210,65 Z" fill="none" stroke="rgba(139,92,246,0.55)" strokeWidth="1.2"/>
        <g stroke="rgba(0,212,255,0.35)" strokeWidth="0.7">
          <line x1="210" y1="210" x2="210" y2="50"/><line x1="210" y1="210" x2="320" y2="100"/>
          <line x1="210" y1="210" x2="370" y2="210"/><line x1="210" y1="210" x2="318" y2="320"/>
          <line x1="210" y1="210" x2="210" y2="370"/><line x1="210" y1="210" x2="100" y2="320"/>
          <line x1="210" y1="210" x2="50"  y2="210"/><line x1="210" y1="210" x2="100" y2="100"/>
        </g>
        <path d="M80,210 Q110,180 140,210 T200,210 T260,210 T320,210 T340,210" fill="none" stroke="rgba(0,212,255,0.4)" strokeWidth="1" strokeDasharray="1 2"/>
        <circle cx="320" cy="100" r="14" fill="none" stroke="#fb7185" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.85"/>
        <text x="340" y="93" fill="#fda4af" fontSize="9" fontFamily="monospace" letterSpacing="1">▸ T1</text>
        <circle cx="100" cy="320" r="14" fill="none" stroke="#fb7185" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.85"/>
        <text x="56" y="345" fill="#fda4af" fontSize="9" fontFamily="monospace" letterSpacing="1">T2 ◂</text>
        <circle cx="370" cy="210" r="10" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 4" opacity="0.7"/>
        <text x="384" y="207" fill="#fde68a" fontSize="8" fontFamily="monospace">N1</text>
        <circle cx="210" cy="370" r="10" fill="none" stroke="#34d399" strokeWidth="1" strokeDasharray="2 4" opacity="0.7"/>
        <text x="218" y="390" fill="#6ee7b7" fontSize="8" fontFamily="monospace">N2</text>
        <circle cx="210" cy="50"  r="4.5" fill="#00d4ff" filter="url(#rc-gw)"/>
        <circle cx="320" cy="100" r="3.5" fill="#8b5cf6"/>
        <circle cx="370" cy="210" r="4"   fill="#fbbf24"/>
        <circle cx="318" cy="320" r="3"   fill="#8b5cf6"/>
        <circle cx="210" cy="370" r="4.5" fill="#34d399"/>
        <circle cx="100" cy="320" r="3"   fill="#8b5cf6"/>
        <circle cx="50"  cy="210" r="3.5" fill="#00d4ff"/>
        <circle cx="100" cy="100" r="3.5" fill="#8b5cf6"/>
        <circle cx="210" cy="210" r="8"   fill="#fff" filter="url(#rc-gw)"/>
        <circle cx="210" cy="210" r="14"  fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
      </svg>
      {/* Resonance pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
        <ResPill color="cyan">{`T1 · ${t1}`}</ResPill>
        {t2 && <ResPill color="violet">{`T2 · ${t2}`}</ResPill>}
        <ResPill color="amber">N1 · Vitamins</ResPill>
        <ResPill color="emerald">N2 · Protein</ResPill>
      </div>
    </div>
  );
}

function ResPill({ color, children }: { color: "cyan" | "violet" | "amber" | "emerald"; children: React.ReactNode }) {
  const map = {
    cyan:    { bg: "rgba(0,212,255,.08)",   text: "#67e8f9", border: "rgba(0,212,255,.18)",  dot: "#00d4ff", glow: "rgba(0,212,255,.7)" },
    violet:  { bg: "rgba(139,92,246,.08)",  text: "#c4b5fd", border: "rgba(139,92,246,.22)", dot: "#8b5cf6", glow: "rgba(139,92,246,.7)" },
    amber:   { bg: "rgba(251,191,36,.08)",  text: "#fde68a", border: "rgba(251,191,36,.22)", dot: "#fbbf24", glow: "rgba(251,191,36,.7)" },
    emerald: { bg: "rgba(52,211,153,.08)",  text: "#6ee7b7", border: "rgba(52,211,153,.22)", dot: "#34d399", glow: "rgba(52,211,153,.7)" },
  }[color];
  return (
    <span style={{ fontSize: 9, padding: "3px 9px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${map.border}`, background: map.bg, color: map.text, cursor: "pointer" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: map.dot, boxShadow: `0 0 6px ${map.glow}`, flexShrink: 0 }} />
      {children}
    </span>
  );
}

// ─── Right panel cards ────────────────────────────────────────────────────────

function OutCard({ variant, label, badge, name, dose, meta, shopBtn, titration }: {
  variant: "peptide-primary" | "peptide-adj" | "protein" | "vitamin" | "food";
  label: string; badge?: string; name: string; dose: string; meta: string; shopBtn?: boolean;
  titration?: TitrationPhase[] | null;
}) {
  const styles = {
    "peptide-primary": { bg: "linear-gradient(135deg,rgba(0,212,255,.06),rgba(139,92,246,.04))", border: "rgba(0,212,255,.2)", labelColor: "#00d4ff" },
    "peptide-adj":     { bg: "linear-gradient(135deg,rgba(139,92,246,.06),rgba(0,212,255,.03))", border: "rgba(139,92,246,.25)", labelColor: "#c084fc" },
    "protein":         { bg: "linear-gradient(135deg,rgba(139,92,246,.06),rgba(0,212,255,.03))", border: "rgba(139,92,246,.25)", labelColor: "#8b5cf6" },
    "vitamin":         { bg: "linear-gradient(135deg,rgba(251,191,36,.06),rgba(0,212,255,.02))", border: "rgba(251,191,36,.25)", labelColor: "#fbbf24" },
    "food":            { bg: "linear-gradient(135deg,rgba(0,212,255,.05),rgba(139,92,246,.02))", border: "rgba(0,212,255,.18)",  labelColor: "#00d4ff" },
  }[variant];

  return (
    <div style={{ borderRadius: 10, padding: 11, marginBottom: 8, border: `1px solid ${styles.border}`, background: styles.bg }}>
      <div style={{ fontSize: 8.5, letterSpacing: ".2em", marginBottom: 4, display: "flex", justifyContent: "space-between", color: styles.labelColor }}>
        <span>{label}</span>
        <span style={{ color: "#94a3b8" }}>{badge}</span>
        {shopBtn && (
          <button style={{ fontSize: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", padding: "2px 8px", borderRadius: 4, cursor: "pointer" }}>
            Shop →
          </button>
        )}
      </div>
      <div style={{ fontFamily: "'Plus Jakarta Sans',ui-sans-serif,sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2, letterSpacing: "-.01em" }}>{name}</div>
      <div style={{ fontSize: 10, color: "#cbd5e1" }}>{dose}</div>
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>{meta}</div>
      {titration && titration.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 7, borderTop: "1px dashed rgba(255,255,255,.08)" }}>
          <div style={{ fontSize: 8, letterSpacing: ".18em", color: "#94a3b8", marginBottom: 4 }}>▸ TITRATION</div>
          {titration.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, padding: "2px 0", color: "#cbd5e1" }}>
              <span style={{ color: "#64748b" }}>{t.phase}</span>
              <span>{t.dose}</span>
              <span style={{ color: "#94a3b8" }}>{t.duration}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HandoffSection({ routing }: { routing: RoutingDecision }) {
  if (routing === "clinical_only") {
    return (
      <div style={{ border: "1px solid rgba(251,113,133,.4)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(251,113,133,.1),rgba(139,92,246,.05))" }}>
        <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#fb7185", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
          <span>▸ HANDOFF · CLINICAL ONLY</span><span style={{ fontSize: 8, color: "#fb7185" }}>clinical_only</span>
        </div>
        <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>contraindication detected · affiliate routing disabled</div>
        <a href={CLINICAL_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "linear-gradient(135deg,#fb7185,#8b5cf6)", color: "#04060f", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", marginBottom: 5, textDecoration: "none" }}>
          Get this prescribed at Aura Clinical →
        </a>
        <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>{DISCLAIMER}</div>
      </div>
    );
  }
  if (routing === "clinical_primary") {
    return (
      <div style={{ border: "1px solid rgba(139,92,246,.3)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(139,92,246,.1),rgba(0,212,255,.04))" }}>
        <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#c084fc", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
          <span>▸ HANDOFF · FULFILLMENT</span><span style={{ fontSize: 8, color: "#c084fc" }}>clinical_primary</span>
        </div>
        <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>rx_interest=true · clinical route preferred</div>
        <a href={CLINICAL_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: "linear-gradient(135deg,#8b5cf6,#00d4ff)", color: "#04060f", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", marginBottom: 5, textDecoration: "none" }}>
          Get this prescribed at Aura Clinical →
        </a>
        <a href="/products" style={{ display: "block", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#64748b", fontSize: 9, padding: 6, borderRadius: 6, textAlign: "center", letterSpacing: ".04em", textDecoration: "none" }}>
          Or browse research-grade vendors →
        </a>
        <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>{DISCLAIMER}</div>
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid rgba(0,212,255,.25)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(0,212,255,.08),rgba(139,92,246,.06))" }}>
      <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#00d4ff", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
        <span>▸ HANDOFF · FULFILLMENT</span><span style={{ fontSize: 8, color: "#34d399" }}>affiliate_primary</span>
      </div>
      <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>rx_interest=false · no contraindications</div>
      {/* Primary slot — Aura Clinical when operational */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.15)", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "#64748b", letterSpacing: ".08em" }}>Aura Clinical · get it prescribed</span>
        <span style={{ fontSize: 8, background: "rgba(139,92,246,.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,.25)", borderRadius: 4, padding: "2px 7px", letterSpacing: ".1em" }}>launching soon</span>
      </div>
      <a href="/products" style={{ display: "block", background: "linear-gradient(135deg,#00d4ff,#8b5cf6)", color: "#04060f", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", marginBottom: 5, textDecoration: "none" }}>
        Shop COA-verified vendors →
      </a>
      <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>{DISCLAIMER}</div>
    </div>
  );
}

// ─── Right panel (tabs) ───────────────────────────────────────────────────────

function RightPanel({ output, routing }: { output: ProtocolOutput; routing: RoutingDecision }) {
  const [tab, setTab] = useState<Tab>("peptides");
  const tabColor = { peptides: "#34d399", protein: "#8b5cf6", vitamins: "#fbbf24", foods: "#00d4ff" }[tab];

  const protein  = (output.protein  ?? []) as NutritionItem[];
  const vitamins = (output.vitamins ?? []) as NutritionItem[];
  const foods    = (output.foods    ?? []) as FoodItem[];

  return (
    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(180deg,rgba(255,255,255,.012),transparent)", display: "flex", flexDirection: "column", padding: 16 }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 14, flexShrink: 0 }}>
        {(["peptides","protein","vitamins","foods"] as Tab[]).map((t) => {
          const active = t === tab;
          const c = { peptides: "#34d399", protein: "#8b5cf6", vitamins: "#fbbf24", foods: "#00d4ff" }[t];
          return (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", padding: "7px 11px", cursor: "pointer", background: "none", border: "none", borderBottom: active ? `2px solid ${c}` : "2px solid transparent", marginBottom: -1, color: active ? c : "#334155", transition: "color .15s", userSelect: "none" }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Peptides pane */}
      {tab === "peptides" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {output.steps.map((s, i) => (
            <OutCard key={i}
              variant={i === 0 ? "peptide-primary" : "peptide-adj"}
              label={i === 0 ? "▸ T1 · PRIMARY" : "▸ T2 · ADJUNCT"}
              badge={`res ${s.resonance.toFixed(2)}`}
              name={s.compound}
              dose={s.dose}
              meta={`${s.timing} · ${s.resonanceReason}`}
              titration={s.titration ?? null}
            />
          ))}
          <HandoffSection routing={routing} />
        </div>
      )}

      {/* Protein pane */}
      {tab === "protein" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {protein.length > 0 ? protein.map((p, i) => (
            <OutCard key={i} variant="protein"
              label={`▸ N2${String.fromCharCode(97 + i).toUpperCase()} · ${i === 0 ? "PRIMARY" : "ADJUNCT"}`}
              name={p.name} dose={p.dose} meta={p.rationale.slice(0, 80)} shopBtn />
          )) : (
            <div style={{ fontSize: 10, color: "#475569", padding: "20px 0" }}>Generate a protocol to populate protein.</div>
          )}
          <div style={{ border: "1px solid rgba(139,92,246,.25)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(139,92,246,.08),rgba(0,212,255,.04))" }}>
            <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#8b5cf6", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>▸ FULFILLMENT · SUPPLEMENTS</span><span style={{ fontSize: 8, color: "#8b5cf6" }}>affiliate slot</span>
            </div>
            <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>whey · casein · plant isolates · partners TBD</div>
            <button style={{ display: "block", width: "100%", background: "#8b5cf6", color: "#fff", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", border: "none", cursor: "pointer", marginBottom: 8 }}>
              Shop protein supplements →
            </button>
            <div style={{ borderTop: "1px solid rgba(139,92,246,.15)", paddingTop: 8 }}>
              <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#34d399", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                <span>▸ FULFILLMENT · NATURAL</span><span style={{ fontSize: 8, color: "#475569" }}>pending vet</span>
              </div>
              <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 6 }}>organic · grass-fed · wild-caught · sourcing partners under review</div>
              <button disabled style={{ display: "block", width: "100%", background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", color: "#475569", fontWeight: 600, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", cursor: "not-allowed" }}>
                Shop grass-fed sources →
              </button>
            </div>
            <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>Affiliate buttons activate when partners are onboarded.</div>
          </div>
        </div>
      )}

      {/* Vitamins pane */}
      {tab === "vitamins" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {vitamins.length > 0 ? vitamins.map((v, i) => (
            <OutCard key={i} variant="vitamin"
              label={`▸ N1${String.fromCharCode(97 + i).toUpperCase()}${i === 0 ? " · BASE STACK" : ""}`}
              name={v.name} dose={v.dose} meta={v.rationale.slice(0, 80)} shopBtn />
          )) : (
            <div style={{ fontSize: 10, color: "#475569", padding: "20px 0" }}>Generate a protocol to populate vitamins.</div>
          )}
          <div style={{ border: "1px solid rgba(251,191,36,.25)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(251,191,36,.08),rgba(0,212,255,.02))" }}>
            <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#fbbf24", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>▸ FULFILLMENT</span><span style={{ fontSize: 8, color: "#fbbf24" }}>affiliate slot</span>
            </div>
            <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>partners TBD · slot ready</div>
            <button style={{ display: "block", width: "100%", background: "#fbbf24", color: "#000", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", border: "none", cursor: "pointer" }}>
              Shop vitamins →
            </button>
            <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>Affiliate buttons activate when partners are onboarded.</div>
          </div>
        </div>
      )}

      {/* Foods pane */}
      {tab === "foods" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {foods.length > 0 ? foods.map((f, i) => (
            <OutCard key={i} variant="food"
              label={`▸ ${i === 0 ? "ORGANIC · WHOLE FOOD" : "DAILY"}`}
              name={f.name} dose={f.frequency} meta={f.rationale.slice(0, 80)} />
          )) : (
            <div style={{ fontSize: 10, color: "#475569", padding: "20px 0" }}>Generate a protocol to populate foods.</div>
          )}
          <div style={{ border: "1px solid rgba(0,212,255,.25)", borderRadius: 10, padding: 11, marginTop: "auto", paddingTop: 12, background: "linear-gradient(135deg,rgba(0,212,255,.06),rgba(139,92,246,.03))" }}>
            <div style={{ fontSize: 8.5, letterSpacing: ".2em", color: "#00d4ff", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <span>▸ FULFILLMENT</span><span style={{ fontSize: 8, color: "#00d4ff" }}>affiliate slot</span>
            </div>
            <div style={{ fontSize: 8.5, color: "#475569", marginBottom: 8 }}>organic · grass-fed · wild-caught · partners pending vet</div>
            <button style={{ display: "block", width: "100%", background: "#00d4ff", color: "#000", fontWeight: 700, fontSize: 10.5, padding: 10, borderRadius: 8, textAlign: "center", letterSpacing: ".04em", border: "none", cursor: "pointer" }}>
              Shop food sources →
            </button>
            <div style={{ fontSize: 8, color: "#334155", lineHeight: 1.5, marginTop: 8, fontFamily: "ui-sans-serif,sans-serif", fontStyle: "italic" }}>Affiliate buttons activate when partners are onboarded.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bottom: reasoning log + command bar ─────────────────────────────────────

function buildLog(rules: RulesSummary, routing: RoutingDecision) {
  const base = new Date();
  const ts = (s: number) => {
    const d = new Date(base.getTime() - s * 1000);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };
  const entries: { ts: string; tag: "rule"|"llm"|"nut"|"out"; bold: string; rest: string }[] = [
    { ts: ts(8), tag: "rule", bold: "contraindications", rest: ` · ${rules.contraindications.length === 0 ? "pass" : rules.contraindications[0]}` },
    { ts: ts(7), tag: "rule", bold: "", rest: `template = ${rules.template}` },
  ];
  rules.triggers.slice(0, 2).forEach((tr, i) => {
    entries.push({ ts: ts(6 - i), tag: "llm", bold: tr.replace(/_/g," "), rest: "" });
  });
  entries.push({ ts: ts(4), tag: "nut", bold: "", rest: "goal → nutrition stack" });
  entries.push({ ts: ts(3), tag: "nut", bold: "", rest: "vitamins · base stack" });
  entries.push({ ts: ts(2), tag: "rule", bold: "", rest: `rx_interest → ${routing}` });
  entries.push({ ts: ts(1), tag: "out", bold: "nodes T1 T2 N1 N2", rest: " · done" });
  return entries.slice(0, 9);
}

const TAG_STYLES = {
  rule: { background: "rgba(52,211,153,.12)", color: "#34d399" },
  llm:  { background: "rgba(192,132,252,.12)", color: "#c084fc" },
  nut:  { background: "rgba(251,191,36,.12)", color: "#fbbf24" },
  out:  { background: "rgba(0,212,255,.12)", color: "#00d4ff" },
};

function BottomSection({ rules, routing, onRegenerate, loading }: {
  rules: RulesSummary; routing: RoutingDecision; onRegenerate?: () => void; loading?: boolean;
}) {
  const entries = buildLog(rules, routing);
  const cmd = `retune --template=${rules.template.toLowerCase()} --routing=${routing}`;
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#0a0f1a,#06080f)" }}>
      <div style={{ padding: "10px 18px 6px" }}>
        <div style={{ fontSize: 9, letterSpacing: ".22em", color: "#c084fc", textTransform: "uppercase", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>▸ Engine reasoning · {entries.length} steps</span>
          <span style={{ color: "#475569" }}>rules · llm-weighted · nutrition-extended · safety floor enforced</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, fontSize: 9, lineHeight: 1.55 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.04)", borderRadius: 6, padding: "6px 8px" }}>
              <span style={{ color: "#475569", fontSize: 8, display: "block", marginBottom: 2 }}>{e.ts}</span>
              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, display: "inline-block", marginRight: 3, ...TAG_STYLES[e.tag] }}>{e.tag}</span>
              {e.bold && <b style={{ color: "#fff", fontWeight: 500 }}>{e.bold}</b>}
              {e.rest}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,.04)", display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, background: "#04060f" }}>
        <span style={{ color: "#00d4ff", fontWeight: 600 }}>aura ›</span>
        <span style={{ color: "#94a3b8" }}>{cmd}</span>
        <span style={{ display: "inline-block", width: 6, height: 12, background: "#00d4ff", verticalAlign: "middle", marginLeft: 1, animation: "aura-blink 1s infinite" }} />
        <span style={{ marginLeft: "auto", color: "#475569", fontSize: 9, letterSpacing: ".1em" }}>⌘K command bar · ? for help</span>
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={loading} style={{ marginLeft: 12, background: "rgba(0,212,255,.1)", border: "1px solid rgba(0,212,255,.25)", color: "#00d4ff", fontSize: 9, padding: "4px 12px", borderRadius: 6, cursor: "pointer", letterSpacing: ".1em", opacity: loading ? 0.5 : 1 }}>
            {loading ? "generating…" : "retune ↺"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tensions band ────────────────────────────────────────────────────────────

function TensionsBand({ tensions }: { tensions: Tension[] }) {
  if (tensions.length === 0) return null;
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: "linear-gradient(180deg,#0a0f1a,#06080f)", padding: "12px 18px" }}>
      <div style={{ fontSize: 9, letterSpacing: ".22em", color: "#fb7185", textTransform: "uppercase", marginBottom: 10 }}>
        ▸ Tensions Detected · {tensions.length} active
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tensions.map((t) => {
          const color = SEVERITY[t.severity] ?? "#fbbf24";
          const shown = t.drivers.slice(0, 3);
          const extra = t.drivers.length - shown.length;
          return (
            <div key={t.id} style={{ borderLeft: `2px solid ${color}`, paddingLeft: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", letterSpacing: ".02em" }}>{humanizeTensionId(t.id)}</span>
                <span style={{ fontSize: 8, letterSpacing: ".14em", textTransform: "uppercase", color, border: `1px solid ${color}`, borderRadius: 4, padding: "1px 6px" }}>{t.severity}</span>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5, marginBottom: 5 }}>{t.implication}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {shown.map((d) => (
                  <span key={d} style={{ fontSize: 8.5, color: "#cbd5e1", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 4, padding: "2px 6px", fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>{d}</span>
                ))}
                {extra > 0 && (
                  <span style={{ fontSize: 8.5, color: "#64748b", padding: "2px 4px" }}>+{extra}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RecommendationCard({
  id, output, rules, routing, telemetry, sessionId, protocolAgeDays, onRegenerate, loading, tensions = [],
}: RecommendationCardProps) {
  const sid = sessionId ?? "AUR-0000-0000";
  const source = "Wearable · Terra";
  const freshnessStale = protocolAgeDays !== null && protocolAgeDays !== undefined && protocolAgeDays > 7;

  return (
    <>
      <style>{`@keyframes aura-blink { 50% { opacity: 0; } }`}</style>
      <div style={{ background: "#04060f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden", maxWidth: 1240, margin: "0 auto", fontFamily: "'JetBrains Mono',ui-monospace,monospace", color: "#cbd5e1" }}>

        {/* Chrome bar */}
        <div style={{ background: "linear-gradient(180deg,#0d1117,#0a0f1a)", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 10.5, letterSpacing: ".05em" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,.8)", flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "#fff" }}>AURA.engine · session <b style={{ color: "#00d4ff", fontWeight: 500 }}>{sid}</b> · synced {new Date().toISOString().slice(11, 19)}Z</span>
          </div>
          <div style={{ color: "#64748b", display: "flex", gap: 18 }}>
            <span>SOURCE <b style={{ color: "#cbd5e1", fontWeight: 500 }}>{source}</b></span>
            <span>TEMPLATE <b style={{ color: "#cbd5e1", fontWeight: 500 }}>{rules.template}</b></span>
            {freshnessStale
              ? <span style={{ color: "#fbbf24" }}>STALE <b style={{ color: "#fbbf24", fontWeight: 500 }}>{protocolAgeDays}d</b></span>
              : <span>CACHE <b style={{ color: "#cbd5e1", fontWeight: 500 }}>hit</b></span>
            }
          </div>
        </div>

        {/* 3-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", minHeight: 580 }}>
          <TelemetryPanel t={telemetry} />
          <BiosignaturePanel steps={output.steps} sessionId={sid} />
          <RightPanel output={output} routing={routing} />
        </div>

        {/* Tensions band (hidden when none) */}
        <TensionsBand tensions={tensions} />

        {/* Bottom: reasoning log + cmd bar */}
        <BottomSection rules={rules} routing={routing} onRegenerate={onRegenerate} loading={loading} />

        {/* Feedback (below terminal chrome) */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,.04)", background: "#04060f" }}>
          <FeedbackWidget recommendationId={id} />
        </div>
      </div>
    </>
  );
}

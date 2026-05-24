import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { products } from "@/data/products";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

const categoryAccent: Record<string, string> = {
  Recovery: "#10b981",
  "Weight Management": "#f43f5e",
  "Growth & Performance": "#8b5cf6",
  Wellness: "#00d4ff",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  const syneBold = await readFile(
    join(process.cwd(), "public/fonts/Syne-Bold.ttf")
  );

  const accent = product ? (categoryAccent[product.category] ?? "#00d4ff") : "#00d4ff";
  const name = product?.name ?? "Research Peptide";
  const category = product?.category ?? "Research Compound";
  const vendor = product?.affiliate.vendor ?? "";
  const benefits = product?.benefits.slice(0, 3) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          background: "#04060f",
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 8,
            height: "100%",
            background: accent,
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}28 0%, transparent 65%)`,
          }}
        />

        {/* Outer layout */}
        <div
          style={{
            display: "flex",
            width: "100%",
            padding: "56px 72px 52px 88px",
          }}
        >
          {/* Left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            {/* Top: badges + name grouped */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {/* Category row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    background: `${accent}20`,
                    border: `1px solid ${accent}55`,
                    color: accent,
                    fontSize: 14,
                    fontFamily: "Syne",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "7px 18px",
                    borderRadius: 999,
                  }}
                >
                  {category}
                </div>
                {product?.badge ? (
                  <div
                    style={{
                      display: "flex",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#e2e8f0",
                      fontSize: 13,
                      fontFamily: "Syne",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "7px 16px",
                      borderRadius: 999,
                    }}
                  >
                    {product.badge}
                  </div>
                ) : null}
              </div>

              {/* Product name */}
              <div
                style={{
                  display: "flex",
                  fontFamily: "Syne",
                  fontSize: name.length > 20 ? 60 : name.length > 15 ? 72 : 96,
                  fontWeight: 800,
                  color: "#f1f5f9",
                  letterSpacing: "-0.04em",
                  lineHeight: 1.1,
                  maxWidth: 580,
                  flexWrap: "wrap",
                }}
              >
                {name}
              </div>
            </div>

            {/* Bottom bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ display: "flex", color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "Syne" }}>
                    A
                  </div>
                </div>
                <div style={{ display: "flex", fontFamily: "Syne", fontSize: 18, color: "#94a3b8" }}>
                  Aura Protocols
                </div>
              </div>
              {vendor ? (
                <div style={{ display: "flex", fontFamily: "Syne", fontSize: 16, color: accent, opacity: 0.8 }}>
                  {"via " + vendor}
                </div>
              ) : null}
            </div>
          </div>

          {/* Right column — benefits */}
          {benefits.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 14,
                marginLeft: 48,
                marginRight: 8,
                width: 260,
                flexShrink: 0,
              }}
            >
              {benefits.map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: accent,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: "flex", fontFamily: "Syne", fontSize: 16, color: "#cbd5e1" }}>
                    {b}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Syne", data: syneBold, style: "normal", weight: 700 }],
    }
  );
}

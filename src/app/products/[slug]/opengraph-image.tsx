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

  const accent = product
    ? (categoryAccent[product.category] ?? "#00d4ff")
    : "#00d4ff";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#04060f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -40,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 24 }}
        >
          <div
            style={{
              border: `1px solid ${accent}44`,
              background: `${accent}15`,
              color: accent,
              fontSize: 14,
              fontFamily: "Syne",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            {product?.category ?? "Research Compound"}
          </div>
          {product?.badge && (
            <div
              style={{
                marginLeft: 12,
                background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
                color: "#fff",
                fontSize: 12,
                fontFamily: "Syne",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              {product.badge}
            </div>
          )}
        </div>

        <div
          style={{
            fontFamily: "Syne",
            fontSize:
              product?.name && product.name.length > 20 ? 64 : 80,
            fontWeight: 800,
            color: "#e2e8f0",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: 20,
            flex: 1,
          }}
        >
          {product?.name ?? "Research Peptide"}
        </div>

        {product?.benefits[0] && (
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 22,
              color: "#64748b",
              marginBottom: 40,
            }}
          >
            {product.benefits[0]}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
                A
              </div>
            </div>
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 20,
                fontWeight: 700,
                color: "#e2e8f0",
              }}
            >
              Aura Protocols
            </div>
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 15,
              color: "#00d4ff",
              opacity: 0.7,
            }}
          >
            shop.auraprotocols.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Syne", data: syneBold, style: "normal", weight: 700 },
      ],
    }
  );
}

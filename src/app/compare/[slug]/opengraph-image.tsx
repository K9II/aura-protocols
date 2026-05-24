import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { comparisons } from "@/data/comparisons";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  const syneBold = await readFile(
    join(process.cwd(), "public/fonts/Syne-Bold.ttf")
  );

  const winnerName = comp
    ? comp.winner === "A"
      ? comp.vendorA
      : comp.winner === "B"
      ? comp.vendorB
      : null
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#04060f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            left: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)",
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
              border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(139,92,246,0.1)",
              color: "#8b5cf6",
              fontSize: 13,
              fontFamily: "Syne",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "6px 16px",
              borderRadius: 999,
            }}
          >
            Vendor Comparison
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: 60,
              color: "#e2e8f0",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              flex: 1,
            }}
          >
            {comp?.vendorA ?? "Vendor A"}
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontWeight: 900,
              fontSize: 36,
              color: "#8b5cf6",
              letterSpacing: "-0.02em",
              opacity: 0.8,
            }}
          >
            VS
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontWeight: 800,
              fontSize: 60,
              color: "#e2e8f0",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              flex: 1,
              textAlign: "right",
            }}
          >
            {comp?.vendorB ?? "Vendor B"}
          </div>
        </div>

        {winnerName && (
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 18,
              color: "#00d4ff",
              marginBottom: 28,
              display: "flex",
            }}
          >
            {`Winner: ${winnerName}`}
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

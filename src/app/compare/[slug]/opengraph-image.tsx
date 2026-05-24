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

  const winnerName =
    comp?.winner === "A"
      ? comp.vendorA
      : comp?.winner === "B"
      ? comp.vendorB
      : null;

  const loserName =
    comp?.winner === "A"
      ? comp.vendorB
      : comp?.winner === "B"
      ? comp.vendorA
      : null;

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
            background: "linear-gradient(180deg, #00d4ff, #8b5cf6)",
          }}
        />

        {/* Background glow left */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: 100,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 65%)",
          }}
        />

        {/* Background glow right */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: 0,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 72px 48px 88px",
            width: "100%",
          }}
        >
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.35)",
                color: "#8b5cf6",
                fontSize: 14,
                fontFamily: "Syne",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "7px 18px",
                borderRadius: 999,
              }}
            >
              Vendor Comparison
            </div>
          </div>

          {/* VS row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
          >
            {/* Vendor A */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontFamily: "Syne",
                  fontSize: comp?.vendorA && comp.vendorA.length > 14 ? 52 : 64,
                  fontWeight: 800,
                  color: comp?.winner === "A" ? "#f1f5f9" : "#475569",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.0,
                }}
              >
                {comp?.vendorA ?? "Vendor A"}
              </div>
              {comp?.winner === "A" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    borderRadius: 999,
                    padding: "5px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Syne",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#00d4ff",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    WINNER
                  </div>
                </div>
              ) : null}
            </div>

            {/* VS badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "rgba(139,92,246,0.15)",
                border: "2px solid rgba(139,92,246,0.3)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "Syne",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#8b5cf6",
                  letterSpacing: "-0.02em",
                }}
              >
                VS
              </div>
            </div>

            {/* Vendor B */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontFamily: "Syne",
                  fontSize: comp?.vendorB && comp.vendorB.length > 14 ? 52 : 64,
                  fontWeight: 800,
                  color: comp?.winner === "B" ? "#f1f5f9" : "#475569",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.0,
                  textAlign: "right",
                }}
              >
                {comp?.vendorB ?? "Vendor B"}
              </div>
              {comp?.winner === "B" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(0,212,255,0.12)",
                    border: "1px solid rgba(0,212,255,0.3)",
                    borderRadius: 999,
                    padding: "5px 20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Syne",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#00d4ff",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    WINNER
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Winner reason snippet */}
          {winnerName && comp?.winnerReason && (
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 18,
                color: "#475569",
                lineHeight: 1.4,
                maxWidth: 800,
                borderLeft: "3px solid rgba(0,212,255,0.4)",
                paddingLeft: 16,
              }}
            >
              {comp.winnerReason.length > 100
                ? comp.winnerReason.slice(0, 97) + "..."
                : comp.winnerReason}
            </div>
          )}

          {/* Brand footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "Syne" }}>A</div>
              </div>
              <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 700, color: "#94a3b8" }}>
                Aura Protocols
              </div>
            </div>
            <div style={{ fontFamily: "Syne", fontSize: 16, color: "#00d4ff", opacity: 0.7 }}>
              shop.auraprotocols.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Syne", data: syneBold, style: "normal", weight: 700 }],
    }
  );
}

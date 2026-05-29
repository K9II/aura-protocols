import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Aura Protocols — Expert Peptide Research & Reviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const syneBold = await readFile(
    join(process.cwd(), "public/fonts/Syne-Bold.ttf")
  );

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

        {/* Top-right glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 65%)",
          }}
        />

        {/* Bottom-left glow */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: 60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 80px 56px 88px",
            width: "100%",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#00d4ff",
              }}
            />
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 18,
                fontWeight: 700,
                color: "#00d4ff",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Research Peptide Reviews
            </div>
          </div>

          {/* Main headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 24,
            }}
          >
            <span
              style={{
                fontFamily: "Syne",
                fontSize: 88,
                fontWeight: 800,
                color: "#f1f5f9",
                letterSpacing: "-0.04em",
                lineHeight: 1.0,
              }}
            >
              Aura
            </span>
            <span
              style={{
                fontFamily: "Syne",
                fontSize: 88,
                fontWeight: 800,
                color: "#00d4ff",
                letterSpacing: "-0.04em",
                lineHeight: 1.0,
              }}
            >
              Protocols
            </span>
          </div>

          {/* Tagline + brand footer */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 24,
                color: "#64748b",
                lineHeight: 1.4,
                maxWidth: 560,
              }}
            >
              Expert-curated vendor reviews, COA analysis,
              and compound guides you can trust.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, fontFamily: "Syne" }}>
                  A
                </div>
              </div>
              <div
                style={{
                  fontFamily: "Syne",
                  fontSize: 18,
                  color: "#94a3b8",
                  letterSpacing: "0.02em",
                }}
              >
                shop.auraprotocols.com
              </div>
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

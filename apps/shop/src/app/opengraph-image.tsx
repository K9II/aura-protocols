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
          background: "#EDE9E0",
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
            background: "#A32B1F",
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
                background: "#A32B1F",
              }}
            />
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 18,
                fontWeight: 700,
                color: "#4A4438",
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
                color: "#1C1A15",
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
                color: "#A32B1F",
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
                color: "#4A4438",
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
                  width: 48,
                  height: 48,
                  background: "#1C1A15",
                  borderRadius: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="30"
                  height="28"
                  viewBox="0 0 160 150"
                  fill="none"
                  stroke="#ffffff"
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                  strokeMiterlimit={9}
                >
                  <g transform="translate(6,4) skewX(-7)">
                    <g strokeWidth={7}>
                      <path d="M30,128 L63,23" />
                      <path d="M77,23 L124,128" />
                    </g>
                    <path stroke="#A32B1F" strokeWidth={4} d="M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86" />
                  </g>
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "Syne",
                  fontSize: 18,
                  color: "#4A4438",
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

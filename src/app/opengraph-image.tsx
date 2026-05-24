import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Aura Protocols — Premium Peptide Research";
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -100,
            right: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #00d4ff, #8b5cf6)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "#fff", fontSize: 24, fontWeight: 800 }}>
              A
            </div>
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 40,
              fontWeight: 800,
              color: "#e2e8f0",
              letterSpacing: "-0.02em",
            }}
          >
            Aura Protocols
          </div>
        </div>

        <div
          style={{
            fontFamily: "Syne",
            fontSize: 22,
            color: "#64748b",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Premium Peptide Research
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 48,
            fontFamily: "Syne",
            fontSize: 16,
            color: "#00d4ff",
            opacity: 0.7,
          }}
        >
          shop.auraprotocols.com
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

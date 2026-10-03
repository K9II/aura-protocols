import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Aura Protocols — Separated. Measured. Published. Research peptides with a published certificate for every lot.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#EDE9E0", INK = "#1C1A15", INK_SOFT = "#4A4438", SPECIMEN = "#A32B1F", LINE = "#C9C2AE";

export default async function Image() {
  const font = (f: string) => readFile(join(process.cwd(), "public/fonts", f));
  const [serif, serifItalic, mono] = await Promise.all([
    font("Newsreader-Regular.woff"),
    font("Newsreader-Italic.woff"),
    font("JetBrainsMono-Medium.woff"),
  ]);
  const micro = { fontFamily: "JetBrains Mono", fontSize: 17, letterSpacing: 3, color: INK_SOFT } as const;

  return new ImageResponse(
    (
      <div style={{ background: PAPER, width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 76px 54px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            <svg width="62" height="58" viewBox="0 0 160 150" fill="none" strokeLinecap="round">
              <g transform="translate(6,4) skewX(-7)">
                <path stroke={INK} strokeWidth={8} d="M30,128 L63,23" />
                <path stroke={INK} strokeWidth={8} d="M77,23 L124,128" />
                <path stroke={SPECIMEN} strokeWidth={5.5} d="M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86" />
              </g>
            </svg>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: -16 }}>
              <div style={{ fontFamily: "Newsreader", fontSize: 50, color: SPECIMEN, lineHeight: 1 }}>ura</div>
              <div style={{ fontFamily: "Newsreader", fontSize: 17, color: INK_SOFT, marginLeft: 14 }}>Protocols</div>
            </div>
          </div>
          <div style={{ ...micro, color: SPECIMEN }}>RESEARCH PEPTIDES · CERTIFIED COA</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Newsreader", fontSize: 104, color: INK, lineHeight: 1.02, letterSpacing: -2 }}>Separated. Measured.</div>
          <div style={{ fontFamily: "Newsreader Italic", fontSize: 104, color: SPECIMEN, lineHeight: 1.02, letterSpacing: -2 }}>Published.</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${LINE}`, paddingTop: 22, gap: 32 }}>
          <div style={{ ...micro, fontSize: 15, letterSpacing: 2.4 }}>INDEPENDENT THIRD-PARTY US LAB · COA PER LOT · RESEARCH USE ONLY</div>
          <div style={{ fontFamily: "Newsreader", fontSize: 24, color: INK }}>auraprotocols.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: serif, weight: 400, style: "normal" },
        { name: "Newsreader Italic", data: serifItalic, weight: 400, style: "italic" },
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}

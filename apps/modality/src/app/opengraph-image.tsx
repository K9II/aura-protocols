import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Social share card (Open Graph + Twitter) shown when a modalitybio.com
// link is pasted into iMessage, Slack, X, Facebook, LinkedIn, or run in ads.
// Rendered via next/og — no external raster tooling. Brand serif (Newsreader)
// is vendored under assets/ and loaded into Satori so the type is on-brand.

export const alt =
  "Modality — your biology, translated into a biometric-driven protocol.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Trident mark as a data-URI SVG (Satori rasterizes <img> data URIs reliably).
const tridentImg = (stroke: string, w: number, h: number) =>
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      w +
      '" height="' +
      h +
      '" viewBox="0 0 40 52"><g fill="none" stroke="' +
      stroke +
      '" stroke-linecap="round">' +
      '<path d="M 10 8 Q 12 18 10 32" stroke-width="2.4"/>' +
      '<path d="M 20 5 L 20 48" stroke-width="3"/>' +
      '<path d="M 30 8 Q 28 18 30 32" stroke-width="2.4"/>' +
      "</g></svg>",
  ).toString("base64");

export default async function Image() {
  // Static 600 instances (Satori cannot read the variable Newsreader TTF).
  const [regular, italic] = await Promise.all([
    readFile(join(process.cwd(), "assets/Newsreader-600.ttf")),
    readFile(join(process.cwd(), "assets/Newsreader-Italic-600.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ECEDE7",
          fontFamily: "Newsreader",
          padding: "64px 72px",
          position: "relative",
        }}
      >
        {/* large trident bleeding off the right edge */}
        <img
          src={tridentImg("#D5D6CC", 460, 598)}
          width={460}
          height={598}
          alt=""
          style={{ position: "absolute", right: -70, top: 16 }}
        />

        {/* wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tridentImg("#211E1B", 30, 39)} width={30} height={39} alt="" />
          <div style={{ fontSize: 34, fontWeight: 600, display: "flex" }}>
            <span style={{ color: "#000000" }}>M</span>
            <span style={{ color: "#7A2E2E" }}>odality</span>
          </div>
        </div>

        {/* headline — each word is its own span so Satori wraps them cleanly
            (mixed raw-text + span children in a flex row overlap). */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            maxWidth: 900,
            fontSize: 68,
            fontWeight: 600,
            lineHeight: 1.05,
            color: "#211E1B",
            letterSpacing: "-0.5px",
            gap: "6px 18px",
          }}
        >
          <span>Your</span>
          <span style={{ color: "#7A2E2E", fontStyle: "italic" }}>biology,</span>
          <span>translated</span>
          <span>into</span>
          <span>a</span>
          <span>biometric-driven</span>
          <span>protocol.</span>
        </div>

        {/* footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: "3px",
              color: "#7A2E2E",
              textTransform: "uppercase",
            }}
          >
            Signal to script
          </div>
          <div style={{ fontSize: 24, color: "#615B54" }}>modalitybio.com</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Newsreader", data: regular, weight: 600, style: "normal" },
        { name: "Newsreader", data: italic, weight: 600, style: "italic" },
      ],
    },
  );
}

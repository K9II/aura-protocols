import { ImageResponse } from "next/og";

// iOS home-screen icon (Safari "Add to Home Screen") and iOS bookmarks.
// iOS ignores SVG favicons, so we render a 180x180 PNG here via next/og
// (no external raster tooling needed). Full-bleed bone plate with no own
// rounding — iOS masks the tile into its own squircle. Matches the
// browser-tab favicon: bone plate (#ECEDE7) + ink trident (#211E1B).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The trident drawn as a standalone SVG, embedded as a data URI. Satori
// (next/og's renderer) rasterizes <img> data URIs reliably, which sidesteps
// its partial support for inline SVG <path> elements.
const trident =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="144" viewBox="0 0 40 48">' +
  '<g fill="none" stroke="#211E1B" stroke-linecap="round">' +
  '<path d="M 10 8 Q 12 18 10 32" stroke-width="2.4"/>' +
  '<path d="M 20 5 L 20 44" stroke-width="3"/>' +
  '<path d="M 30 8 Q 28 18 30 32" stroke-width="2.4"/>' +
  "</g></svg>";

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(trident).toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ECEDE7",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={120} height={144} alt="" />
      </div>
    ),
    { ...size },
  );
}

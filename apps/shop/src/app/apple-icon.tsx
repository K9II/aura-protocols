import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS home-screen icon: the Aura mark (A + pulse) in white on the brand dark.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1117",
        }}
      >
        <svg
          width="120"
          height="112"
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
    ),
    { ...size }
  );
}

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
            <g strokeWidth={15}>
              <path d="M30,128 L70,20" />
              <path d="M70,20 L110,128" />
            </g>
            <path strokeWidth={8} d="M36,108 L48,86 L60,86 L66,68 L72,108 L78,86 L98,86 L112,72" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}

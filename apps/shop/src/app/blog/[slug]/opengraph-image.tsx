import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { posts } from "@/data/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

const categoryAccent: Record<string, string> = {
  Recovery: "#10b981",
  "Weight Management": "#f43f5e",
  "Growth & Performance": "#8b5cf6",
  Wellness: "#00d4ff",
  "Buyer's Guide": "#f59e0b",
};

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  const syneBold = await readFile(
    join(process.cwd(), "public/fonts/Syne-Bold.ttf")
  );

  const accent = post ? (categoryAccent[post.category] ?? "#00d4ff") : "#00d4ff";
  const title = post?.title ?? "Research Article";
  const lines = title.length > 42 ? [title.slice(0, 42).trimEnd(), title.slice(42).trimStart()] : [title];

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
            background: accent,
          }}
        />

        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}1a 0%, transparent 65%)`,
          }}
        />

        {/* Horizontal rule decorative line */}
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: 88,
            right: 72,
            height: 1,
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 72px 52px 88px",
            width: "100%",
          }}
        >
          {/* Category + read time */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                background: `${accent}20`,
                border: `1px solid ${accent}55`,
                color: accent,
                fontSize: 14,
                fontFamily: "Syne",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "7px 18px",
                borderRadius: 999,
              }}
            >
              {post?.category ?? "Research"}
            </div>
            {post?.readTime && (
              <div style={{ fontFamily: "Syne", fontSize: 16, color: "#475569" }}>
                {post.readTime}
              </div>
            )}
          </div>

          {/* Title — large, dominant */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "Syne",
                  fontSize: 72,
                  fontWeight: 800,
                  color: i === 0 ? "#f1f5f9" : "#94a3b8",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                }}
              >
                {line}
              </div>
            ))}
          </div>

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
            <div style={{ fontFamily: "Syne", fontSize: 16, color: accent, opacity: 0.8 }}>
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

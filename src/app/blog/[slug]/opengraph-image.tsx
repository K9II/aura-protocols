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

  const accent = post
    ? (categoryAccent[post.category] ?? "#00d4ff")
    : "#00d4ff";
  const title = post?.title ?? "Research Article";
  const displayTitle =
    title.length > 55 ? title.slice(0, 52) + "..." : title;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#04060f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 72px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}1a 0%, transparent 70%)`,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: `${accent}15`,
              border: `1px solid ${accent}44`,
              color: accent,
              fontSize: 13,
              fontFamily: "Syne",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "6px 14px",
              borderRadius: 999,
            }}
          >
            {post?.category ?? "Research"}
          </div>
          <div
            style={{ fontFamily: "Syne", fontSize: 14, color: "#64748b" }}
          >
            {post?.readTime ?? ""}
          </div>
        </div>

        <div
          style={{
            fontFamily: "Syne",
            fontSize: displayTitle.length > 40 ? 52 : 64,
            fontWeight: 800,
            color: "#e2e8f0",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            flex: 1,
            maxWidth: 900,
          }}
        >
          {displayTitle}
        </div>

        {post?.excerpt && (
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 19,
              color: "#475569",
              marginBottom: 36,
              maxWidth: 800,
              lineHeight: 1.5,
            }}
          >
            {post.excerpt.length > 100
              ? post.excerpt.slice(0, 97) + "..."
              : post.excerpt}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 24,
          }}
        >
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
              <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
                A
              </div>
            </div>
            <div
              style={{
                fontFamily: "Syne",
                fontSize: 20,
                fontWeight: 700,
                color: "#e2e8f0",
              }}
            >
              Aura Protocols
            </div>
          </div>
          <div
            style={{
              fontFamily: "Syne",
              fontSize: 15,
              color: "#00d4ff",
              opacity: 0.7,
            }}
          >
            shop.auraprotocols.com
          </div>
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

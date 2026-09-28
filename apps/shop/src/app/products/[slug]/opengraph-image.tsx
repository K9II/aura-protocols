import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { compounds } from "@/data/catalog";
import { findCompound } from "@/lib/catalog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return compounds.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = findCompound(slug);
  const font = await readFile(join(process.cwd(), "public/fonts/Syne-Bold.ttf"));
  const name = c?.name ?? "Research Compound";
  const meta = [c?.chemicalClass, c?.identity.cas ? `CAS ${c.identity.cas}` : null].filter(Boolean).join("  ·  ");

  return new ImageResponse(
    (
      <div style={{ background: "#EDE9E0", width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, borderLeft: "10px solid #A32B1F" }}>
        <div style={{ display: "flex", fontSize: 28, color: "#A32B1F", fontFamily: "Syne" }}>Aura Protocols</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: name.length > 18 ? 76 : 110, color: "#1C1A15", fontFamily: "Syne", lineHeight: 1 }}>{name}</div>
          <div style={{ fontSize: 30, color: "#4A4438", marginTop: 24 }}>{meta}</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#4A4438", letterSpacing: 3 }}>LOT-TESTED · COA ON EVERY LOT · RESEARCH USE ONLY</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Syne", data: font, weight: 700, style: "normal" }] },
  );
}

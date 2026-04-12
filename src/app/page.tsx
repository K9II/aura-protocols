import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming Soon | Aura Protocols",
  description: "Aura Protocols is launching soon. Expert-curated research peptides from the most trusted suppliers.",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Glow orbs */}
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: "30%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        <p
          className="font-display text-sm font-semibold tracking-widest uppercase mb-6"
          style={{ color: "var(--cyan)" }}
        >
          Coming Soon
        </p>

        <h1
          className="font-display text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight"
        >
          Something{" "}
          <span className="gradient-brand">powerful</span>{" "}
          is on its way.
        </h1>

        <p className="text-lg leading-relaxed mb-10" style={{ color: "var(--muted)" }}>
          Aura Protocols is putting the finishing touches on a fully curated
          peptide research hub — vetted vendors, in-depth guides, and
          transparent reviews. Check back soon.
        </p>

        <div
          className="glass inline-flex items-center gap-3 px-6 py-4 text-sm"
          style={{ color: "var(--muted)" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "var(--cyan)" }}
          />
          Currently in development
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function ValidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#04060f]">
      <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-xs text-yellow-200">
        Research preview — Aura Clinical is not yet accepting patients.
      </div>
      {children}
    </div>
  );
}

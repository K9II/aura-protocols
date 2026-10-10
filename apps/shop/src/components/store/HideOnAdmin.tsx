"use client";
// The command center (/admin) has its own shell; storefront chrome stays out of it.
import { usePathname } from "next/navigation";

export default function HideOnAdmin({ children }: { children: React.ReactNode }) {
  return usePathname()?.startsWith("/admin") ? null : <>{children}</>;
}

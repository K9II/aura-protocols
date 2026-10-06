"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function SendingRefresh() {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), 15_000); return () => clearInterval(t); }, [router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { newSince, newsLine, type RecordLot } from "@/lib/lot-record";
import { setLotNews, visitBaseline } from "@/lib/lot-news";

// Home: lots released since the visitor's last visit are announced in the top bar. This
// came with the home lot chart; the chart left the home page (2026-10-17), the notice stays.
export default function LotNews({ lots }: { lots: RecordLot[] }) {
  useEffect(() => {
    const baseline = visitBaseline(new Date().toISOString());
    setLotNews(newsLine(lots, newSince(lots, baseline)));
    return () => setLotNews(null);
  }, [lots]);
  return null;
}

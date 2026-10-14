"use client";

import { useSyncExternalStore } from "react";

// This page's query string, read in the browser (no useSearchParams: that
// needs a Suspense boundary, and would client-render the tree up to it).
// Re-read on every render; the server render has none.
const noSubscribe = () => () => {};
export function useSearch(): string {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
}

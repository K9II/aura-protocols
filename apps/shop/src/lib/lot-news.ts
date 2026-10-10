// "New since your last visit": the home lot record works out what's new and the top
// bar (SiteNav, in the layout) shows it. A tiny external store, so the two don't need
// a shared parent. Browser-only; the server snapshot is always null.
import { useSyncExternalStore } from "react";

let news: string | null = null;
const listeners = new Set<() => void>();

export function setLotNews(line: string | null) {
  if (line === news) return;
  news = line;
  listeners.forEach((l) => l());
}

export function useLotNews(): string | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => news,
    () => null,
  );
}

// The visitor's previous visit. The baseline is held for the whole browser session,
// so moving around the site (or reloading) keeps showing the same "new" lots; the
// stored last visit moves to now for the next session. Storage can be missing or
// blocked (private mode): then every visit counts as a first visit.
const LAST_KEY = "aura_last_visit";
const SESSION_KEY = "aura_visit_baseline";

export function visitBaseline(nowIso: string): string | null {
  try {
    const held = window.sessionStorage.getItem(SESSION_KEY);
    if (held !== null) return held === "" ? null : held;
    const last = window.localStorage.getItem(LAST_KEY);
    window.sessionStorage.setItem(SESSION_KEY, last ?? "");
    window.localStorage.setItem(LAST_KEY, nowIso);
    return last;
  } catch {
    return null;
  }
}

import { useSyncExternalStore } from "react";

// The strength chosen in the product page's size picker, shared with the turning vial and the
// placard's scan code so all three show the same strength, lot and QR. One product page at a
// time: the picker clears its choice when it unmounts, so every visit starts on the first size.
const chosen = new Map<string, string>();
const listeners = new Set<() => void>();

export function chooseStrength(slug: string, variantId: string) {
  chosen.set(slug, variantId);
  listeners.forEach((fn) => fn());
}

export function forgetStrength(slug: string) {
  if (chosen.delete(slug)) listeners.forEach((fn) => fn());
}

export function useChosenStrength(slug: string, fallback: string): string {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => chosen.get(slug) ?? fallback,
    () => fallback,
  );
}

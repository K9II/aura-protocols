"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { compounds } from "@/data/catalog";
import { addLine, cartTotals, removeLine, setQuantity, type CartLine } from "@/lib/cart";

export const CART_STORAGE_KEY = "aura_cart_v1";
// Discount code entered in the cart; checkout checks and applies it.
export const CART_CODE_KEY = "aura_cart_code_v1";

type CartContextValue = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  setQty: (index: number, quantity: number) => void;
  clear: () => void;
  code: string;
  setCode: (code: string) => void;
  ready: boolean; // false until the saved cart has been read from storage
  totals: ReturnType<typeof cartTotals>;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// Drops lines for products, sizes or pack sizes the catalog no longer offers
// (e.g. single vials and 3-packs, retired 2026-10-01).
function isKnown(line: CartLine): boolean {
  const c = compounds.find((x) => x.slug === line.slug);
  return !!c && c.variants.some((v) => v.id === line.variantId) && c.packDiscounts.some((p) => p.qty === line.packQty);
}

function readStored(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]).filter(isKnown) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCodeState] = useState("");

  useEffect(() => {
    // One-time localStorage hydration after mount — must not run during SSR
    // or the first client render, so the initial render stays an empty cart
    // and there is no hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setLines(readStored());
    try { setCodeState(window.localStorage.getItem(CART_CODE_KEY) ?? ""); } catch { /* storage unavailable */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage unavailable (private mode) — cart still works for this visit
    }
  }, [lines, loaded]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => addLine(prev, line));
    setOpen(true);
  }, []);
  const remove = useCallback((i: number) => setLines((prev) => removeLine(prev, i)), []);
  const setQty = useCallback((i: number, q: number) => setLines((prev) => setQuantity(prev, i, q)), []);
  const setCode = useCallback((next: string) => {
    const v = next.trim().toUpperCase();
    try {
      if (v) window.localStorage.setItem(CART_CODE_KEY, v);
      else window.localStorage.removeItem(CART_CODE_KEY);
    } catch {
      // storage unavailable — the code still applies for this visit
    }
    setCodeState(v);
  }, []);
  const clear = useCallback(() => {
    // Also empty storage now: a child calling clear() on mount (ClearCart)
    // runs before this provider's hydration effect, which would otherwise
    // read the old cart straight back.
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, "[]");
      window.localStorage.removeItem(CART_CODE_KEY);
    } catch {
      // storage unavailable — state clear below still applies
    }
    setLines([]);
    setCodeState("");
  }, []);

  const value = useMemo(
    () => ({ lines, add, remove, setQty, clear, code, setCode, ready: loaded, totals: cartTotals(lines), open, setOpen }),
    [lines, add, remove, setQty, clear, code, setCode, loaded, open],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

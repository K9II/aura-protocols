"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { compounds } from "@/data/catalog";
import { addLine, cartTotals, removeLine, setQuantity, type CartLine } from "@/lib/cart";

export const CART_STORAGE_KEY = "aura_cart_v1";

type CartContextValue = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  setQty: (index: number, quantity: number) => void;
  clear: () => void;
  totals: ReturnType<typeof cartTotals>;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isKnown(line: CartLine): boolean {
  const c = compounds.find((x) => x.slug === line.slug);
  return !!c && c.variants.some((v) => v.id === line.variantId);
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

  useEffect(() => {
    // One-time localStorage hydration after mount — must not run during SSR
    // or the first client render, so the initial render stays an empty cart
    // and there is no hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    setLines(readStored());
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
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, add, remove, setQty, clear, totals: cartTotals(lines), open, setOpen }),
    [lines, add, remove, setQty, clear, open],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

"use client";
import { useEffect } from "react";
import { useCart } from "@/components/store/CartProvider";

// Empties the cart once an order is confirmed (not before — an abandoned
// Stripe page must leave the cart intact).
export default function ClearCart() {
  const { clear } = useCart();
  useEffect(() => { clear(); }, [clear]);
  return null;
}

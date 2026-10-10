"use client";

import Link from "next/link";
import { useCart } from "@/components/store/CartProvider";

// Cart page: back to the product most recently added (the last cart line),
// or to the catalog when the cart is empty.
export default function CartBackLink() {
  const { catalog, lines, ready } = useCart();
  if (!ready) return <span className="inline-block mb-6 text-sm" aria-hidden>&nbsp;</span>; // no flash of the wrong link
  const last = lines.length ? catalog.find((c) => c.slug === lines[lines.length - 1].slug) : undefined;
  return last
    ? <Link href={`/products/${last.slug}`} className="p-link text-sm inline-block mb-6">← Back to {last.name}</Link>
    : <Link href="/products" className="p-link text-sm inline-block mb-6">← Back to shop</Link>;
}

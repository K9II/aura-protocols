import type { Metadata } from "next";
import CartView from "@/components/store/CartView";
import CartBackLink from "@/components/store/CartBackLink";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16 max-w-2xl">
        <CartBackLink />
        <h1 className="s-h1 mb-8">Your <em>cart</em></h1>
        <CartView />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/dal";
import { getOrderByNumber } from "@/lib/orders";
import { orderItemLots, fetchAdminOps } from "@/lib/catalog-ops/data";

export const metadata = { title: "Pick list", robots: { index: false } };

// One sheet per order for whoever packs it (us now, the 3PL later): every line
// with its 3PL SKU and exactly which lots to pick. Print with Ctrl+P.
export default async function PickList({ params }: { params: Promise<{ number: string }> }) {
  await requireOwner();
  const { number } = await params;
  const order = await getOrderByNumber(number);
  if (!order) notFound();
  const items = order.order_items ?? [];
  const [lots, ops] = await Promise.all([orderItemLots(items.map((i) => i.id)), fetchAdminOps()]);
  const sku = (slug: string, v: string) => ops.variants.find((x) => x.slug === slug && x.variant_id === v)?.threepl_sku ?? "—";
  return (
    <div className="a-page">
      <div className="a-ph"><div><h1>Pick list · {order.order_number}</h1><p>{order.ship_name} · {order.ship_city}, {order.ship_state} · {items.reduce((s, i) => s + i.pack_qty * i.quantity, 0)} vials</p></div></div>
      <table className="a-t a-pick-t">
        <thead><tr><th>Item</th><th>SKU</th><th className="num">Vials</th><th>Pick from</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="a-prod"><b>{i.compound_name} · {i.strength}</b><small>Pack of {i.pack_qty} × {i.quantity}</small></td>
              <td className="a-mono">{sku(i.compound_slug, i.variant_id)}</td>
              <td className="num a-mono">{i.pack_qty * i.quantity}</td>
              <td><div className="a-pickbox">{(lots.get(i.id)?.allocated ?? []).map((l) => (
                <div key={l.lotNumber}><span className="q">{l.qty}</span>{l.lotNumber}</div>
              ))}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

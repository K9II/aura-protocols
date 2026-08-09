import { MEMBER_API_BASE } from "./config";

export type Order = { orderId: string; createdDate?: string; subAccount?: string; product?: string; amount: number; commission: number; status: string };

async function get<T>(path: string, token: string, fetchImpl: typeof fetch): Promise<T[]> {
  const res = await fetchImpl(`${MEMBER_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`member API ${path} failed: ${res.status}`);
  const body = (await res.json()) as { data?: T[] };
  return Array.isArray(body.data) ? body.data : [];
}

export function listOrders(token: string, fetchImpl: typeof fetch = fetch): Promise<Order[]> {
  return get<Order>("/orders", token, fetchImpl);
}

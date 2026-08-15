import { describe, it, expect, vi } from "vitest";
import { listOrders } from "@/lib/telehealth/memberApi";

describe("listOrders", () => {
  it("sends the Bearer token and unwraps the data envelope", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer lrx_live_x");
      return new Response(JSON.stringify({ data: [{ orderId: "o1", amount: 349, commission: 75, status: "shipped" }] }), { status: 200 });
    });
    const orders = await listOrders("lrx_live_x", fetchImpl as unknown as typeof fetch);
    expect(orders).toHaveLength(1);
    expect(orders[0].orderId).toBe("o1");
  });

  it("throws on a 401", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    await expect(listOrders("bad", fetchImpl as unknown as typeof fetch)).rejects.toThrow();
  });
});

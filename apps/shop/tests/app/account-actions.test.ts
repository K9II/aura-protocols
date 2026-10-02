import { describe, it, expect, vi, beforeEach } from "vitest";

const requireCustomer = vi.fn();
const saveShipAddress = vi.fn();
vi.mock("@/lib/dal", () => ({ requireCustomer }));
vi.mock("@/lib/orders", () => ({ saveShipAddress }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }

describe("updateAddressAction", () => {
  beforeEach(() => { vi.resetModules(); requireCustomer.mockReset(); saveShipAddress.mockReset(); requireCustomer.mockResolvedValue({ id: "u1" }); });

  it("validates and saves the address for the signed-in customer only", async () => {
    const { updateAddressAction } = await import("@/app/account/actions");
    expect((await updateAddressAction(undefined, fd({ name: "J", line1: "1 A St", line2: "", city: "Austin", state: "tx", zip: "78701" })))?.ok).toBe(true);
    expect(saveShipAddress).toHaveBeenCalledWith("u1", expect.objectContaining({ state: "TX" }));
    expect((await updateAddressAction(undefined, fd({ name: "J", line1: "1", line2: "", city: "A", state: "ZZ", zip: "1" })))?.error).toBeTruthy();
  });
});

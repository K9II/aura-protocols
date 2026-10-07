import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(), resolveAlert: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/today/alerts", () => ({ resolveAlert: m.resolveAlert }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T15:42:00Z") }));

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.append(k, v); return f; };
const A = "0b6f1c2e-1111-4222-8333-944455556666";

describe("admin Today actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.requireOwner.mockResolvedValue({ id: "owner1" });
  });

  it("Done is owner-only", async () => {
    m.requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const a = await import("@/app/admin/actions");
    await expect(a.resolveAlertAction(null, fd({ id: A }))).rejects.toThrow("NOT_FOUND");
    expect(m.resolveAlert).not.toHaveBeenCalled();
  });

  it("Done marks the alert with who and the trimmed note, and refreshes Today and Past alerts", async () => {
    m.resolveAlert.mockResolvedValue(true);
    const { resolveAlertAction } = await import("@/app/admin/actions");
    expect(await resolveAlertAction(null, fd({ id: A, note: "  moved the vials  " }))).toEqual({ ok: true });
    expect(m.resolveAlert).toHaveBeenCalledWith(A, "owner1", "moved the vials");
    expect(m.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(m.revalidatePath).toHaveBeenCalledWith("/admin/alerts");
  });

  it("an empty note is stored as none; an alert already done is an error, not a silent success", async () => {
    m.resolveAlert.mockResolvedValue(false);
    const { resolveAlertAction } = await import("@/app/admin/actions");
    expect(await resolveAlertAction(null, fd({ id: A, note: "   " }))).toEqual({ error: "That alert was already marked done — reload the page." });
    expect(m.resolveAlert).toHaveBeenCalledWith(A, "owner1", null);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("a bad alert id is an error", async () => {
    const { resolveAlertAction } = await import("@/app/admin/actions");
    expect(await resolveAlertAction(null, fd({ id: "nope" }))).toEqual({ error: "That alert couldn't be found — reload the page." });
    expect(m.resolveAlert).not.toHaveBeenCalled();
  });
});

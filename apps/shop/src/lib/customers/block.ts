import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getCommerceAdapter } from "@/lib/commerce";
import { closeOpenCheckouts } from "@/lib/checkout-close";
import { logCustomerEvent, setBlockedFields } from "@/lib/customers/data";
import { alertOwner } from "@/lib/notify";

const BAN_FOREVER = "876000h"; // ~100 years; Supabase refuses sign-in and token refresh

// Full lockout (spec 2026-10-04-admin-customers-design.md). Each step is safe to
// repeat, so re-running Block after a failure finishes the job. The flag goes
// first: from that moment lib/dal.ts treats the account as signed out.
export async function blockCustomer(customerId: string, reason: string, actorId: string): Promise<{ closed: string[] }> {
  const step = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
    try { return await run(); } catch (err) {
      await alertOwner("Block didn't finish", `Blocking customer ${customerId} stopped at the ${name} step: ${String(err)}. Open the customer and choose Block again to finish.`);
      throw err;
    }
  };
  await step("block flag", () => setBlockedFields(customerId, { at: new Date().toISOString(), reason }));
  await step("sign-in lock", async () => {
    const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(customerId, { ban_duration: BAN_FOREVER });
    if (error) throw new Error(`ban failed: ${JSON.stringify(error)}`);
  });
  const { closed } = await step("open checkouts", async () => {
    const r = await closeOpenCheckouts(customerId, getCommerceAdapter(), { all: true });
    if (r.failed.length) throw new Error(`couldn't close ${r.failed.map((f) => `${f.orderNumber} (${f.error})`).join(", ")}`);
    return r;
  });
  const note = closed.length ? `${closed.length} open checkout${closed.length === 1 ? "" : "s"} cancelled (${closed.join(", ")})` : null;
  await step("activity log", () => logCustomerEvent({ customerId, kind: "blocked", reason, note, actorId }));
  return { closed };
}

// Lifts the lock only; cancelled checkouts stay cancelled.
export async function unblockCustomer(customerId: string, actorId: string): Promise<void> {
  const { error } = await getSupabaseAdminClient().auth.admin.updateUserById(customerId, { ban_duration: "none" });
  if (error) throw new Error(`unban failed: ${JSON.stringify(error)}`);
  await setBlockedFields(customerId, null);
  await logCustomerEvent({ customerId, kind: "unblocked", actorId });
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getOrderById, transitionOrder } from "@/lib/orders";
import { CARRIERS, shippedEmail } from "@/lib/emails";
import { sendOrAlert } from "@/lib/notify";

const schema = z.object({
  orderId: z.string().uuid(),
  tracking: z.string().transform((s) => s.replace(/\s+/g, "").toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{8,40}$/)),
  carrier: z.enum(CARRIERS),
});

export async function markShippedAction(form: FormData): Promise<void> {
  await requireOwner();
  const parsed = schema.safeParse({ orderId: form.get("orderId"), tracking: form.get("tracking"), carrier: form.get("carrier") });
  if (!parsed.success) return;
  const { orderId, tracking, carrier } = parsed.data;
  const order = await getOrderById(orderId);
  if (!order || order.status !== "paid") return;
  if (await transitionOrder(orderId, "paid", "shipped", { tracking_number: tracking, carrier })) {
    const shipped = (await getOrderById(orderId)) ?? { ...order, tracking_number: tracking, carrier };
    await sendOrAlert({ to: shipped.email, ...shippedEmail(shipped) }, `shipped ${shipped.order_number}`);
  }
  revalidatePath("/admin/orders");
}

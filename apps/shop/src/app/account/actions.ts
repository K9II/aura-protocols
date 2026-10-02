"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/dal";
import { saveShipAddress } from "@/lib/orders";
import { shipAddressSchema } from "@/lib/ship-address";

export type AddressFormState = { ok?: boolean; error?: string } | undefined;

export async function updateAddressAction(_prev: AddressFormState, form: FormData): Promise<AddressFormState> {
  const customer = await requireCustomer("/account");
  const parsed = shipAddressSchema.safeParse({
    name: form.get("name"), line1: form.get("line1"), line2: form.get("line2"),
    city: form.get("city"), state: form.get("state"), zip: form.get("zip"),
  });
  if (!parsed.success) return { error: "Please enter a complete US address." };
  try {
    await saveShipAddress(customer.id, parsed.data);
  } catch (err) {
    console.error("save address failed:", err);
    return { error: "We couldn't save your address - please try again." };
  }
  revalidatePath("/account");
  return { ok: true };
}

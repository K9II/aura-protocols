import { getCustomer } from "@/lib/dal";

// Tells the header whether to show the Admin link. Display only: every admin
// page and action still checks requirePermission() itself.
export async function GET(): Promise<Response> {
  const customer = await getCustomer();
  return Response.json({ owner: !!customer?.isOwner }, { headers: { "Cache-Control": "private, no-store" } });
}

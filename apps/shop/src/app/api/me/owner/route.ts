import { getCustomer, getStaff } from "@/lib/dal";
import { getPartnerForCustomer } from "@/lib/partners/data";

// Tells the header whether to show the Admin and Partner links (and /affiliates
// whether to offer the dashboard instead of Apply). Display only: every admin
// page and action still checks requirePermission(), /partners checks requirePartner().
export async function GET(): Promise<Response> {
  let staff = false;
  let partner = false;
  try { staff = !!(await getStaff()); } catch (err) { console.error("staff check for Admin link failed:", err); }
  try {
    const customer = await getCustomer();
    partner = !!customer && !!(await getPartnerForCustomer(customer.id));
  } catch (err) { console.error("partner check for Partner link failed:", err); }
  return Response.json({ owner: staff, partner }, { headers: { "Cache-Control": "private, no-store" } });
}

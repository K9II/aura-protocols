import { getStaff } from "@/lib/dal";

// Tells the header whether to show the Admin link. Display only: every admin
// page and action still checks requirePermission() itself.
export async function GET(): Promise<Response> {
  let staff = false;
  try { staff = !!(await getStaff()); } catch (err) { console.error("staff check for Admin link failed:", err); }
  return Response.json({ owner: staff }, { headers: { "Cache-Control": "private, no-store" } });
}

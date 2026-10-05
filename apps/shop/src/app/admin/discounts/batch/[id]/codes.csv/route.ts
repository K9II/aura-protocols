import { z } from "zod";
import { requireOwner } from "@/lib/dal";
import { getBatch, listBatchCodes } from "@/lib/discounts/data";

// One CSV cell: a leading = + - @ (or tab/CR) would run as a spreadsheet
// formula, so it gets a ' in front; commas, quotes and newlines get quoted.
function cell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  await requireOwner();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const batch = await getBatch(id);
  if (!batch) return new Response("Not found", { status: 404 });
  const rows = await listBatchCodes(id);
  const lines = rows.map((r) => [r.code, r.redemption?.state ?? "unused", r.redemption?.order_number ?? ""].map(cell).join(","));
  const body = ["code,state,order", ...lines].join("\n") + "\n";
  const name = batch.prefix.replace(/-$/, "").replace(/[^A-Za-z0-9-]/g, "") || "batch";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-codes.csv"`,
      "cache-control": "no-store",
    },
  });
}

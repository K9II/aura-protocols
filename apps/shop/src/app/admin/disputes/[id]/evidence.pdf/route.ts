import { z } from "zod";
import { requirePermission } from "@/lib/dal";
import { getDisputeCase } from "@/lib/disputes/data";
import { buildEvidencePdf } from "@/lib/disputes/pdf";

// Download PDF (owner only): the same bytes Save draft / Submit attach in
// Stripe — the PDF is built from the records alone, with fixed dates.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  await requirePermission("disputes.view");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const c = await getDisputeCase(id);
  if (!c) return new Response("Not found", { status: 404 });
  const { bytes } = await buildEvidencePdf(c.facts);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${c.facts.order.number}-dispute-evidence.pdf"`,
      "cache-control": "no-store",
    },
  });
}

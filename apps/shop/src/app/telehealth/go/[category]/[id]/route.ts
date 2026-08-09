import { getPartnerId } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { isAllowedIntakeHost } from "@/lib/telehealth/redirect";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string; id: string }> },
): Promise<Response> {
  const { category, id } = await params;
  const res = await fetchCatalog(category, getPartnerId());
  if (!res.ok) return new Response("Catalog unavailable", { status: 502 });
  const product = res.products.find((p) => p.id === id);
  if (!product) return new Response("Not found", { status: 404 });
  if (!isAllowedIntakeHost(product.intakeUrl)) return new Response("Blocked destination", { status: 502 });
  return Response.redirect(product.intakeUrl, 302);
}

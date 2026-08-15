import { getPartnerId } from "@/lib/telehealth/config";
import { fetchCatalog } from "@/lib/telehealth/catalog";
import { isAllowedIntakeHost, appendSub } from "@/lib/telehealth/redirect";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ category: string; id: string }> },
): Promise<Response> {
  const { category, id } = await params;
  const res = await fetchCatalog(category, getPartnerId());
  if (!res.ok) return new Response("Catalog unavailable", { status: 502 });
  const product = res.products.find((p) => p.id === id);
  if (!product) return new Response("Not found", { status: 404 });
  if (!isAllowedIntakeHost(product.intakeUrl)) return new Response("Blocked destination", { status: 502 });

  const subParam = new URL(req.url).searchParams.get("sub");
  const sub = subParam ? Number(subParam) : null;
  return Response.redirect(appendSub(product.intakeUrl, sub), 302);
}

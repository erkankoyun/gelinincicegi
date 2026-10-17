import { searchVendors } from "@/lib/catalog";
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") || "").slice(0, 200);
  return Response.json(searchVendors(q, params.get("category") || "", params.get("city") || "", Number(params.get("page") || 1)), { headers: { "Cache-Control": "public, max-age=300" } });
}

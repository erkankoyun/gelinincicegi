export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.searchParams.has("q") ? "/search.html" : "/index.html";
  return Response.redirect(url, 302);
}

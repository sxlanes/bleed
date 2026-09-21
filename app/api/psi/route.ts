import { NextResponse } from "next/server";
import { psiCache, fetchAndCachePsi, normalizeUrl } from "@/lib/recon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const { normalized, domain } = normalizeUrl(url);
  const cached = psiCache.get(domain);

  if (cached) {
    return NextResponse.json({
      status: cached.data ? "ready" : "loading",
      data: cached.data,
    });
  }

  // Not in cache, trigger fetch
  fetchAndCachePsi(normalized, domain);

  return NextResponse.json({ status: "loading", data: null });
}

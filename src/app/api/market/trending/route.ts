export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMarketTrendingGames, RAWG_TRENDING_CACHE_SECONDS } from "@/lib/market/trending";
import { createMarketMeta } from "@/lib/market/response";

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? "3");

  if (!Number.isFinite(parsed)) return 3;
  return Math.min(12, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const limit = parseLimit(request);
  const { source, fallbackUsed, trending } = await listMarketTrendingGames(limit);

  return NextResponse.json(
    {
      message: "Tendencias de mercado cargadas.",
      source,
      meta: createMarketMeta({
        externalSource: "RAWG",
        fallbackUsed,
        cachedForSeconds: RAWG_TRENDING_CACHE_SECONDS,
      }),
      trending,
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMarketRecommendations } from "@/lib/market/recommendations";
import { RAWG_TRENDING_CACHE_SECONDS } from "@/lib/market/trending";
import { createMarketMeta } from "@/lib/market/response";

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? "6");

  if (!Number.isFinite(parsed)) return 6;
  return Math.min(12, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const limit = parseLimit(request);
  const { source, fallbackUsed, recommendations } = await listMarketRecommendations(limit);

  return NextResponse.json(
    {
      message: "Recomendaciones cargadas.",
      source,
      meta: createMarketMeta({
        externalSource: "RAWG",
        fallbackUsed,
        cachedForSeconds: RAWG_TRENDING_CACHE_SECONDS,
      }),
      recommendations,
    },
    { status: 200 }
  );
}

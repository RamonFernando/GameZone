export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMarketTrendingGames } from "@/lib/market/trending";

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? "3");

  if (!Number.isFinite(parsed)) return 3;
  return Math.min(12, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const limit = parseLimit(request);
  const { source, trending } = await listMarketTrendingGames(limit);

  return NextResponse.json(
    {
      message: "Tendencias de mercado cargadas.",
      source,
      trending,
    },
    { status: 200 }
  );
}

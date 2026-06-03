export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMarketGameMetadata, RAWG_METADATA_CACHE_SECONDS } from "@/lib/market/games";
import { createMarketMeta } from "@/lib/market/response";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug: routeSlug } = await context.params;
  const slug = String(routeSlug ?? "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json(
      { message: "Slug invalido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const result = await getMarketGameMetadata(slug);

  if (!result) {
    return NextResponse.json(
      { message: "Juego no encontrado.", code: "MARKET_GAME_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: "Metadata de juego cargada.",
      source: result.source,
      meta: createMarketMeta({
        externalSource: "RAWG",
        fallbackUsed: result.fallbackUsed,
        cachedForSeconds: RAWG_METADATA_CACHE_SECONDS,
      }),
      game: result.game,
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getMarketGameMetadata } from "@/lib/market/games";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug: routeSlug } = await context.params;
  const slug = String(routeSlug ?? "").trim().toLowerCase();

  if (!slug) {
    return NextResponse.json(
      { message: "Slug invalido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const game = await getMarketGameMetadata(slug);

  if (!game) {
    return NextResponse.json(
      { message: "Juego no encontrado.", code: "MARKET_GAME_NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      message: "Metadata de juego cargada.",
      source: game.source,
      game,
    },
    { status: 200 }
  );
}

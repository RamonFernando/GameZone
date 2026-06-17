export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMarketGameSummaries } from "@/services/market/games";
import { createMarketMeta } from "@/services/market/response";

export async function GET() {
  const games = await listMarketGameSummaries();

  return NextResponse.json(
    {
      message: "Metadata de juegos cargada.",
      source: "gamezone",
      meta: createMarketMeta({
        externalSource: "GameZone",
        fallbackUsed: false,
        cachedForSeconds: 0,
      }),
      games,
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listMarketGameSummaries } from "@/lib/market/games";

export async function GET() {
  const games = await listMarketGameSummaries();

  return NextResponse.json(
    {
      message: "Metadata de juegos cargada.",
      source: "gamezone",
      games,
    },
    { status: 200 }
  );
}

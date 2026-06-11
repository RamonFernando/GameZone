export const revalidate = 1800;

import { NextResponse } from "next/server";
import { listMarketPulse } from "@/lib/market/pulse";

export async function GET() {
  const pulse = await listMarketPulse();

  return NextResponse.json(
    {
      message: "Pulso de mercado cargado por fuente.",
      source: pulse.fallbackUsed ? "market-pulse-fallback" : "market-pulse",
      meta: {
        externalSource: "G2A+Steam+RAWG",
        fallbackUsed: pulse.fallbackUsed,
        cachedForSeconds: pulse.cacheSeconds,
      },
      sections: pulse.sections,
    },
    { status: 200 }
  );
}

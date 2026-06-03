export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listActiveProducts } from "@/lib/products";
import {
  createCatalogFallbackDeal,
  fetchCheapSharkDealForProduct,
  type MarketDeal,
} from "@/lib/market/deals";

function parseLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? "8");

  if (!Number.isFinite(parsed)) return 8;
  return Math.min(12, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const limit = parseLimit(request);
  const products = (await listActiveProducts()).slice(0, limit);
  let usedFallback = false;

  const deals: Array<MarketDeal | null> = await Promise.all(
    products.map(async (product) => {
      try {
        return await fetchCheapSharkDealForProduct(product);
      } catch {
        usedFallback = true;
        return null;
      }
    })
  );

  const normalizedDeals = deals.filter((deal): deal is MarketDeal => Boolean(deal));
  const fallbackDeals = products
    .filter((product) => !normalizedDeals.some((deal) => deal.catalogMatch.id === product.id))
    .map(createCatalogFallbackDeal);

  return NextResponse.json(
    {
      message: usedFallback
        ? "Ofertas cargadas con fallback de catalogo."
        : "Ofertas de mercado cargadas.",
      source: usedFallback ? "cheapshark+gamezone" : "cheapshark",
      deals: [...normalizedDeals, ...fallbackDeals],
    },
    { status: 200 }
  );
}

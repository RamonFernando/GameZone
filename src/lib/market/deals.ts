import { computeDiscountedPrice, type StoreProduct } from "@/lib/products";
import {
  createCatalogMatch,
  scoreTitleMatch,
  type MarketCatalogMatch,
} from "@/lib/market/catalog-match";

const CHEAPSHARK_DEALS_URL = "https://www.cheapshark.com/api/1.0/deals";
const CHEAPSHARK_REDIRECT_URL = "https://www.cheapshark.com/redirect";
export const CHEAPSHARK_CACHE_SECONDS = 1800;

export type MarketDeal = {
  title: string;
  image: string;
  store: string;
  dealPrice: number;
  normalPrice: number;
  gameZonePrice: number;
  saving: number;
  sourceId: string;
  sourceUrl: string;
  catalogMatch: MarketCatalogMatch;
};

type CheapSharkDeal = {
  dealID?: string;
  storeID?: string;
  title?: string;
  salePrice?: string;
  normalPrice?: string;
  savings?: string;
  thumb?: string;
};

function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreDealMatch(product: StoreProduct, deal: CheapSharkDeal) {
  return scoreTitleMatch(product.name, deal.title ?? "");
}

function pickBestDeal(product: StoreProduct, deals: CheapSharkDeal[]) {
  return deals
    .map((deal) => ({ deal, score: scoreDealMatch(product, deal) }))
    .filter(({ deal, score }) => score >= 20 && deal.dealID)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return toNumber(a.deal.salePrice) - toNumber(b.deal.salePrice);
    })[0]?.deal;
}

export async function fetchCheapSharkDealForProduct(product: StoreProduct) {
  const params = new URLSearchParams({
    title: product.name,
    pageSize: "8",
    exact: "0",
    sortBy: "Price",
  });

  const response = await fetch(`${CHEAPSHARK_DEALS_URL}?${params}`, {
    next: { revalidate: CHEAPSHARK_CACHE_SECONDS },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`CheapShark responded with ${response.status}`);
  }

  const deals = (await response.json()) as CheapSharkDeal[];
  const bestDeal = pickBestDeal(product, deals);

  if (!bestDeal?.dealID) {
    return null;
  }

  const dealPrice = toNumber(bestDeal.salePrice);
  const normalPrice = toNumber(bestDeal.normalPrice);
  const saving = Math.round(toNumber(bestDeal.savings));

  return {
    title: bestDeal.title ?? product.name,
    image: product.coverImage,
    store: bestDeal.storeID ? `CheapShark store ${bestDeal.storeID}` : "CheapShark",
    dealPrice,
    normalPrice,
    gameZonePrice: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
    saving,
    sourceId: `cheapshark:${bestDeal.dealID}`,
    sourceUrl: `${CHEAPSHARK_REDIRECT_URL}?dealID=${encodeURIComponent(bestDeal.dealID)}`,
    catalogMatch: createCatalogMatch(product, scoreDealMatch(product, bestDeal)),
  } satisfies MarketDeal;
}

export function createCatalogFallbackDeal(product: StoreProduct) {
  const gameZonePrice = computeDiscountedPrice(product.priceOriginal, product.discountPercent);

  return {
    title: product.name,
    image: product.coverImage,
    store: "GameZone",
    dealPrice: gameZonePrice,
    normalPrice: product.priceOriginal,
    gameZonePrice,
    saving: product.discountPercent,
    sourceId: `gamezone:${product.slug}`,
    sourceUrl: `/games/${product.slug}`,
    catalogMatch: createCatalogMatch(product),
  } satisfies MarketDeal;
}

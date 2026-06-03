import { computeDiscountedPrice, type StoreProduct } from "@/lib/products";

const CHEAPSHARK_DEALS_URL = "https://www.cheapshark.com/api/1.0/deals";
const CHEAPSHARK_REDIRECT_URL = "https://www.cheapshark.com/redirect";

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
  catalogMatch: {
    id: string;
    slug: string;
    priceOriginal: number;
    discountPercent: number;
  };
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

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreDealMatch(product: StoreProduct, deal: CheapSharkDeal) {
  const productTitle = normalizeTitle(product.name);
  const dealTitle = normalizeTitle(deal.title ?? "");

  if (!dealTitle) return 0;
  if (dealTitle === productTitle) return 100;
  if (dealTitle.includes(productTitle) || productTitle.includes(dealTitle)) return 80;

  const productTerms = new Set(productTitle.split(" ").filter((term) => term.length > 2));
  const matchingTerms = dealTitle
    .split(" ")
    .filter((term) => productTerms.has(term) && term.length > 2);

  return matchingTerms.length * 10;
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
    next: { revalidate: 1800 },
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
    catalogMatch: {
      id: product.id,
      slug: product.slug,
      priceOriginal: product.priceOriginal,
      discountPercent: product.discountPercent,
    },
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
    catalogMatch: {
      id: product.id,
      slug: product.slug,
      priceOriginal: product.priceOriginal,
      discountPercent: product.discountPercent,
    },
  } satisfies MarketDeal;
}

import { type StoreProduct } from "@/lib/products";

export type MarketCatalogMatch = {
  matched: boolean;
  matchScore: number;
  id: string | null;
  slug: string | null;
  title: string | null;
  image: string | null;
  platform: string | null;
  priceOriginal: number | null;
  discountPercent: number | null;
  priceSignal: "discounted" | "standard" | "unknown";
  trendSignal: "popular" | "catalog" | "unknown";
  metadataSignal: "rawg" | "local" | "missing";
};

export function normalizeMarketTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreTitleMatch(productTitle: string, externalTitle: string) {
  const normalizedProduct = normalizeMarketTitle(productTitle);
  const normalizedExternal = normalizeMarketTitle(externalTitle);

  if (!normalizedExternal) return 0;
  if (normalizedExternal === normalizedProduct) return 100;
  if (normalizedExternal.includes(normalizedProduct) || normalizedProduct.includes(normalizedExternal)) {
    return 80;
  }

  const productTerms = new Set(normalizedProduct.split(" ").filter((term) => term.length > 2));
  return normalizedExternal
    .split(" ")
    .filter((term) => productTerms.has(term) && term.length > 2).length * 10;
}

export function findBestCatalogMatch(products: StoreProduct[], externalTitle: string) {
  return products
    .map((product) => ({
      product,
      matchScore: scoreTitleMatch(product.name, externalTitle),
    }))
    .filter(({ matchScore }) => matchScore >= 20)
    .sort((a, b) => b.matchScore - a.matchScore)[0] ?? null;
}

export function createCatalogMatch(
  product: StoreProduct | null | undefined,
  matchScore = product ? 100 : 0,
  metadataSource?: string | null
) {
  if (!product) {
    return {
      matched: false,
      matchScore: 0,
      id: null,
      slug: null,
      title: null,
      image: null,
      platform: null,
      priceOriginal: null,
      discountPercent: null,
      priceSignal: "unknown",
      trendSignal: "unknown",
      metadataSignal: "missing",
    } satisfies MarketCatalogMatch;
  }

  return {
    matched: true,
    matchScore,
    id: product.id,
    slug: product.slug,
    title: product.name,
    image: product.coverImage,
    platform: product.platform,
    priceOriginal: product.priceOriginal,
    discountPercent: product.discountPercent,
    priceSignal: product.discountPercent > 0 ? "discounted" : "standard",
    trendSignal: product.likesCount >= 1000 ? "popular" : "catalog",
    metadataSignal: metadataSource === "RAWG" ? "rawg" : "local",
  } satisfies MarketCatalogMatch;
}

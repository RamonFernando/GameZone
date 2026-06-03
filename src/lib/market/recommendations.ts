import { computeDiscountedPrice, listActiveProducts, type StoreProduct } from "@/lib/products";
import { createCatalogMatch, type MarketCatalogMatch } from "@/lib/market/catalog-match";
import { listMarketTrendingGames } from "@/lib/market/trending";

export type MarketRecommendation = {
  score: number;
  reason: string;
  title: string;
  slug: string;
  image: string;
  platform: string;
  priceOriginal: number;
  priceFinal: number;
  discountPercent: number;
  priceSignal: "discounted" | "standard";
  trendScore: number;
  trendSignal: "popular" | "catalog";
  catalogMatch: MarketCatalogMatch;
  nextAction: {
    label: string;
    href: string;
  };
};

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildReason(product: StoreProduct, trendScore: number) {
  const reasons = [];

  if (product.discountPercent > 0) {
    reasons.push(`${product.discountPercent}% de descuento activo`);
  }

  if (trendScore >= 75) {
    reasons.push("senal de tendencia alta");
  } else if (product.likesCount >= 1000) {
    reasons.push("popular en el catalogo GameZone");
  }

  if (product.stock > 0) {
    reasons.push("disponible para compra inmediata");
  }

  return reasons.length > 0
    ? reasons.join(", ")
    : "Coincidencia estable entre catalogo, precio y disponibilidad";
}

function scoreProduct(product: StoreProduct, trendScore: number) {
  const discountBoost = product.discountPercent * 1.4;
  const popularityBoost = Math.min(product.likesCount / 50, 25);
  const trendBoost = Math.min(trendScore / 2, 35);
  const stockBoost = product.stock > 0 ? 8 : -20;

  return clampScore(25 + discountBoost + popularityBoost + trendBoost + stockBoost);
}

export async function listMarketRecommendations(limit = 6) {
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));
  const [products, trendingResult] = await Promise.all([
    listActiveProducts(),
    listMarketTrendingGames(12),
  ]);

  const trendBySlug = new Map(
    trendingResult.trending
      .filter((item) => item.catalogMatch.slug)
      .map((item) => [item.catalogMatch.slug, item.trendScore])
  );

  const recommendations = products
    .map((product) => {
      const trendScore = trendBySlug.get(product.slug) ?? Math.min(100, product.likesCount / 20);
      const score = scoreProduct(product, trendScore);
      const priceFinal = computeDiscountedPrice(product.priceOriginal, product.discountPercent);

      return {
        score,
        reason: buildReason(product, trendScore),
        title: product.name,
        slug: product.slug,
        image: product.coverImage,
        platform: product.platform,
        priceOriginal: product.priceOriginal,
        priceFinal,
        discountPercent: product.discountPercent,
        priceSignal: product.discountPercent > 0 ? "discounted" : "standard",
        trendScore: clampScore(trendScore),
        trendSignal: product.likesCount >= 1000 ? "popular" : "catalog",
        catalogMatch: createCatalogMatch(product),
        nextAction: {
          label: "Ver ficha",
          href: `/games/${product.slug}`,
        },
      } satisfies MarketRecommendation;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);

  return {
    source: trendingResult.source.includes("rawg") ? "catalog+rawg" : "catalog",
    fallbackUsed: trendingResult.fallbackUsed,
    recommendations,
  };
}

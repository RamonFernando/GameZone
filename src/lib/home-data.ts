import { unstable_cache } from "next/cache";
import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDiscountedPrice, ensureProductsSeeded, listActiveProducts, resolveStoreLabel } from "@/lib/products";
import type { HomeHeroSection, ProductPreview } from "@/types/product";

// Tag compartido: cualquier mutación del catálogo (admin) llama a
// revalidateTag(PRODUCTS_CACHE_TAG, "max") para refrescar la home al instante.
// El cron de Netlify queda cubierto por el revalidate temporal (5 min),
// ya que corre fuera de Next y no puede invalidar tags.
export const PRODUCTS_CACHE_TAG = "products";
const CACHE_REVALIDATE_SECONDS = 300;
const HERO_SECTION_SIZE = 5;

// La home solo usa `description` para el índice de búsqueda (puntuación por
// tokens), no la pinta. Truncarla evita que un enriquecimiento RAWG con
// descripciones largas infle el HTML de la home (descripción completa × catálogo).
// La ficha de detalle lee la descripción íntegra de su propia query, no de aquí.
const SEARCH_DESCRIPTION_MAX = 200;

function truncateForSearch(description: string) {
  if (description.length <= SEARCH_DESCRIPTION_MAX) return description;
  return description.slice(0, SEARCH_DESCRIPTION_MAX);
}

export function toProductPreview(product: Product): ProductPreview {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    coverImage: product.coverImage,
    backgroundImage: product.backgroundImage,
    platform: product.platform,
    region: product.region,
    storeLabel: resolveStoreLabel(product),
    cardSubtitle: product.cardSubtitle,
    priceOriginal: product.priceOriginal,
    discountPercent: product.discountPercent,
    cashbackPercent: product.cashbackPercent,
    likesCount: product.likesCount,
    priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
    stock: product.stock,
  };
}

async function loadCatalogPreviews(): Promise<ProductPreview[]> {
  const products = await listActiveProducts();
  return products.map((product) => {
    const preview = toProductPreview(product);
    return { ...preview, description: truncateForSearch(preview.description) };
  });
}

export const getCachedCatalog = unstable_cache(loadCatalogPreviews, ["home-catalog"], {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: CACHE_REVALIDATE_SECONDS,
});

function byFeaturedOfferScore(a: Product, b: Product) {
  const aScore = a.discountPercent * 2 + a.cashbackPercent + a.likesCount / 100 + Math.min(a.stock, 20);
  const bScore = b.discountPercent * 2 + b.cashbackPercent + b.likesCount / 100 + Math.min(b.stock, 20);

  if (bScore !== aScore) return bScore - aScore;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function byTopDiscount(a: Product, b: Product) {
  if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
  if (b.cashbackPercent !== a.cashbackPercent) return b.cashbackPercent - a.cashbackPercent;
  return b.likesCount - a.likesCount;
}

function byPopularity(a: Product, b: Product) {
  if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
  if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function pickUnique(candidates: Product[], usedSlugs: Set<string>, fallback: Product[]) {
  const picked: Product[] = [];
  const pool = [...candidates, ...fallback];

  for (const product of pool) {
    if (picked.length >= HERO_SECTION_SIZE) break;
    if (usedSlugs.has(product.slug)) continue;

    usedSlugs.add(product.slug);
    picked.push(product);
  }

  return picked.map(toProductPreview);
}

async function loadHeroSections(): Promise<HomeHeroSection[]> {
  await ensureProductsSeeded();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const fallback = [...products].sort(byPopularity);
  const usedSlugs = new Set<string>();

  const salesRows = await prisma.orderItem.groupBy({
    by: ["gameSlug"],
    where: {
      order: {
        status: "paid",
        paidAt: { not: null },
      },
    },
    _sum: { quantity: true },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 12,
  });

  const bestSellers = salesRows
    .map((row) => productsBySlug.get(row.gameSlug))
    .filter((product): product is Product => Boolean(product));

  const featuredOffers = [...products]
    .filter((product) => product.discountPercent > 0 || product.cashbackPercent > 0)
    .sort(byFeaturedOfferScore);

  const topDiscounts = [...products]
    .filter((product) => product.discountPercent > 0)
    .sort(byTopDiscount);

  return [
    {
      id: "featured-offers",
      title: "Ofertas destacadas",
      titleEn: "Featured offers",
      products: pickUnique(featuredOffers, usedSlugs, fallback),
    },
    {
      id: "best-sellers",
      title: "Más vendidos",
      titleEn: "Best sellers",
      products: pickUnique(bestSellers.length > 0 ? bestSellers : fallback, usedSlugs, fallback),
    },
    {
      id: "top-discounts",
      title: "Top descuentos",
      titleEn: "Top discounts",
      products: pickUnique(topDiscounts, usedSlugs, fallback),
    },
  ];
}

export const getCachedHeroSections = unstable_cache(loadHeroSections, ["home-hero"], {
  tags: [PRODUCTS_CACHE_TAG],
  revalidate: CACHE_REVALIDATE_SECONDS,
});

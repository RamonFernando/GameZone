import type { Product } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const RAWG_BASE_URL = "https://api.rawg.io/api";
const RAWG_ENRICH_LIMIT = 12;

type RawgRequirements = {
  minimum?: string;
  recommended?: string;
};

type RawgGame = {
  id?: number;
  slug?: string;
  name?: string;
  description_raw?: string;
  released?: string;
  background_image?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  playtime?: number;
  website?: string;
  genres?: Array<{ name?: string }>;
  platforms?: Array<{ platform?: { name?: string; slug?: string }; requirements?: RawgRequirements }>;
  tags?: Array<{ name?: string }>;
  stores?: Array<{ store?: { name?: string } }>;
  developers?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  esrb_rating?: { name?: string } | null;
};

type RawgSearchResponse = {
  results?: RawgGame[];
};

type RawgScreenshotsResponse = {
  results?: Array<{ image?: string }>;
};

export type RawgCatalogEnrichmentResult = {
  enriched: number;
  skipped: number;
  missingApiKey: boolean;
  results: Array<{
    action: "enriched" | "skipped";
    slug: string;
    title: string;
    reason: string;
  }>;
};

const RAWG_SLUG_OVERRIDES: Record<string, string> = {
  "league-of-legends-rp-pack-gamezone": "league-of-legends",
  "pubg-mobile-uc-pack-gamezone": "pubg-mobile",
  "fortnite-v-bucks-pack-gamezone": "fortnite",
  "valorant-points-pack-gamezone": "valorant",
  "call-of-duty-warzone-cp-pack-gamezone": "call-of-duty-warzone",
  "starcraft-remastered-gamezone": "starcraft-remastered",
  "starcraft-ii-campaign-collection-gamezone": "starcraft-ii",
  "minecraft-java-bedrock-edition-gamezone": "minecraft",
  "sid-meiers-civilization-vi-gamezone": "sid-meiers-civilization-vi",
};

function toJsonList<T>(items: T[] | undefined, mapper: (item: T) => string | undefined) {
  return JSON.stringify([
    ...new Set(
      (items ?? [])
        .map(mapper)
        .filter((item): item is string => Boolean(item && item.trim().length > 0))
    ),
  ]);
}

function firstName(items: Array<{ name?: string }> | undefined) {
  return items?.[0]?.name ?? null;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requirementsFromPlatforms(platforms: RawgGame["platforms"]) {
  const pc = (platforms ?? []).find((item) => item.platform?.slug === "pc");
  const requirements = pc?.requirements;
  if (!requirements) return null;

  const parts = [];
  if (requirements.minimum) parts.push(`Minimos:\n${requirements.minimum}`);
  if (requirements.recommended) parts.push(`Recomendados:\n${requirements.recommended}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function normalizeSearchName(product: Product) {
  return product.name
    .replace(/\b(gamezone|rp pack|uc pack|v-bucks pack|points pack|cp pack)\b/gi, " ")
    .replace(/[:|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldEnrichProduct(product: Product) {
  if (!product.isActive) return false;
  if (!product.backgroundImage) return true;
  if (product.screenshotsJson === "[]" || product.screenshotsJson.trim().length === 0) return true;
  if (!product.longDescription || !product.developer || !product.publisher) return true;
  return product.metadataSource !== "RAWG" && product.metadataSource !== "gamezone+rawg";
}

async function rawgFetch<T>(
  path: string,
  params: Record<string, string | number | boolean | null>,
  apiKey: string
) {
  const url = new URL(`${RAWG_BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!response.ok) {
    throw new Error(`RAWG responded with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function findRawgGame(product: Product, apiKey: string) {
  const idOrSlug = product.rawgId ?? product.rawgSlug ?? RAWG_SLUG_OVERRIDES[product.slug];
  if (idOrSlug) {
    return rawgFetch<RawgGame>(`/games/${idOrSlug}`, {}, apiKey);
  }

  const search = await rawgFetch<RawgSearchResponse>(
    "/games",
    {
      search: normalizeSearchName(product),
      page_size: 3,
      search_precise: true,
    },
    apiKey
  );

  const match = search.results?.[0];
  if (!match?.id) return match ?? null;
  return rawgFetch<RawgGame>(`/games/${match.id}`, {}, apiKey);
}

function buildUpdateData(details: RawgGame, screenshots: RawgScreenshotsResponse) {
  const screenshotImages = (screenshots.results ?? [])
    .map((item) => item.image)
    .filter((image): image is string => Boolean(image))
    .slice(0, 8);

  return {
    longDescription: details.description_raw || null,
    rawgId: details.id ?? null,
    rawgSlug: details.slug ?? null,
    releaseDate: parseDate(details.released),
    developer: firstName(details.developers),
    publisher: firstName(details.publishers),
    genresJson: toJsonList(details.genres, (item) => item.name),
    platformsJson: toJsonList(details.platforms, (item) => item.platform?.name),
    tagsJson: toJsonList(details.tags, (item) => item.name),
    storesJson: toJsonList(details.stores, (item) => item.store?.name),
    screenshotsJson: JSON.stringify(screenshotImages),
    backgroundImage: details.background_image || screenshotImages[0] || null,
    website: details.website || null,
    esrbRating: details.esrb_rating?.name ?? null,
    metacritic: details.metacritic ?? null,
    rating: details.rating ?? null,
    ratingsCount: details.ratings_count ?? 0,
    playtimeHours: details.playtime ?? null,
    requirements: requirementsFromPlatforms(details.platforms),
    metadataSource: "RAWG",
    metadataUpdatedAt: new Date(),
  };
}

export async function enrichProductFromRawg(product: Product, options: { dryRun?: boolean } = {}) {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    return {
      action: "skipped" as const,
      missingApiKey: true,
      reason: "Falta RAWG_API_KEY.",
    };
  }

  if (!shouldEnrichProduct(product)) {
    return {
      action: "skipped" as const,
      missingApiKey: false,
      reason: "Producto ya tiene metadata suficiente.",
    };
  }

  const details = await findRawgGame(product, apiKey);
  if (!details?.id) {
    return {
      action: "skipped" as const,
      missingApiKey: false,
      reason: "RAWG no encontro coincidencia fiable.",
    };
  }

  const screenshots = await rawgFetch<RawgScreenshotsResponse>(
    `/games/${details.id}/screenshots`,
    { page_size: 8 },
    apiKey
  );
  const updateData = buildUpdateData(details, screenshots);

  if (!options.dryRun) {
    await prisma.product.update({
      where: { id: product.id },
      data: updateData,
    });
  }

  return {
    action: "enriched" as const,
    missingApiKey: false,
    reason: `Metadata RAWG aplicada desde ${details.name ?? details.slug ?? details.id}.`,
  };
}

export async function enrichCatalogProductsFromRawg(options: { dryRun?: boolean; limit?: number } = {}) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { backgroundImage: null },
        { screenshotsJson: "[]" },
        { longDescription: null },
        { developer: null },
        { publisher: null },
        { metadataSource: { not: "RAWG" } },
      ],
    },
    orderBy: [{ metadataUpdatedAt: "asc" }, { createdAt: "desc" }],
    take: options.limit ?? RAWG_ENRICH_LIMIT,
  });

  const results: RawgCatalogEnrichmentResult["results"] = [];
  let missingApiKey = false;

  for (const product of products) {
    try {
      const result = await enrichProductFromRawg(product, { dryRun: options.dryRun });
      if (result.missingApiKey) missingApiKey = true;
      results.push({
        action: result.action,
        slug: product.slug,
        title: product.name,
        reason: result.reason,
      });
      if (result.missingApiKey) break;
    } catch (error) {
      results.push({
        action: "skipped",
        slug: product.slug,
        title: product.name,
        reason: error instanceof Error ? error.message : "Error RAWG desconocido.",
      });
    }
  }

  return {
    enriched: results.filter((result) => result.action === "enriched").length,
    skipped: results.filter((result) => result.action === "skipped").length,
    missingApiKey,
    results,
  } satisfies RawgCatalogEnrichmentResult;
}

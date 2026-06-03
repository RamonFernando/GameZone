import { type StoreProduct, getActiveProductBySlug, listActiveProducts } from "@/lib/products";
import { createCatalogMatch, type MarketCatalogMatch } from "@/lib/market/catalog-match";

const RAWG_BASE_URL = "https://api.rawg.io/api";

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

type RawgRequirements = {
  minimum?: string;
  recommended?: string;
};

type RawgSearchResponse = {
  results?: RawgGame[];
};

export type MarketGameMetadata = {
  title: string;
  slug: string;
  cover: string;
  description: string;
  longDescription: string | null;
  released: string | null;
  developer: string | null;
  publisher: string | null;
  genres: string[];
  platforms: string[];
  tags: string[];
  stores: string[];
  rating: number | null;
  ratingsCount: number;
  metacritic: number | null;
  playtimeHours: number | null;
  website: string | null;
  esrbRating: string | null;
  backgroundImage: string | null;
  source: "GameZone" | "RAWG" | "GameZone+RAWG";
  sourceId: string;
  updatedAt: string | null;
  catalogMatch: MarketCatalogMatch;
};

function parseJsonList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function toList<T>(items: T[] | undefined, mapper: (item: T) => string | undefined) {
  return [
    ...new Set(
      (items ?? [])
        .map(mapper)
        .filter((item): item is string => Boolean(item && item.trim().length > 0))
    ),
  ];
}

function firstName(items: Array<{ name?: string }> | undefined) {
  return items?.[0]?.name ?? null;
}

function formatRawgDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function rawgFetch<T>(path: string, params: Record<string, string | number | boolean | null>) {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${RAWG_BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`RAWG responded with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function findRawgGame(product: Awaited<ReturnType<typeof getActiveProductBySlug>>) {
  if (!product) return null;

  const idOrSlug = product.rawgId ?? product.rawgSlug;
  if (idOrSlug) {
    return rawgFetch<RawgGame>(`/games/${idOrSlug}`, {});
  }

  const search = await rawgFetch<RawgSearchResponse>("/games", {
    search: product.name,
    page_size: 1,
    search_precise: true,
  });

  const match = search?.results?.[0];
  if (!match?.id) return match ?? null;
  return rawgFetch<RawgGame>(`/games/${match.id}`, {});
}

export function createCatalogGameMetadata(product: NonNullable<Awaited<ReturnType<typeof getActiveProductBySlug>>>) {
  return {
    title: product.name,
    slug: product.slug,
    cover: product.coverImage,
    description: product.description,
    longDescription: product.longDescription,
    released: product.releaseDate?.toISOString() ?? null,
    developer: product.developer,
    publisher: product.publisher,
    genres: parseJsonList(product.genresJson),
    platforms: parseJsonList(product.platformsJson),
    tags: parseJsonList(product.tagsJson),
    stores: parseJsonList(product.storesJson),
    rating: product.rating,
    ratingsCount: product.ratingsCount,
    metacritic: product.metacritic,
    playtimeHours: product.playtimeHours,
    website: product.website,
    esrbRating: product.esrbRating,
    backgroundImage: product.backgroundImage,
    source: product.metadataSource === "RAWG" ? "GameZone+RAWG" : "GameZone",
    sourceId: product.rawgId ? `rawg:${product.rawgId}` : `gamezone:${product.slug}`,
    updatedAt: product.metadataUpdatedAt?.toISOString() ?? product.updatedAt.toISOString(),
    catalogMatch: createCatalogMatch(product, 100, product.metadataSource),
  } satisfies MarketGameMetadata;
}

export function createCatalogGameSummary(product: StoreProduct) {
  return {
    title: product.name,
    slug: product.slug,
    cover: product.coverImage,
    genres: [] as string[],
    platforms: product.platform ? [product.platform] : [],
    released: null,
    rating: null,
    tags: [] as string[],
    source: "GameZone" as const,
    catalogMatch: createCatalogMatch(product),
  };
}

export async function getMarketGameMetadata(slug: string) {
  const product = await getActiveProductBySlug(slug);
  if (!product) return null;

  const fallback = createCatalogGameMetadata(product);

  try {
    const rawg = await findRawgGame(product);
    if (!rawg?.id) return fallback;

    return {
      title: rawg.name ?? fallback.title,
      slug: product.slug,
      cover: product.coverImage,
      description: product.description,
      longDescription: rawg.description_raw ?? fallback.longDescription,
      released: formatRawgDate(rawg.released) ?? fallback.released,
      developer: firstName(rawg.developers) ?? fallback.developer,
      publisher: firstName(rawg.publishers) ?? fallback.publisher,
      genres: toList(rawg.genres, (item) => item.name),
      platforms: toList(rawg.platforms, (item) => item.platform?.name),
      tags: toList(rawg.tags, (item) => item.name).slice(0, 12),
      stores: toList(rawg.stores, (item) => item.store?.name),
      rating: rawg.rating ?? fallback.rating,
      ratingsCount: rawg.ratings_count ?? fallback.ratingsCount,
      metacritic: rawg.metacritic ?? fallback.metacritic,
      playtimeHours: rawg.playtime ?? fallback.playtimeHours,
      website: rawg.website || fallback.website,
      esrbRating: rawg.esrb_rating?.name ?? fallback.esrbRating,
      backgroundImage: rawg.background_image || fallback.backgroundImage,
      source: "GameZone+RAWG",
      sourceId: `rawg:${rawg.id}`,
      updatedAt: new Date().toISOString(),
      catalogMatch: createCatalogMatch(product, 100, "RAWG"),
    } satisfies MarketGameMetadata;
  } catch {
    return fallback;
  }
}

export async function listMarketGameSummaries() {
  const products = await listActiveProducts();
  return products.map(createCatalogGameSummary);
}

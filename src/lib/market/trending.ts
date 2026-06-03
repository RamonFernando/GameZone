import { type StoreProduct, listActiveProducts } from "@/lib/products";

const RAWG_BASE_URL = "https://api.rawg.io/api";

type RawgTrendingGame = {
  id?: number;
  name?: string;
  slug?: string;
  background_image?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number | null;
  released?: string | null;
  platforms?: Array<{ platform?: { name?: string } }>;
};

type RawgTrendingResponse = {
  results?: RawgTrendingGame[];
};

export type MarketTrendingGame = {
  rank: number;
  title: string;
  image: string;
  platform: string;
  signal: string;
  source: string;
  trendScore: number;
  gameZoneMatch: string;
  catalogMatch: {
    id: string;
    slug: string;
  } | null;
};

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreTitleMatch(product: StoreProduct, title: string) {
  const productTitle = normalizeTitle(product.name);
  const externalTitle = normalizeTitle(title);

  if (!externalTitle) return 0;
  if (externalTitle === productTitle) return 100;
  if (externalTitle.includes(productTitle) || productTitle.includes(externalTitle)) return 80;

  const productTerms = new Set(productTitle.split(" ").filter((term) => term.length > 2));
  return externalTitle
    .split(" ")
    .filter((term) => productTerms.has(term) && term.length > 2).length * 10;
}

function findCatalogMatch(products: StoreProduct[], title: string) {
  return products
    .map((product) => ({ product, score: scoreTitleMatch(product, title) }))
    .filter(({ score }) => score >= 20)
    .sort((a, b) => b.score - a.score)[0]?.product;
}

function platformLabel(rawgGame: RawgTrendingGame, catalogProduct: StoreProduct | undefined) {
  const rawgPlatforms = (rawgGame.platforms ?? [])
    .map((item) => item.platform?.name)
    .filter((name): name is string => Boolean(name));

  if (rawgPlatforms.length > 0) {
    return rawgPlatforms.slice(0, 2).join(" / ");
  }

  return catalogProduct?.platform ?? "Multiplataforma";
}

function trendScore(rawgGame: RawgTrendingGame) {
  const rating = rawgGame.rating ?? 0;
  const ratingsCount = rawgGame.ratings_count ?? 0;
  const metacritic = rawgGame.metacritic ?? 0;
  return Math.round(rating * 14 + Math.min(ratingsCount / 100, 25) + metacritic / 5);
}

function signalLabel(rawgGame: RawgTrendingGame) {
  if ((rawgGame.metacritic ?? 0) >= 85) return "Critica destacada";
  if ((rawgGame.ratings_count ?? 0) >= 2000) return "Alta actividad";
  if ((rawgGame.rating ?? 0) >= 4) return "Rating alto";
  return "Tendencia detectada";
}

async function rawgFetchTrending() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) return null;

  const url = new URL(`${RAWG_BASE_URL}/games`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("ordering", "-added");
  url.searchParams.set("page_size", "12");

  const response = await fetch(url, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`RAWG trending responded with ${response.status}`);
  }

  return (await response.json()) as RawgTrendingResponse;
}

function createCatalogFallbackTrending(products: StoreProduct[], limit: number) {
  return products.slice(0, limit).map((product, index) => ({
    rank: index + 1,
    title: product.name,
    image: product.coverImage,
    platform: product.platform,
    signal: product.likesCount >= 1000 ? "Popular en GameZone" : "Disponible en catalogo",
    source: "GameZone catalog",
    trendScore: Math.min(100, Math.round(product.likesCount / 20 + product.discountPercent)),
    gameZoneMatch: "Disponible en catalogo",
    catalogMatch: {
      id: product.id,
      slug: product.slug,
    },
  })) satisfies MarketTrendingGame[];
}

export async function listMarketTrendingGames(limit = 3) {
  const products = await listActiveProducts();
  const safeLimit = Math.min(12, Math.max(1, Math.floor(limit)));

  try {
    const rawg = await rawgFetchTrending();
    const rawgGames = rawg?.results ?? [];
    if (rawgGames.length === 0) {
      return {
        source: "gamezone",
        trending: createCatalogFallbackTrending(products, safeLimit),
      };
    }

    const trending = rawgGames.slice(0, safeLimit).map((rawgGame, index) => {
      const catalogProduct = findCatalogMatch(products, rawgGame.name ?? "");

      return {
        rank: index + 1,
        title: rawgGame.name ?? catalogProduct?.name ?? "Juego destacado",
        image: catalogProduct?.coverImage ?? products[index % products.length]?.coverImage ?? "/hero/hogwarts-legacy-cover.jpg",
        platform: platformLabel(rawgGame, catalogProduct),
        signal: signalLabel(rawgGame),
        source: "RAWG trending",
        trendScore: trendScore(rawgGame),
        gameZoneMatch: catalogProduct ? "Disponible en catalogo" : "Sin coincidencia directa",
        catalogMatch: catalogProduct
          ? {
              id: catalogProduct.id,
              slug: catalogProduct.slug,
            }
          : null,
      } satisfies MarketTrendingGame;
    });

    return {
      source: "rawg",
      trending,
    };
  } catch {
    return {
      source: "gamezone-fallback",
      trending: createCatalogFallbackTrending(products, safeLimit),
    };
  }
}

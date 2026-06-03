import { computeDiscountedPrice, listActiveProducts, type StoreProduct } from "@/lib/products";
import { createCatalogMatch, findBestCatalogMatch, type MarketCatalogMatch } from "@/lib/market/catalog-match";
import { listMarketTrendingGames, RAWG_TRENDING_CACHE_SECONDS } from "@/lib/market/trending";

export const MARKET_PULSE_CACHE_SECONDS = 1800;
const CATALOG_MATCH_SYNC_SCORE = 80;

type PulseSource = "G2A" | "Steam" | "RAWG";

export type MarketPulseItem = {
  rank: number;
  title: string;
  image: string;
  platform: string;
  signal: string;
  source: PulseSource;
  sourceUrl: string;
  catalogStatus: string;
  catalogMatch: MarketCatalogMatch;
  gameZonePrice: number | null;
  g2aPrice: number | null;
  g2aCurrency: string | null;
  steamAppId?: string | null;
  steamPrice: number | null;
  steamCurrency: string | null;
  steamIsFree: boolean;
};

export type MarketPulseSection = {
  id: string;
  title: string;
  source: PulseSource;
  sourceUrl: string;
  signal: string;
  fallbackUsed: boolean;
  items: MarketPulseItem[];
};

const G2A_POPULAR_URL = "https://www.g2a.com/category/games-c189?sort=bestsellers-first";
const G2A_BESTSELLERS_URL = "https://www.g2a.com/top-list/best-selling-games/";
const G2A_API_BASE_URL = process.env.G2A_API_BASE_URL ?? "https://sandboxapi.g2a.com";
const STEAM_TOP_SELLERS_URL = "https://steamdb.info/stats/globaltopsellers/";
const STEAM_MOST_PLAYED_URL = "https://steamdb.info/charts/";
const STEAM_APPDETAILS_URL = "https://store.steampowered.com/api/appdetails";

const g2aPopularSnapshot = [
  "Forza Horizon 6",
  "Minecraft: Java & Bedrock Edition",
  "Red Dead Redemption 2",
  "Grand Theft Auto V Enhanced",
  "Elden Ring",
  "Skyrim Special Edition",
  "Cyberpunk 2077",
  "God of War Ragnarok",
  "Resident Evil 4 Remake",
  "Hogwarts Legacy",
];

const g2aBlockedTitleTerms = [
  "random",
  "premium",
  "subscription",
  "gift card",
  "cash card",
  "currency",
  "wallet",
  "points",
  "account",
  "bundle",
  "pack",
  "keys",
  "ru/cis",
  "cis",
];
const g2aBestsellerSnapshot = [
  "Minecraft Java Edition",
  "The Elder Scrolls V: Skyrim Special Edition",
  "Grand Theft Auto V Enhanced",
  "Elden Ring",
  "Red Dead Redemption 2",
  "Forza Horizon 6",
  "Call of Duty Black Ops 6",
  "Cyberpunk 2077",
  "F1 24",
  "Hogwarts Legacy",
];
const steamSnapshotAppIds: Record<string, string> = {
  "Counter-Strike 2": "730",
  "PUBG: BATTLEGROUNDS": "578080",
  "Apex Legends": "1172470",
  "Dota 2": "570",
  "Baldur's Gate 3": "1086940",
  "Grand Theft Auto V Enhanced": "271590",
  "Marvel Rivals": "2767030",
  Rust: "252490",
  "Destiny 2": "1085660",
  "Elden Ring": "1245620",
  "Path of Exile 2": "2694490",
  "Rainbow Six Siege": "359550",
  Marathon: "2453150",
  "Subnautica 2": "1962700",
};

const steamTopSellerSnapshot = [
  "Counter-Strike 2",
  "Forza Horizon 6",
  "Apex Legends",
  "Path of Exile 2",
  "007 First Light",
  "Rainbow Six Siege",
  "Fatekeeper",
  "Paralives",
  "Marathon",
  "Subnautica 2",
];
const steamMostPlayedSnapshot = [
  "Counter-Strike 2",
  "PUBG: BATTLEGROUNDS",
  "Apex Legends",
  "Dota 2",
  "Baldur's Gate 3",
  "Grand Theft Auto V Enhanced",
  "Marvel Rivals",
  "Rust",
  "Destiny 2",
  "Elden Ring",
];

function fallbackImage(products: StoreProduct[], index: number) {
  return products[index % products.length]?.coverImage ?? "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg";
}

function cleanMarketTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\b(PC|Xbox|PlayStation|PS5|Steam|Microsoft Store|Rockstar|Key|Account|GLOBAL|ROW|UNITED STATES)\b/gi, "")
    .replace(/[•\-|]+/g, " ")
    .trim();
}

type MarketTitleEntry = {
  title: string;
  image?: string | null;
  platform?: string | null;
  price?: number | null;
  currency?: string | null;
  productId?: string | null;
  steamAppId?: string | null;
};

type SteamPrice = {
  price: number | null;
  currency: string | null;
  isFree: boolean;
  image: string | null;
};

type G2aApiProduct = {
  id?: string;
  name?: string;
  qty?: number;
  minPrice?: number;
  coverImage?: string;
  smallImage?: string;
  thumbnail?: string;
  platform?: string;
  region?: string;
  categories?: Array<{ id?: number; name?: string }>;
};

type G2aApiProductsResponse = {
  docs?: G2aApiProduct[];
};

function uniqueTitles(titles: string[]) {
  const seen = new Set<string>();
  return titles.filter((title) => {
    const normalized = title.toLowerCase();
    if (!title || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function uniqueEntries(entries: MarketTitleEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const normalized = entry.title.toLowerCase();
    if (!entry.title || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function parsePrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Number(value.toFixed(2));
  if (typeof value !== "string") return null;

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const price = Number(match[1]);
  return Number.isFinite(price) ? Number(price.toFixed(2)) : null;
}

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) return firstString(value[0]);
  return null;
}

function offerFrom(value: unknown) {
  const offer = Array.isArray(value) ? value[0] : value;
  if (!offer || typeof offer !== "object") {
    return { price: null, currency: null };
  }

  const payload = offer as Record<string, unknown>;
  return {
    price: parsePrice(payload.price ?? payload.lowPrice),
    currency: typeof payload.priceCurrency === "string" ? payload.priceCurrency : null,
  };
}

function collectG2aProducts(value: unknown, products: MarketTitleEntry[]) {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item) => collectG2aProducts(item, products));
    return;
  }

  const payload = value as Record<string, unknown>;
  const type = payload["@type"];
  const types = Array.isArray(type) ? type : [type];
  const isProduct = types.some((entry) => typeof entry === "string" && entry.toLowerCase() === "product");
  const name = firstString(payload.name);

  if (isProduct && name) {
    const offer = offerFrom(payload.offers);
    products.push({
      title: cleanMarketTitle(name),
      image: firstString(payload.image),
      price: offer.price,
      currency: offer.currency,
      productId: firstString(payload.sku) ?? firstString(payload.productID) ?? null,
    });
  }

  Object.values(payload).forEach((item) => collectG2aProducts(item, products));
}

function extractJsonLd(html: string) {
  const scripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const products: MarketTitleEntry[] = [];

  for (const script of scripts) {
    try {
      collectG2aProducts(JSON.parse(script[1] ?? ""), products);
    } catch {
      // Some marketplace pages ship partial JSON-LD; skip malformed blocks.
    }
  }

  return products;
}

function extractG2aEntries(html: string) {
  const jsonLdProducts = extractJsonLd(html);
  if (jsonLdProducts.length > 0) return uniqueEntries(jsonLdProducts).slice(0, 10);

  const matches = Array.from(html.matchAll(/Image:\s*([^<\n]+)/g));
  return uniqueTitles(matches.map((match) => cleanMarketTitle(match[1] ?? "")))
    .slice(0, 10)
    .map((title) => ({ title }));
}

function extractSteamEntries(html: string) {
  const matches = Array.from(html.matchAll(/href="\/app\/(\d+)\/[^"]*">([^<]+)<\/a>/g));
  return uniqueEntries(
    matches.map((match) => ({
      title: cleanMarketTitle(match[2] ?? ""),
      steamAppId: match[1] ?? null,
    }))
  ).slice(0, 10);
}

function g2aApiCredentials() {
  const hash = process.env.G2A_API_HASH;
  const apiKey = process.env.G2A_API_KEY;
  if (!hash || !apiKey) return null;

  return {
    baseUrl: G2A_API_BASE_URL.replace(/\/$/, ""),
    authorization: `${hash}, ${apiKey}`,
  };
}

function normalizeG2aApiProduct(product: G2aApiProduct): MarketTitleEntry | null {
  if (!product.name) return null;
  const normalizedName = product.name.toLowerCase();
  const isBlocked = g2aBlockedTitleTerms.some((term) => normalizedName.includes(term));
  if (isBlocked) return null;

  const isGame =
    !product.categories ||
    product.categories.length === 0 ||
    product.categories.some((category) => category.name?.toLowerCase() === "games" || category.id === 189);

  if (!isGame) return null;
  if (typeof product.minPrice !== "number" || product.minPrice <= 0) return null;

  return {
    title: cleanMarketTitle(product.name),
    image: product.coverImage ?? product.smallImage ?? product.thumbnail ?? null,
    platform: product.platform || "PC / Marketplace",
    price: parsePrice(product.minPrice),
    currency: "EUR",
    productId: product.id ?? null,
  };
}

async function fetchG2aApiEntries(page: number, fallbackUrl: string, fallback: string[]) {
  const credentials = g2aApiCredentials();
  if (!credentials) {
    return fetchHtmlEntries(fallbackUrl, extractG2aEntries, fallback);
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      min_qty: "1",
    });
    const response = await fetch(`${credentials.baseUrl}/v1/products?${params}`, {
      headers: {
        accept: "application/json",
        authorization: credentials.authorization,
      },
      next: { revalidate: MARKET_PULSE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`G2A API responded with ${response.status}`);

    const payload = (await response.json()) as G2aApiProductsResponse;
    const entries = uniqueEntries(
      (payload.docs ?? [])
        .filter((product) => typeof product.qty !== "number" || product.qty > 0)
        .map(normalizeG2aApiProduct)
        .filter((entry): entry is MarketTitleEntry => Boolean(entry))
    ).slice(0, 10);

    return {
      fallbackUsed: entries.length === 0,
      entries: entries.length > 0 ? entries : fallback.map((title) => ({ title })),
    };
  } catch {
    return fetchHtmlEntries(fallbackUrl, extractG2aEntries, fallback);
  }
}

async function fetchHtmlEntries(
  url: string,
  extractor: (html: string) => MarketTitleEntry[],
  fallback: string[]
) {
  try {
    const response = await fetch(url, {
      headers: {
        "accept-language": "en-US,en;q=0.9",
        "user-agent": "GameZoneMarketPulse/1.0",
      },
      next: { revalidate: MARKET_PULSE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Market pulse responded with ${response.status}`);

    const entries = extractor(await response.text());
    return {
      fallbackUsed: entries.length === 0,
      entries: entries.length > 0 ? entries : fallback.map((title) => ({ title, steamAppId: steamSnapshotAppIds[title] ?? null })),
    };
  } catch {
    return {
      fallbackUsed: true,
      entries: fallback.map((title) => ({ title, steamAppId: steamSnapshotAppIds[title] ?? null })),
    };
  }
}

async function fetchSteamPrice(appId: string): Promise<SteamPrice> {
  try {
    const params = new URLSearchParams({
      appids: appId,
      cc: "es",
      l: "spanish",
      filters: "basic,price_overview",
    });
    const response = await fetch(`${STEAM_APPDETAILS_URL}?${params}`, {
      next: { revalidate: MARKET_PULSE_CACHE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`Steam appdetails responded with ${response.status}`);

    const payload = (await response.json()) as Record<
      string,
      {
        success?: boolean;
        data?: {
          is_free?: boolean;
          price_overview?: {
            final?: number;
            currency?: string;
          };
          header_image?: string;
        };
      }
    >;
    const data = payload[appId]?.data;
    const final = data?.price_overview?.final;

    return {
      price: typeof final === "number" ? Number((final / 100).toFixed(2)) : null,
      currency: data?.price_overview?.currency ?? null,
      isFree: Boolean(data?.is_free),
      image: data?.header_image ?? null,
    };
  } catch {
    return {
      price: null,
      currency: null,
      isFree: false,
      image: null,
    };
  }
}

async function fetchSteamPrices(entries: MarketTitleEntry[]) {
  const appIds = Array.from(
    new Set(entries.map((entry) => entry.steamAppId).filter((appId): appId is string => Boolean(appId)))
  );
  const pairs = await Promise.all(appIds.map(async (appId) => [appId, await fetchSteamPrice(appId)] as const));
  return new Map(pairs);
}

function createPulseItems(input: {
  entries: MarketTitleEntry[];
  products: StoreProduct[];
  source: PulseSource;
  sourceUrl: string;
  signal: string;
  steamPrices?: Map<string, SteamPrice>;
}) {
  return input.entries.map((entry, index) => {
    const title = entry.title;
    const match = findBestCatalogMatch(input.products, title);
    const product = match && match.matchScore >= CATALOG_MATCH_SYNC_SCORE ? match.product : null;
    const steamPrice = entry.steamAppId ? input.steamPrices?.get(entry.steamAppId) : null;

    return {
      rank: index + 1,
      title,
      image: product?.coverImage ?? entry.image ?? steamPrice?.image ?? fallbackImage(input.products, index),
      platform: entry.platform ?? product?.platform ?? "PC / Marketplace",
      signal: input.signal,
      source: input.source,
      sourceUrl: input.sourceUrl,
      catalogStatus: product ? "En catalogo" : "Oportunidad de inventario",
      catalogMatch: createCatalogMatch(product, product ? match?.matchScore ?? 0 : 0),
      gameZonePrice: product ? computeDiscountedPrice(product.priceOriginal, product.discountPercent) : null,
      g2aPrice: input.source === "G2A" ? (entry.price ?? null) : null,
      g2aCurrency: input.source === "G2A" ? (entry.currency ?? null) : null,
      steamAppId: entry.steamAppId ?? null,
      steamPrice: steamPrice?.price ?? null,
      steamCurrency: steamPrice?.currency ?? null,
      steamIsFree: steamPrice?.isFree ?? false,
    } satisfies MarketPulseItem;
  });
}

export async function listMarketPulse() {
  const products = await listActiveProducts();
  const [g2aPopular, g2aBestsellers, steamTopSellers, steamMostPlayed, rawgTrending] =
    await Promise.all([
      fetchG2aApiEntries(1, G2A_POPULAR_URL, g2aPopularSnapshot),
      fetchG2aApiEntries(2, G2A_BESTSELLERS_URL, g2aBestsellerSnapshot),
      fetchHtmlEntries(STEAM_TOP_SELLERS_URL, extractSteamEntries, steamTopSellerSnapshot),
      fetchHtmlEntries(STEAM_MOST_PLAYED_URL, extractSteamEntries, steamMostPlayedSnapshot),
      listMarketTrendingGames(10),
    ]);
  const [steamTopSellerPrices, steamMostPlayedPrices] = await Promise.all([
    fetchSteamPrices(steamTopSellers.entries),
    fetchSteamPrices(steamMostPlayed.entries),
  ]);

  const rawgItems = rawgTrending.trending.map((item) => ({
    rank: item.rank,
    title: item.title,
    image: item.image,
    platform: item.platform,
    signal: item.signal,
    source: "RAWG" as const,
    sourceUrl: "https://rawg.io/",
    catalogStatus: item.catalogMatch.matched ? "En catalogo" : "Oportunidad de inventario",
    catalogMatch: item.catalogMatch,
    gameZonePrice:
      item.catalogMatch.priceOriginal !== null && item.catalogMatch.discountPercent !== null
        ? computeDiscountedPrice(item.catalogMatch.priceOriginal, item.catalogMatch.discountPercent)
        : null,
    g2aPrice: null,
    g2aCurrency: null,
    steamAppId: null,
    steamPrice: null,
    steamCurrency: null,
    steamIsFree: false,
  })) satisfies MarketPulseItem[];

  return {
    fallbackUsed:
      g2aPopular.fallbackUsed ||
      g2aBestsellers.fallbackUsed ||
      steamTopSellers.fallbackUsed ||
      steamMostPlayed.fallbackUsed ||
      rawgTrending.fallbackUsed,
    sections: [
      {
        id: "g2a-popular",
        title: "Populares en G2A",
        source: "G2A",
        sourceUrl: G2A_POPULAR_URL,
        signal: "Ranking publico de marketplace",
        fallbackUsed: g2aPopular.fallbackUsed,
        items: createPulseItems({
          entries: g2aPopular.entries,
          products,
          source: "G2A",
          sourceUrl: G2A_POPULAR_URL,
          signal: "Popularidad marketplace",
        }),
      },
      {
        id: "g2a-bestsellers",
        title: "Mas vendidos en G2A",
        source: "G2A",
        sourceUrl: G2A_BESTSELLERS_URL,
        signal: "Bestsellers de G2A",
        fallbackUsed: g2aBestsellers.fallbackUsed,
        items: createPulseItems({
          entries: g2aBestsellers.entries,
          products,
          source: "G2A",
          sourceUrl: G2A_BESTSELLERS_URL,
          signal: "Bestseller marketplace",
        }),
      },
      {
        id: "steam-top-sellers",
        title: "Top sellers en Steam",
        source: "Steam",
        sourceUrl: STEAM_TOP_SELLERS_URL,
        signal: "Ventas por ingresos",
        fallbackUsed: steamTopSellers.fallbackUsed,
        items: createPulseItems({
          entries: steamTopSellers.entries,
          products,
          source: "Steam",
          sourceUrl: STEAM_TOP_SELLERS_URL,
          signal: "Ingresos Steam",
          steamPrices: steamTopSellerPrices,
        }),
      },
      {
        id: "steam-most-played",
        title: "Mas jugados en Steam",
        source: "Steam",
        sourceUrl: STEAM_MOST_PLAYED_URL,
        signal: "Actividad de jugadores",
        fallbackUsed: steamMostPlayed.fallbackUsed,
        items: createPulseItems({
          entries: steamMostPlayed.entries,
          products,
          source: "Steam",
          sourceUrl: STEAM_MOST_PLAYED_URL,
          signal: "Jugadores activos",
          steamPrices: steamMostPlayedPrices,
        }),
      },
      {
        id: "rawg-radar",
        title: "Radar RAWG",
        source: "RAWG",
        sourceUrl: "https://rawg.io/",
        signal: "Popularidad y metadata",
        fallbackUsed: rawgTrending.fallbackUsed,
        items: rawgItems,
      },
    ] satisfies MarketPulseSection[],
    cacheSeconds: Math.min(MARKET_PULSE_CACHE_SECONDS, RAWG_TRENDING_CACHE_SECONDS),
  };
}

import { listActiveProducts, type StoreProduct } from "@/lib/products";
import { createCatalogMatch, findBestCatalogMatch, type MarketCatalogMatch } from "@/lib/market/catalog-match";
import { listMarketTrendingGames, RAWG_TRENDING_CACHE_SECONDS } from "@/lib/market/trending";

export const MARKET_PULSE_CACHE_SECONDS = 1800;

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
const STEAM_TOP_SELLERS_URL = "https://steamdb.info/stats/globaltopsellers/";
const STEAM_MOST_PLAYED_URL = "https://steamdb.info/charts/";

const g2aPopularSnapshot = ["Forza Horizon 6", "Minecraft: Java & Bedrock Edition", "Red Dead Redemption 2"];
const g2aBestsellerSnapshot = [
  "Minecraft Java Edition",
  "The Elder Scrolls V: Skyrim Special Edition",
  "Grand Theft Auto V Enhanced",
];
const steamTopSellerSnapshot = ["Counter-Strike 2", "Forza Horizon 6", "Apex Legends"];
const steamMostPlayedSnapshot = ["Counter-Strike 2", "PUBG: BATTLEGROUNDS", "Apex Legends"];

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

function uniqueTitles(titles: string[]) {
  const seen = new Set<string>();
  return titles.filter((title) => {
    const normalized = title.toLowerCase();
    if (!title || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function extractG2aTitles(html: string) {
  const matches = Array.from(html.matchAll(/Image:\s*([^<\n]+)/g));
  return uniqueTitles(matches.map((match) => cleanMarketTitle(match[1] ?? ""))).slice(0, 3);
}

function extractSteamTitles(html: string) {
  const matches = Array.from(html.matchAll(/href="\/app\/\d+\/[^"]*">([^<]+)<\/a>/g));
  return uniqueTitles(matches.map((match) => cleanMarketTitle(match[1] ?? ""))).slice(0, 3);
}

async function fetchHtmlTitles(
  url: string,
  extractor: (html: string) => string[],
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

    const titles = extractor(await response.text());
    return {
      fallbackUsed: titles.length === 0,
      titles: titles.length > 0 ? titles : fallback,
    };
  } catch {
    return {
      fallbackUsed: true,
      titles: fallback,
    };
  }
}

function createPulseItems(input: {
  titles: string[];
  products: StoreProduct[];
  source: PulseSource;
  sourceUrl: string;
  signal: string;
}) {
  return input.titles.map((title, index) => {
    const match = findBestCatalogMatch(input.products, title);
    const product = match?.product;

    return {
      rank: index + 1,
      title,
      image: product?.coverImage ?? fallbackImage(input.products, index),
      platform: product?.platform ?? "PC / Marketplace",
      signal: input.signal,
      source: input.source,
      sourceUrl: input.sourceUrl,
      catalogStatus: product ? "En catalogo" : "Oportunidad de inventario",
      catalogMatch: createCatalogMatch(product, match?.matchScore ?? 0),
    } satisfies MarketPulseItem;
  });
}

export async function listMarketPulse() {
  const products = await listActiveProducts();
  const [g2aPopular, g2aBestsellers, steamTopSellers, steamMostPlayed, rawgTrending] =
    await Promise.all([
      fetchHtmlTitles(G2A_POPULAR_URL, extractG2aTitles, g2aPopularSnapshot),
      fetchHtmlTitles(G2A_BESTSELLERS_URL, extractG2aTitles, g2aBestsellerSnapshot),
      fetchHtmlTitles(STEAM_TOP_SELLERS_URL, extractSteamTitles, steamTopSellerSnapshot),
      fetchHtmlTitles(STEAM_MOST_PLAYED_URL, extractSteamTitles, steamMostPlayedSnapshot),
      listMarketTrendingGames(3),
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
          titles: g2aPopular.titles,
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
          titles: g2aBestsellers.titles,
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
          titles: steamTopSellers.titles,
          products,
          source: "Steam",
          sourceUrl: STEAM_TOP_SELLERS_URL,
          signal: "Ingresos Steam",
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
          titles: steamMostPlayed.titles,
          products,
          source: "Steam",
          sourceUrl: STEAM_MOST_PLAYED_URL,
          signal: "Jugadores activos",
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

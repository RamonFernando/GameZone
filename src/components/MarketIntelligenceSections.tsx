"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatPublicPrice } from "@/lib/public-price";
import type { ProductPreview } from "@/types/product";

type DataSourcePreview = {
  name: string;
  source: string;
  route: string;
  fields: string[];
};

type TrendingGamePreview = {
  rank: number;
  title: string;
  image: string;
  platform: string;
  signal: string;
  source: string;
  trendScore?: number;
  gameZoneMatch: string;
};

type MarketPulseItem = {
  rank: number;
  title: string;
  image: string;
  platform: string;
  signal: string;
  source: string;
  sourceUrl: string;
  catalogStatus: string;
  gameZonePrice?: number | null;
  g2aPrice?: number | null;
  g2aCurrency?: string | null;
  steamPrice?: number | null;
  steamCurrency?: string | null;
  steamIsFree?: boolean;
  rawgSlug?: string | null;
  catalogMatch?: {
    id?: string | null;
    slug?: string | null;
    title?: string | null;
    image?: string | null;
    platform?: string | null;
    priceOriginal?: number | null;
    discountPercent?: number | null;
  };
};

type MarketPulseSection = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  signal: string;
  fallbackUsed: boolean;
  items: MarketPulseItem[];
};

type MarketPulseResponse = {
  source?: string;
  sections?: MarketPulseSection[];
};

type DealPreview = {
  title: string;
  image: string;
  store: string;
  dealPrice: number;
  gameZonePrice: number;
  saving: number;
  sourceId: string;
  sourceUrl?: string;
  catalogMatch?: {
    slug: string;
  };
};

type MarketDealsResponse = {
  source?: string;
  deals?: DealPreview[];
};

type RecommendationPreview = {
  score: number;
  reason: string;
  title: string;
  slug: string;
  image: string;
  platform: string;
  priceFinal: number;
  discountPercent: number;
  priceSignal: string;
  trendScore: number;
  nextAction: {
    label: string;
    href: string;
  };
};

type MarketRecommendationsResponse = {
  source?: string;
  recommendations?: RecommendationPreview[];
};

const dataSources: DataSourcePreview[] = [
  {
    name: "Precios externos",
    source: "CheapShark",
    route: "/api/market/deals",
    fields: ["title", "store", "salePrice", "normalPrice"],
  },
  {
    name: "Tendencias",
    source: "Steam + RAWG",
    route: "/api/market/trending",
    fields: ["rank", "steamAppId", "players", "rating"],
  },
  {
    name: "Metadata",
    source: "RAWG / IGDB",
    route: "/api/market/games/:slug",
    fields: ["cover", "genres", "platforms", "released"],
  },
  {
    name: "Recomendaciones",
    source: "GameZone IA",
    route: "/api/recommendations",
    fields: ["catalogMatch", "priceSignal", "trendScore"],
  },
];

const fallbackTrendingGames: TrendingGamePreview[] = [
  {
    rank: 1,
    title: "Hogwarts Legacy",
    image: "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg",
    platform: "PC / Steam",
    signal: "Popularidad alta",
    source: "Steam trends",
    gameZoneMatch: "Disponible en catalogo",
  },
  {
    rank: 2,
    title: "God of War - Ragnarok",
    image: "/games_data/God of War - Ragnarok/god-of-war-ragnarok-ps5-cover.jpg",
    platform: "PlayStation / PC",
    signal: "Demanda estable",
    source: "RAWG rating",
    gameZoneMatch: "Disponible en catalogo",
  },
  {
    rank: 3,
    title: "Marvel's Spider-Man - Miles Morales",
    image: "/games_data/Marvel's Spider-Man - Miles Morales/marvel-s-spider-man-miles-morales-cover.jpg",
    platform: "PC / PlayStation",
    signal: "Interes en oferta",
    source: "Busqueda + ventas",
    gameZoneMatch: "Disponible en catalogo",
  },
];

const fallbackPulseSections: MarketPulseSection[] = [
  {
    id: "g2a-popular",
    title: "Populares en G2A",
    source: "G2A",
    sourceUrl: "https://www.g2a.com/category/games-c189?sort=bestsellers-first",
    signal: "Ranking publico de marketplace",
    fallbackUsed: true,
    items: fallbackTrendingGames.map((game) => ({
      rank: game.rank,
      title: game.title,
      image: game.image,
      platform: game.platform,
      signal: "Popularidad marketplace",
      source: "G2A",
      sourceUrl: "https://www.g2a.com/category/games-c189?sort=bestsellers-first",
      catalogStatus: game.gameZoneMatch,
    })),
  },
  {
    id: "steam-top-sellers",
    title: "Top sellers en Steam",
    source: "Steam",
    sourceUrl: "https://steamdb.info/stats/globaltopsellers/",
    signal: "Ventas por ingresos",
    fallbackUsed: true,
    items: fallbackTrendingGames.map((game) => ({
      rank: game.rank,
      title: game.title,
      image: game.image,
      platform: game.platform,
      signal: "Ingresos Steam",
      source: "Steam",
      sourceUrl: "https://steamdb.info/stats/globaltopsellers/",
      catalogStatus: game.gameZoneMatch,
    })),
  },
  {
    id: "rawg-radar",
    title: "Radar RAWG",
    source: "RAWG",
    sourceUrl: "https://rawg.io/",
    signal: "Popularidad y metadata",
    fallbackUsed: true,
    items: fallbackTrendingGames.map((game) => ({
      rank: game.rank,
      title: game.title,
      image: game.image,
      platform: game.platform,
      signal: game.signal,
      source: "RAWG",
      sourceUrl: "https://rawg.io/",
      catalogStatus: game.gameZoneMatch,
    })),
  },
];

const fallbackDeals: DealPreview[] = [
  {
    title: "Hogwarts Legacy",
    image: "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg",
    store: "Steam",
    dealPrice: 21.49,
    gameZonePrice: 24.99,
    saving: 14,
    sourceId: "cheapshark:612",
  },
  {
    title: "Resident Evil 4 Deluxe Edition",
    image: "/games_data/Resident Evil 4 Deluxe Edition/resident-evil-4-deluxe-edition-deluxe-cover.jpeg",
    store: "External Store",
    dealPrice: 34.79,
    gameZonePrice: 39.99,
    saving: 13,
    sourceId: "cheapshark:887",
  },
  {
    title: "Marvel's Spider-Man - Miles Morales",
    image: "/games_data/Marvel's Spider-Man - Miles Morales/marvel-s-spider-man-miles-morales-cover.jpg",
    store: "PC marketplace",
    dealPrice: 27.95,
    gameZonePrice: 29.99,
    saving: 7,
    sourceId: "cheapshark:430",
  },
];

const fallbackRecommendations: RecommendationPreview[] = [
  {
    score: 92,
    reason: "15% de descuento activo, popular en el catalogo GameZone",
    title: "Hogwarts Legacy",
    slug: "hogwarts-legacy",
    image: "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg",
    platform: "PC",
    priceFinal: 24.99,
    discountPercent: 15,
    priceSignal: "discounted",
    trendScore: 80,
    nextAction: {
      label: "Ver ficha",
      href: "/games/hogwarts-legacy",
    },
  },
  {
    score: 88,
    reason: "popular en el catalogo GameZone, disponible para compra inmediata",
    title: "God of War - Ragnarok",
    slug: "god-of-war-ragnarok",
    image: "/games_data/God of War - Ragnarok/god-of-war-ragnarok-ps5-cover.jpg",
    platform: "PlayStation",
    priceFinal: 59.49,
    discountPercent: 15,
    priceSignal: "discounted",
    trendScore: 72,
    nextAction: {
      label: "Ver ficha",
      href: "/games/god-of-war-ragnarok",
    },
  },
  {
    score: 84,
    reason: "15% de descuento activo, senal de tendencia alta",
    title: "Marvel's Spider-Man - Miles Morales",
    slug: "marvel-s-spider-man-miles-morales",
    image: "/games_data/Marvel's Spider-Man - Miles Morales/marvel-s-spider-man-miles-morales-cover.jpg",
    platform: "PC",
    priceFinal: 29.99,
    discountPercent: 15,
    priceSignal: "discounted",
    trendScore: 78,
    nextAction: {
      label: "Ver ficha",
      href: "/games/marvel-s-spider-man-miles-morales",
    },
  },
];

function formatEuro(value: number) {
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function buildCartPreview(game: MarketPulseItem): ProductPreview | null {
  const match = game.catalogMatch;
  if (!match?.slug) return null;

  const discountPercent = match.discountPercent ?? 0;
  const priceOriginal =
    match.priceOriginal ??
    (typeof game.gameZonePrice === "number" ? game.gameZonePrice : 0);
  const priceFinal =
    typeof game.gameZonePrice === "number"
      ? game.gameZonePrice
      : priceOriginal * (1 - discountPercent / 100);

  return {
    id: match.id ?? match.slug,
    name: match.title ?? game.title,
    slug: match.slug,
    description: `Compra digital de ${match.title ?? game.title}.`,
    coverImage: match.image ?? game.image,
    platform: match.platform ?? game.platform,
    region: "EUROPA",
    storeLabel: "GameZone",
    cardSubtitle: "Codigo digital oficial",
    priceOriginal,
    discountPercent,
    cashbackPercent: 0,
    likesCount: 0,
    priceFinal,
    stock: 99,
  };
}

function openCartDrawer() {
  window.dispatchEvent(new Event("gamezone:cart-open"));
}

const PULSE_ROTATE_MS = 8000;

function MarketPulseCarousel({
  section,
  variant = "hero",
  thumbCount = 5,
}: {
  section: MarketPulseSection;
  variant?: "hero" | "compact" | "catalog";
  thumbCount?: 3 | 5;
}) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbsEntering, setThumbsEntering] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setThumbsEntering(false);
  }, [section.id, section.items.length]);

  useEffect(() => {
    if (variant === "compact") {
      return;
    }

    if (section.items.length < 2) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % section.items.length);
      setThumbsEntering(true);
    }, PULSE_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [section.id, section.items.length, variant]);

  useEffect(() => {
    if (!thumbsEntering) {
      return;
    }

    const timer = window.setTimeout(() => {
      setThumbsEntering(false);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [thumbsEntering]);

  const active = section.items[activeIndex] ?? section.items[0];
  const visibleThumbs = useMemo(() => {
    if (section.items.length === 0) {
      return [];
    }

    const positions =
      thumbCount === 3
        ? ([
            { name: "left", offset: -1 },
            { name: "center", offset: 0 },
            { name: "right", offset: 1 },
          ] as const)
        : ([
            { name: "far-left", offset: -2 },
            { name: "left", offset: -1 },
            { name: "center", offset: 0 },
            { name: "right", offset: 1 },
            { name: "far-right", offset: 2 },
          ] as const);

    return positions.map(({ name, offset }) => {
      const realIndex = (activeIndex + offset + section.items.length) % section.items.length;

      return {
        ...section.items[realIndex],
        position: name,
        realIndex,
      };
    });
  }, [activeIndex, section.items, thumbCount]);
  const [heroLayers, setHeroLayers] = useState<{
    current: string;
    previous: string;
    animate: boolean;
  }>({
    current: active?.image ?? "",
    previous: "",
    animate: true,
  });

  useEffect(() => {
    if (variant !== "hero" || !active) {
      return;
    }

    let cancelled = false;

    setHeroLayers((current) => ({
      current: active.image,
      previous: current.current,
      animate: false,
    }));

    const enterTimer = window.setTimeout(() => {
      if (cancelled) return;
      setHeroLayers((current) => ({
        ...current,
        animate: true,
      }));
    }, 16);

    const cleanupTimer = window.setTimeout(() => {
      if (cancelled) return;
      setHeroLayers((current) => ({
        current: current.current,
        previous: "",
        animate: true,
      }));
    }, 520);

    return () => {
      cancelled = true;
      window.clearTimeout(enterTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [active?.image, variant]);

  if (!active) {
    return null;
  }

  if (variant === "catalog") {
    return (
      <article className="market-pulse-carousel market-pulse-carousel--catalog">
        <div className="market-pulse-catalog-grid" aria-label={`${section.title} cards`}>
          {section.items.slice(0, 5).map((game) => {
            const href = game.catalogMatch?.slug ? `/games/${game.catalogMatch.slug}` : null;
            const cartPreview = buildCartPreview(game);
            const content = (
              <>
                <span className="market-pulse-catalog-card__media">
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 220px, 45vw" />
                  <span className="market-pulse-catalog-card__store">
                    {section.source === "Steam" ? (
                      <Image
                        src="/iconos_platforms/icon-steam.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    ) : null}
                    {section.source}
                  </span>
                </span>
                <span className="market-pulse-catalog-card__body">
                  <strong>{game.title}</strong>
                  <span>Codigo digital oficial</span>
                  <small>{game.platform}</small>
                  <span className="market-pulse-catalog-card__prices">
                    <span>
                      <small>GameZone</small>
                      <strong>
                        {typeof game.gameZonePrice === "number" ? formatEuro(game.gameZonePrice) : "Sin match"}
                      </strong>
                    </span>
                    <span>
                      <small>{section.source === "G2A" ? "G2A" : "Steam"}</small>
                      <strong>
                        {section.source === "G2A"
                          ? typeof game.g2aPrice === "number"
                            ? formatEuro(game.g2aPrice)
                            : "No disponible"
                          : game.steamIsFree
                            ? "Gratis"
                            : typeof game.steamPrice === "number"
                              ? formatEuro(game.steamPrice)
                              : "No disponible"}
                      </strong>
                    </span>
                  </span>
                  <em>#{game.rank} {section.source === "Steam" ? "mas jugado" : "mas vendido"}</em>
                </span>
              </>
            );

            return href ? (
              <article
                className="market-pulse-catalog-card"
                key={`${section.id}-${game.rank}-${game.title}`}
              >
                <Link className="market-pulse-card-link" href={href}>
                  {content}
                </Link>
                {cartPreview ? (
                  <button
                    type="button"
                    className="game-detail-cart-button market-pulse-card-cart"
                    onClick={() => {
                      addToCart(cartPreview);
                      openCartDrawer();
                    }}
                    aria-label={`Añadir ${cartPreview.name} al carrito`}
                    title="Añadir al carrito"
                  >
                    <Image
                      src="/iconos_platforms/carritoCompra2.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                  </button>
                ) : null}
              </article>
            ) : (
              <article className="market-pulse-catalog-card" key={`${section.id}-${game.rank}-${game.title}`}>
                {content}
              </article>
            );
          })}
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    const compactCount = Math.min(4, section.items.length);
    const centeredItems = Array.from({ length: compactCount }, (_, offset) => {
      const realIndex = (activeIndex + offset) % section.items.length;
      return { ...section.items[realIndex], realIndex };
    });

    return (
      <article className="market-pulse-carousel market-pulse-carousel--compact">
        <div className="market-pulse-carousel__compact-strip" aria-label={`${section.title} cards`}>
          {centeredItems.map((game) => {
            const href = game.catalogMatch?.slug ? `/games/${game.catalogMatch.slug}` : null;
            const cartPreview = buildCartPreview(game);
            const content = (
              <>
                <span className="market-pulse-compact-card__media">
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 220px, 45vw" />
                </span>
                <span className="market-pulse-compact-card__copy">
                  <strong>{game.title}</strong>
                  <small>{game.platform}</small>
                </span>
              </>
            );

            return href ? (
              <article
                key={`${section.id}-${game.rank}-${game.title}`}
                className="market-pulse-compact-card"
              >
                <Link className="market-pulse-card-link" href={href}>
                  {content}
                </Link>
                {cartPreview ? (
                  <button
                    type="button"
                    className="game-detail-cart-button market-pulse-card-cart"
                    onClick={() => {
                      addToCart(cartPreview);
                      openCartDrawer();
                    }}
                    aria-label={`Añadir ${cartPreview.name} al carrito`}
                    title="Añadir al carrito"
                  >
                    <Image
                      src="/iconos_platforms/carritoCompra2.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                  </button>
                ) : null}
              </article>
            ) : (
              <article
                key={`${section.id}-${game.rank}-${game.title}`}
                className="market-pulse-compact-card"
              >
                {content}
              </article>
            );
          })}
        </div>
      </article>
    );
  }

  // Matcheado -> ficha de catalogo (con compra). RAWG sin catalogo -> ficha interna de info.
  const activeHref = active.catalogMatch?.slug
    ? `/games/${active.catalogMatch.slug}`
    : active.rawgSlug
      ? `/games/rawg/${active.rawgSlug}`
      : null;

  return (
    <article className="market-pulse-carousel">
      <div
        className={`market-pulse-carousel__hero${
          activeHref ? " market-pulse-carousel__hero--clickable" : ""
        }`}
        onClick={activeHref ? () => router.push(activeHref) : undefined}
      >
        {heroLayers.previous ? (
          <div className="market-pulse-carousel__media market-pulse-carousel__media--previous is-visible">
            <Image
              src={heroLayers.previous}
              alt=""
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              quality={95}
              unoptimized={section.source === "G2A"}
            />
          </div>
        ) : null}
        <div
          className={`market-pulse-carousel__media market-pulse-carousel__media--current${
            heroLayers.animate ? " is-visible" : ""
          }`}
        >
          <Image
            src={heroLayers.current || active.image}
            alt=""
            fill
            sizes="(min-width: 1280px) 1200px, 100vw"
            quality={95}
            unoptimized={section.source === "G2A"}
          />
        </div>
        <div className="market-pulse-carousel__overlay">
          <div className="market-pulse-carousel__topline">
            <span>{section.source}</span>
            <strong>{active.catalogStatus}</strong>
          </div>
          <h4>{active.title}</h4>
          <p>{active.signal}</p>
          <div className="market-pulse-carousel__meta">
            <span>{active.platform}</span>
            <span>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</span>
          </div>
        </div>
      </div>

      <div className="market-pulse-carousel__thumbs-wrap">
        <div
          className={
            "market-pulse-carousel__thumbs market-pulse-carousel__thumbs--slider" +
            (thumbCount === 3 ? " market-pulse-carousel__thumbs--three" : "") +
            (thumbsEntering && thumbCount === 5 ? " is-entering-left" : "")
          }
          aria-label={`${section.title} thumbnails`}
        >
          {visibleThumbs.map((game) => {
            const isActiveThumb = game.realIndex === activeIndex;

            return (
              <button
                key={`${section.id}-${game.position}-${game.rank}-${game.title}`}
                type="button"
                className={
                  `market-pulse-thumb market-pulse-thumb--${game.position}` +
                  (isActiveThumb ? " is-active" : "")
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setActiveIndex(game.realIndex);
                  setThumbsEntering(true);
                }}
                aria-label={`Mostrar ${game.title}`}
              >
                <span className="market-pulse-thumb__media">
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 240px, 45vw" />
                </span>
                <span className="market-pulse-thumb__copy">
                  <strong>{game.title}</strong>
                  <small>{game.platform}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function MarketIntelligenceSections() {
  const [marketDeals, setMarketDeals] = useState<DealPreview[]>(fallbackDeals);
  const [marketPulseSections, setMarketPulseSections] =
    useState<MarketPulseSection[]>(fallbackPulseSections);
  const [marketRecommendations, setMarketRecommendations] =
    useState<RecommendationPreview[]>(fallbackRecommendations);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [dealsSource, setDealsSource] = useState("mock");
  const [recommendationsSource, setRecommendationsSource] = useState("mock");
  const [dealsError, setDealsError] = useState("");
  const [recommendationsError, setRecommendationsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMarketDeals() {
      try {
        setIsLoadingDeals(true);
        const response = await fetch("/api/market/deals?limit=3");
        if (!response.ok) {
          throw new Error("No se pudieron cargar ofertas de mercado.");
        }

        const payload = (await response.json()) as MarketDealsResponse;
        const nextDeals = payload.deals?.filter((deal) => deal.title && deal.image) ?? [];

        if (!cancelled && nextDeals.length > 0) {
          setMarketDeals(nextDeals);
          setDealsSource(payload.source ?? "api");
          setDealsError("");
        }
      } catch {
        if (!cancelled) {
          setMarketDeals(fallbackDeals);
          setDealsSource("fallback");
          setDealsError("Mostrando fallback local");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDeals(false);
        }
      }
    }

    void loadMarketDeals();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketPulse() {
      try {
        const response = await fetch("/api/market/pulse");
        if (!response.ok) {
          throw new Error("No se pudo cargar el pulso de mercado.");
        }

        const payload = (await response.json()) as MarketPulseResponse;
        const nextSections =
          payload.sections
            ?.map((section) => ({
              ...section,
              items: section.items.filter((item) => item.title && item.image),
            }))
            .filter((section) => section.items.length > 0) ?? [];

        if (!cancelled && nextSections.length > 0) {
          setMarketPulseSections(nextSections);
        }
      } catch {
        if (!cancelled) {
          setMarketPulseSections(fallbackPulseSections);
        }
      }
    }

    void loadMarketPulse();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      try {
        setIsLoadingRecommendations(true);
        const response = await fetch("/api/recommendations?limit=3");
        if (!response.ok) {
          throw new Error("No se pudieron cargar recomendaciones.");
        }

        const payload = (await response.json()) as MarketRecommendationsResponse;
        const nextRecommendations =
          payload.recommendations?.filter((item) => item.title && item.image) ?? [];

        if (!cancelled && nextRecommendations.length > 0) {
          setMarketRecommendations(nextRecommendations);
          setRecommendationsSource(payload.source ?? "api");
          setRecommendationsError("");
        }
      } catch {
        if (!cancelled) {
          setMarketRecommendations(fallbackRecommendations);
          setRecommendationsSource("fallback");
          setRecommendationsError("Mostrando fallback local");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecommendations(false);
        }
      }
    }

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, []);

  const dealStatus = useMemo(() => {
    if (isLoadingDeals) return "Cargando API";
    if (dealsError) return dealsError;
    return dealsSource.includes("gamezone") ? "API + fallback" : "CheapShark";
  }, [dealsError, dealsSource, isLoadingDeals]);

  const recommendationsStatus = useMemo(() => {
    if (isLoadingRecommendations) return "Cargando API";
    if (recommendationsError) return recommendationsError;
    return recommendationsSource.includes("rawg") ? "Catalogo + RAWG" : "Catalogo GameZone";
  }, [isLoadingRecommendations, recommendationsError, recommendationsSource]);

  const g2aSections = marketPulseSections.filter((section) => section.source === "G2A");
  const steamSections = marketPulseSections.filter((section) => section.source === "Steam");
  const rawgSections = marketPulseSections.filter((section) => section.source === "RAWG");

  return (
    <div className="market-intel-stack">
      <section className="market-intel market-intel--popular" aria-label="Fuentes de tendencias de mercado">
        <div className="market-pulse-source-stack">
          <section className="market-pulse-source-panel market-pulse-source-panel--g2a" aria-labelledby="g2a-panel-title">
            <div className="market-pulse-panel__head">
              <span>G2A</span>
              <div>
                <h2 id="g2a-panel-title">G2A</h2>
                <p>Populares y mas vendidos</p>
              </div>
            </div>

            <div className="market-pulse-section-stack">
              {g2aSections.map((section) => (
                <article
                  className={
                    "market-pulse-subsection" +
                    (section.title.toLowerCase().includes("mas vendidos")
                      ? " market-pulse-subsection--bestsellers"
                      : " market-pulse-subsection--featured")
                  }
                  key={section.id}
                >
                  <div className="market-pulse-subsection__head">
                    <h3>{section.title}</h3>
                    <span>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</span>
                  </div>
                  <MarketPulseCarousel
                    section={section}
                    variant={section.title.toLowerCase().includes("mas vendidos") ? "catalog" : "hero"}
                    thumbCount={5}
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="market-pulse-source-panel market-pulse-source-panel--steam" aria-labelledby="steam-panel-title">
            <div className="market-pulse-panel__head">
              <span>Steam</span>
              <div>
                <h2 id="steam-panel-title">Steam</h2>
                <p>Top sellers y mas jugados</p>
              </div>
            </div>

            <div className="market-pulse-section-stack">
              {steamSections.map((section) => (
                <article className="market-pulse-subsection" key={section.id}>
                  <div className="market-pulse-subsection__head">
                    <h3>{section.title}</h3>
                    <span>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</span>
                  </div>
                  <MarketPulseCarousel
                    section={section}
                    variant={section.title.toLowerCase().includes("mas jugados") ? "catalog" : "hero"}
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="market-pulse-source-panel market-pulse-source-panel--rawg" aria-labelledby="rawg-panel-title">
            <div className="market-pulse-panel__head">
              <span>RAWG</span>
              <div>
                <h2 id="rawg-panel-title">RAWG</h2>
                <p>Radar de popularidad y metadata</p>
              </div>
            </div>

            <div className="market-pulse-section-stack">
              {rawgSections.map((section) => (
                <article className="market-pulse-subsection" key={section.id}>
                  <div className="market-pulse-subsection__head">
                    <h3>{section.title}</h3>
                    <span>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</span>
                  </div>
                  <MarketPulseCarousel section={section} />
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="market-intel market-intel--roadmap" aria-labelledby="market-roadmap-title">
        <div className="market-intel-head market-intel-head--compact">
          <span className="market-intel-kicker">Motor de mercado</span>
          <div>
            <h2 id="market-roadmap-title" className="section-title market-intel-title">
              Precios, ofertas, metadata y recomendaciones
            </h2>
            <p className="section-subtitle market-intel-copy">
              Debajo quedan las piezas que se conectaran despues a rutas internas:
              ofertas normalizadas y modulos tecnicos para alimentar la IA.
            </p>
          </div>
        </div>

        <div className="market-engine-grid">
          <div className="deals-panel">
            <div className="market-panel-header">
              <span className="market-panel-label">Comparador</span>
              <div>
                <h3>Ofertas normalizadas</h3>
                <p className="market-panel-status">{dealStatus}</p>
              </div>
            </div>

            <div className="deal-list">
              {marketDeals.map((deal) => (
                <article className="deal-row" key={deal.title}>
                  <div className="deal-cover">
                    <Image src={deal.image} alt="" fill sizes="64px" />
                  </div>
                  <div className="deal-info">
                    <h4>{deal.title}</h4>
                    <p>{deal.store}</p>
                    <code>{deal.sourceId}</code>
                  </div>
                  <div className="deal-price">
                    <span className="deal-discount">-{deal.saving}%</span>
                    <strong>{formatEuro(deal.dealPrice)}</strong>
                    <small>GameZone {formatEuro(deal.gameZonePrice)}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="recommendation-panel">
            <div className="market-panel-header">
              <span className="market-panel-label">Recomendador</span>
              <div>
                <h3>Selecciones por senales</h3>
                <p className="market-panel-status">{recommendationsStatus}</p>
              </div>
            </div>

            <div className="recommendation-list">
              {marketRecommendations.map((item) => (
                <article className="recommendation-card" key={item.slug}>
                  <div className="recommendation-cover">
                    <Image src={item.image} alt="" fill sizes="72px" />
                  </div>
                  <div className="recommendation-body">
                    <div className="recommendation-top">
                      <h4>{item.title}</h4>
                      <strong>{item.score}</strong>
                    </div>
                    <p>{item.reason}</p>
                    <div className="recommendation-meta">
                      <span>{item.platform}</span>
                      <span>{formatPublicPrice(item.priceFinal)}</span>
                      <span>Trend {item.trendScore}</span>
                    </div>
                    <Link className="recommendation-link" href={item.nextAction.href}>
                      {item.nextAction.label}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

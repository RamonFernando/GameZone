"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatPublicPrice } from "@/lib/public-price";
import type { ProductPreview } from "@/types/product";
import styles from "./MarketIntelligenceSections.module.scss";

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
    genres: [],
  };
}

function openCartDrawer() {
  window.dispatchEvent(new Event("gamezone:cart-open"));
}

const PULSE_ROTATE_MS = 8000;

const THUMB_POSITION_CLASS: Record<string, string> = {
  center: styles.marketPulseThumbCenter,
  left: styles.marketPulseThumbLeft,
  right: styles.marketPulseThumbRight,
  "far-left": styles.marketPulseThumbFarLeft,
  "far-right": styles.marketPulseThumbFarRight,
  entering: styles.marketPulseThumbEntering,
};

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
      <article className={`${styles.marketPulseCarousel} ${styles.marketPulseCarouselCatalog}`}>
        <div className={styles.marketPulseCatalogGrid} aria-label={`${section.title} cards`}>
          {section.items.slice(0, 5).map((game) => {
            const href = game.catalogMatch?.slug ? `/games/${game.catalogMatch.slug}` : null;
            const cartPreview = buildCartPreview(game);
            const content = (
              <>
                <span className={styles.marketPulseCatalogCardMedia}>
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 220px, 45vw" />
                  <span className={styles.marketPulseCatalogCardStore}>
                    {(() => {
                      const icons: Record<string, string> = {
                        Steam: "/iconos_platforms/icon-steam.svg",
                        G2A:   "/iconos_platforms/icon-g2a.svg",
                        Xbox:  "/iconos_platforms/icon-xbox.svg",
                      };
                      const icon = icons[section.source];
                      return icon ? <Image src={icon} alt="" width={14} height={14} /> : null;
                    })()}
                    {section.source}
                  </span>
                </span>
                <span className={styles.marketPulseCatalogCardBody}>
                  <strong>{game.title}</strong>
                  <span>Codigo digital oficial</span>
                  <small>{game.platform}</small>
                  <span className={styles.marketPulseCatalogCardPrices}>
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
                className={styles.marketPulseCatalogCard}
                key={`${section.id}-${game.rank}-${game.title}`}
              >
                <Link className={styles.marketPulseCardLink} href={href}>
                  {content}
                </Link>
                {cartPreview ? (
                  <button
                    type="button"
                    className={`game-detail-cart-button ${styles.marketPulseCardCart}`}
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
              <article className={styles.marketPulseCatalogCard} key={`${section.id}-${game.rank}-${game.title}`}>
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
      <article className={`${styles.marketPulseCarousel} ${styles.marketPulseCarouselCompact}`}>
        <div className={styles.marketPulseCarouselCompactStrip} aria-label={`${section.title} cards`}>
          {centeredItems.map((game) => {
            const href = game.catalogMatch?.slug ? `/games/${game.catalogMatch.slug}` : null;
            const cartPreview = buildCartPreview(game);
            const content = (
              <>
                <span className={styles.marketPulseCompactCardMedia}>
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 220px, 45vw" />
                </span>
                <span className={styles.marketPulseCompactCardCopy}>
                  <strong>{game.title}</strong>
                  <small>{game.platform}</small>
                </span>
              </>
            );

            return href ? (
              <article
                key={`${section.id}-${game.rank}-${game.title}`}
                className={styles.marketPulseCompactCard}
              >
                <Link className={styles.marketPulseCardLink} href={href}>
                  {content}
                </Link>
                {cartPreview ? (
                  <button
                    type="button"
                    className={`game-detail-cart-button ${styles.marketPulseCardCart}`}
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
                className={styles.marketPulseCompactCard}
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
    <article className={styles.marketPulseCarousel}>
      <div
        className={`${styles.marketPulseCarouselHero}${activeHref ? ` ${styles.marketPulseCarouselHeroClickable}` : ""}`}
        onClick={activeHref ? () => router.push(activeHref) : undefined}
      >
        {heroLayers.previous ? (
          <div className={`${styles.marketPulseCarouselMedia} ${styles.marketPulseCarouselMediaPrevious} ${styles.isVisible}`}>
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
          className={`${styles.marketPulseCarouselMedia} ${styles.marketPulseCarouselMediaCurrent}${heroLayers.animate ? ` ${styles.isVisible}` : ""}`}
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
        <div className={styles.marketPulseCarouselOverlay}>
          <div className={styles.marketPulseCarouselTopline}>
            <span>{section.source}</span>
            <strong>{active.catalogStatus}</strong>
          </div>
          <h4>{active.title}</h4>
          <p>{active.signal}</p>
          <div className={styles.marketPulseCarouselMeta}>
            <span>{active.platform}</span>
            <span>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</span>
          </div>
        </div>
      </div>

      <div className={styles.marketPulseCarouselThumbsWrap}>
        <div
          className={`${styles.marketPulseCarouselThumbs} ${styles.marketPulseCarouselThumbsSlider}${thumbCount === 3 ? ` ${styles.marketPulseCarouselThumbsThree}` : ""}${thumbsEntering && thumbCount === 5 ? ` ${styles.isEnteringLeft}` : ""}`}
          aria-label={`${section.title} thumbnails`}
        >
          {visibleThumbs.map((game) => {
            const isActiveThumb = game.realIndex === activeIndex;

            return (
              <button
                key={`${section.id}-${game.position}-${game.rank}-${game.title}`}
                type="button"
                className={`${styles.marketPulseThumb} ${THUMB_POSITION_CLASS[game.position] ?? ""}${isActiveThumb ? ` ${styles.isActive}` : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setActiveIndex(game.realIndex);
                  setThumbsEntering(true);
                }}
                aria-label={`Mostrar ${game.title}`}
              >
                <span className={styles.marketPulseThumbMedia}>
                  <Image src={game.image} alt="" fill sizes="(min-width: 1280px) 240px, 45vw" />
                </span>
                <span className={styles.marketPulseThumbCopy}>
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
    <div className={styles.marketIntelStack}>
      <section className={`${styles.marketIntel} ${styles.marketIntelPopular}`} aria-label="Fuentes de tendencias de mercado">
        <div className={styles.marketPulseSourceStack}>
          <section className={`${styles.marketPulseSourcePanel} ${styles.marketPulseSourcePanelG2a}`} aria-labelledby="g2a-panel-title">
            <div className={styles.marketPulsePanelHead}>
              <span>G2A</span>
              <div>
                <h2 id="g2a-panel-title">G2A</h2>
                <p>Populares y mas vendidos</p>
              </div>
            </div>

            <div className={styles.marketPulseSectionStack}>
              {g2aSections.map((section) => (
                <article
                  className={`${styles.marketPulseSubsection}${section.title.toLowerCase().includes("mas vendidos") ? ` ${styles.marketPulseSubsectionBestsellers}` : ` ${styles.marketPulseSubsectionFeatured}`}`}
                  key={section.id}
                >
                  <div className={styles.marketPulseSubsectionHead}>
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

          <section className={`${styles.marketPulseSourcePanel} ${styles.marketPulseSourcePanelSteam}`} aria-labelledby="steam-panel-title">
            <div className={styles.marketPulsePanelHead}>
              <span>Steam</span>
              <div>
                <h2 id="steam-panel-title">Steam</h2>
                <p>Top sellers y mas jugados</p>
              </div>
            </div>

            <div className={styles.marketPulseSectionStack}>
              {steamSections.map((section) => (
                <article className={styles.marketPulseSubsection} key={section.id}>
                  <div className={styles.marketPulseSubsectionHead}>
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

          <section className={`${styles.marketPulseSourcePanel} ${styles.marketPulseSourcePanelRawg}`} aria-labelledby="rawg-panel-title">
            <div className={styles.marketPulsePanelHead}>
              <span>RAWG</span>
              <div>
                <h2 id="rawg-panel-title">RAWG</h2>
                <p>Radar de popularidad y metadata</p>
              </div>
            </div>

            <div className={styles.marketPulseSectionStack}>
              {rawgSections.map((section) => (
                <article className={styles.marketPulseSubsection} key={section.id}>
                  <div className={styles.marketPulseSubsectionHead}>
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

      <section className={`${styles.marketIntel} ${styles.marketIntelRoadmap}`} aria-labelledby="market-roadmap-title">
        <div className={`${styles.marketIntelHead} ${styles.marketIntelHeadCompact}`}>
          <span className={styles.marketIntelKicker}>Motor de mercado</span>
          <div>
            <h2 id="market-roadmap-title" className={`section-title ${styles.marketIntelTitle}`}>
              Precios, ofertas, metadata y recomendaciones
            </h2>
            <p className={`section-subtitle ${styles.marketIntelCopy}`}>
              Debajo quedan las piezas que se conectaran despues a rutas internas:
              ofertas normalizadas y modulos tecnicos para alimentar la IA.
            </p>
          </div>
        </div>

        <div className={styles.marketEngineGrid}>
          <div className={styles.dealsPanel}>
            <div className={styles.marketPanelHeader}>
              <span className={styles.marketPanelLabel}>Comparador</span>
              <div>
                <h3>Ofertas normalizadas</h3>
                <p className={styles.marketPanelStatus}>{dealStatus}</p>
              </div>
            </div>

            <div className={styles.dealList}>
              {marketDeals.map((deal) => (
                <article className={styles.dealRow} key={deal.title}>
                  <div className={styles.dealCover}>
                    <Image src={deal.image} alt="" fill sizes="64px" />
                  </div>
                  <div className={styles.dealInfo}>
                    <h4>{deal.title}</h4>
                    <p>{deal.store}</p>
                    <code>{deal.sourceId}</code>
                  </div>
                  <div className={styles.dealPrice}>
                    <span className={styles.dealDiscount}>-{deal.saving}%</span>
                    <strong>{formatEuro(deal.dealPrice)}</strong>
                    <small>GameZone {formatEuro(deal.gameZonePrice)}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.recommendationPanel}>
            <div className={styles.marketPanelHeader}>
              <span className={styles.marketPanelLabel}>Recomendador</span>
              <div>
                <h3>Selecciones por senales</h3>
                <p className={styles.marketPanelStatus}>{recommendationsStatus}</p>
              </div>
            </div>

            <div className={styles.recommendationList}>
              {marketRecommendations.map((item) => (
                <article className={styles.recommendationCard} key={item.slug}>
                  <div className={styles.recommendationCover}>
                    <Image src={item.image} alt="" fill sizes="72px" />
                  </div>
                  <div className={styles.recommendationBody}>
                    <div className={styles.recommendationTop}>
                      <h4>{item.title}</h4>
                      <strong>{item.score}</strong>
                    </div>
                    <p>{item.reason}</p>
                    <div className={styles.recommendationMeta}>
                      <span>{item.platform}</span>
                      <span>{formatPublicPrice(item.priceFinal)}</span>
                      <span>Trend {item.trendScore}</span>
                    </div>
                    <Link className={styles.recommendationLink} href={item.nextAction.href}>
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

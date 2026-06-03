"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export function MarketIntelligenceSections() {
  const [marketDeals, setMarketDeals] = useState<DealPreview[]>(fallbackDeals);
  const [marketPulseSections, setMarketPulseSections] =
    useState<MarketPulseSection[]>(fallbackPulseSections);
  const [marketRecommendations, setMarketRecommendations] =
    useState<RecommendationPreview[]>(fallbackRecommendations);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingPulse, setIsLoadingPulse] = useState(true);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);
  const [dealsSource, setDealsSource] = useState("mock");
  const [pulseSource, setPulseSource] = useState("mock");
  const [recommendationsSource, setRecommendationsSource] = useState("mock");
  const [dealsError, setDealsError] = useState("");
  const [pulseError, setPulseError] = useState("");
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
        setIsLoadingPulse(true);
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
          setPulseSource(payload.source ?? "api");
          setPulseError("");
        }
      } catch {
        if (!cancelled) {
          setMarketPulseSections(fallbackPulseSections);
          setPulseSource("fallback");
          setPulseError("Mostrando fallback local");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPulse(false);
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

  const pulseStatus = useMemo(() => {
    if (isLoadingPulse) return "Cargando API";
    if (pulseError) return pulseError;
    return pulseSource.includes("fallback") ? "API + snapshots" : "G2A + Steam + RAWG";
  }, [isLoadingPulse, pulseError, pulseSource]);

  const recommendationsStatus = useMemo(() => {
    if (isLoadingRecommendations) return "Cargando API";
    if (recommendationsError) return recommendationsError;
    return recommendationsSource.includes("rawg") ? "Catalogo + RAWG" : "Catalogo GameZone";
  }, [isLoadingRecommendations, recommendationsError, recommendationsSource]);

  return (
    <div className="market-intel-stack">
      <section className="market-intel market-intel--intro" aria-labelledby="market-intel-title">
        <div className="market-intel-head market-intel-head--split">
          <div>
            <span className="market-intel-kicker">Datos externos</span>
            <h2 id="market-intel-title" className="section-title market-intel-title">
              Fuentes preparadas para conectar APIs
            </h2>
          </div>
          <p className="section-subtitle market-intel-copy">
            Esta seccion define que datos necesita GameZone antes de conectarlos: fuente,
            ruta interna y campos esperados. Asi la interfaz ya nace lista para cambiar los
            mocks por respuestas reales.
          </p>
        </div>

        <div className="data-source-grid">
          {dataSources.map((item) => (
            <article className="data-source-card" key={item.name}>
              <div className="data-source-top">
                <span>{item.source}</span>
                <strong>{item.name}</strong>
              </div>
              <code>{item.route}</code>
              <div className="data-field-list">
                {item.fields.map((field) => (
                  <span key={field}>{field}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="market-intel market-intel--popular" aria-labelledby="popular-games-title">
        <div className="market-intel-head market-intel-head--compact">
          <span className="market-intel-kicker">Market Intelligence v2</span>
          <div>
            <h2 id="popular-games-title" className="section-title market-intel-title">
              Pulso real separado por fuente
            </h2>
            <p className="market-panel-status">{pulseStatus}</p>
            <p className="section-subtitle market-intel-copy">
              G2A, Steam y RAWG se leen por separado para saber que es venta,
              actividad o metadata antes de cruzarlo con el catalogo GameZone.
            </p>
          </div>
        </div>

        <div className="market-pulse-grid">
          {marketPulseSections.map((section) => (
            <article className="market-pulse-panel" key={section.id}>
              <div className="market-pulse-panel__head">
                <span>{section.source}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>{section.fallbackUsed ? "Snapshot + cache" : section.signal}</p>
                </div>
              </div>

              <div className="market-pulse-list">
                {section.items.map((game) => (
                  <div className="market-pulse-row" key={`${section.id}-${game.rank}-${game.title}`}>
                    <div className="market-pulse-cover">
                      <Image src={game.image} alt="" fill sizes="56px" />
                    </div>
                    <div className="market-pulse-body">
                      <div className="market-pulse-title">
                        <strong>#{game.rank}</strong>
                        <h4>{game.title}</h4>
                      </div>
                      <p>{game.signal}</p>
                      <div className="market-pulse-meta">
                        <span>{game.platform}</span>
                        <span>{game.catalogStatus}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
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
                      <span>{formatEuro(item.priceFinal)}</span>
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

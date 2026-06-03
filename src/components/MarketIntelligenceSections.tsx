"use client";

import Image from "next/image";
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

type MarketTrendingResponse = {
  source?: string;
  trending?: TrendingGamePreview[];
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

type PipelinePreview = {
  title: string;
  route: string;
  purpose: string;
  fields: string;
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

const pipeline: PipelinePreview[] = [
  {
    title: "Precios y ofertas",
    route: "/api/market/deals",
    purpose: "Comparar GameZone contra tiendas externas.",
    fields: "dealPrice, store, saving, sourceUrl",
  },
  {
    title: "Metadata de juegos",
    route: "/api/market/games",
    purpose: "Enriquecer cards, fichas y filtros.",
    fields: "cover, genres, tags, platforms, ratings",
  },
  {
    title: "Recomendaciones",
    route: "/api/recommendations",
    purpose: "Sugerir juegos usando catalogo, precio y tendencia.",
    fields: "score, reason, catalogMatch, nextAction",
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
  const [marketTrendingGames, setMarketTrendingGames] =
    useState<TrendingGamePreview[]>(fallbackTrendingGames);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [dealsSource, setDealsSource] = useState("mock");
  const [trendingSource, setTrendingSource] = useState("mock");
  const [dealsError, setDealsError] = useState("");
  const [trendingError, setTrendingError] = useState("");

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

    async function loadMarketTrending() {
      try {
        setIsLoadingTrending(true);
        const response = await fetch("/api/market/trending?limit=3");
        if (!response.ok) {
          throw new Error("No se pudieron cargar tendencias de mercado.");
        }

        const payload = (await response.json()) as MarketTrendingResponse;
        const nextTrending =
          payload.trending?.filter((game) => game.title && game.image) ?? [];

        if (!cancelled && nextTrending.length > 0) {
          setMarketTrendingGames(nextTrending);
          setTrendingSource(payload.source ?? "api");
          setTrendingError("");
        }
      } catch {
        if (!cancelled) {
          setMarketTrendingGames(fallbackTrendingGames);
          setTrendingSource("fallback");
          setTrendingError("Mostrando fallback local");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTrending(false);
        }
      }
    }

    void loadMarketTrending();

    return () => {
      cancelled = true;
    };
  }, []);

  const dealStatus = useMemo(() => {
    if (isLoadingDeals) return "Cargando API";
    if (dealsError) return dealsError;
    return dealsSource.includes("gamezone") ? "API + fallback" : "CheapShark";
  }, [dealsError, dealsSource, isLoadingDeals]);

  const trendingStatus = useMemo(() => {
    if (isLoadingTrending) return "Cargando API";
    if (trendingError) return trendingError;
    return trendingSource.includes("rawg") ? "RAWG" : "GameZone fallback";
  }, [isLoadingTrending, trendingError, trendingSource]);

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
          <span className="market-intel-kicker">Tendencias</span>
          <div>
            <h2 id="popular-games-title" className="section-title market-intel-title">
              Populares para cruzar con el catalogo
            </h2>
            <p className="market-panel-status">{trendingStatus}</p>
            <p className="section-subtitle market-intel-copy">
              Cards compactas con campos que puede devolver una API de tendencias:
              ranking, fuente, plataforma y coincidencia con GameZone.
            </p>
          </div>
        </div>

        <div className="trending-grid">
          {marketTrendingGames.map((game) => (
            <article className="trending-card" key={game.title}>
              <div className="trending-cover">
                <Image src={game.image} alt="" fill sizes="(min-width: 720px) 33vw, 96px" />
              </div>
              <div className="trending-body">
                <div className="trending-rank">#{game.rank}</div>
                <h3>{game.title}</h3>
                <dl>
                  <div>
                    <dt>Fuente</dt>
                    <dd>{game.source}</dd>
                  </div>
                  <div>
                    <dt>Senal</dt>
                    <dd>{game.signal}</dd>
                  </div>
                  {typeof game.trendScore === "number" ? (
                    <div>
                      <dt>Score</dt>
                      <dd>{game.trendScore}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Plataforma</dt>
                    <dd>{game.platform}</dd>
                  </div>
                </dl>
                <span className="catalog-match">{game.gameZoneMatch}</span>
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

          <div className="pipeline-grid" aria-label="Tecnologias existentes para facilitar el trabajo de la IA">
            {pipeline.map((step) => (
              <article className="pipeline-card" key={step.title}>
                <h3>{step.title}</h3>
                <code>{step.route}</code>
                <p>{step.purpose}</p>
                <span>{step.fields}</span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

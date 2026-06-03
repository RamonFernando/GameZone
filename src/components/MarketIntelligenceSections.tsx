"use client";

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
  gameZoneMatch: string;
};

type DealPreview = {
  title: string;
  image: string;
  store: string;
  dealPrice: string;
  gameZonePrice: string;
  saving: string;
  sourceId: string;
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

const trendingGames: TrendingGamePreview[] = [
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

const dealPreviews: DealPreview[] = [
  {
    title: "Hogwarts Legacy",
    image: "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg",
    store: "Steam",
    dealPrice: "21,49 EUR",
    gameZonePrice: "24,99 EUR",
    saving: "-14%",
    sourceId: "cheapshark:612",
  },
  {
    title: "Resident Evil 4 Deluxe Edition",
    image: "/games_data/Resident Evil 4 Deluxe Edition/resident-evil-4-deluxe-edition-deluxe-cover.jpeg",
    store: "External Store",
    dealPrice: "34,79 EUR",
    gameZonePrice: "39,99 EUR",
    saving: "-13%",
    sourceId: "cheapshark:887",
  },
  {
    title: "Marvel's Spider-Man - Miles Morales",
    image: "/games_data/Marvel's Spider-Man - Miles Morales/marvel-s-spider-man-miles-morales-cover.jpg",
    store: "PC marketplace",
    dealPrice: "27,95 EUR",
    gameZonePrice: "29,99 EUR",
    saving: "-7%",
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

export function MarketIntelligenceSections() {
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
            <p className="section-subtitle market-intel-copy">
              Cards compactas con campos que puede devolver una API de tendencias:
              ranking, fuente, plataforma y coincidencia con GameZone.
            </p>
          </div>
        </div>

        <div className="trending-grid">
          {trendingGames.map((game) => (
            <article className="trending-card" key={game.title}>
              <div className="trending-cover">
                <img src={game.image} alt="" loading="lazy" decoding="async" />
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
              <h3>Ofertas normalizadas</h3>
            </div>

            <div className="deal-list">
              {dealPreviews.map((deal) => (
                <article className="deal-row" key={deal.title}>
                  <div className="deal-cover">
                    <img src={deal.image} alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="deal-info">
                    <h4>{deal.title}</h4>
                    <p>{deal.store}</p>
                    <code>{deal.sourceId}</code>
                  </div>
                  <div className="deal-price">
                    <span className="deal-discount">{deal.saving}</span>
                    <strong>{deal.dealPrice}</strong>
                    <small>GameZone {deal.gameZonePrice}</small>
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

// Ficha de SOLO INFORMACION para juegos del Radar RAWG que no estan en el catalogo.
// No tiene compra: muestra datos traidos de RAWG y enlaces externos.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRawgGameMetadataBySlug } from "@/lib/market/games";

export const dynamic = "force-dynamic";

export default async function RawgGameInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getRawgGameMetadataBySlug(slug);

  if (!result) {
    notFound();
  }

  const game = result.game;
  const cover = game.backgroundImage || game.cover || "";

  const specs = [
    { label: "Desarrollador", value: game.developer },
    { label: "Editor", value: game.publisher },
    {
      label: "Lanzamiento",
      value: game.released ? new Date(game.released).toLocaleDateString("es-ES") : null,
    },
    { label: "Plataformas", value: game.platforms.length ? game.platforms.join(", ") : null },
    { label: "Generos", value: game.genres.length ? game.genres.join(", ") : null },
    { label: "Valoracion RAWG", value: game.rating != null ? `${game.rating} / 5` : null },
    { label: "Metacritic", value: game.metacritic != null ? String(game.metacritic) : null },
  ].filter((spec) => spec.value);

  return (
    <main className="main-wrapper">
      <div className="game-detail-shell">
        <div className="card game-detail-card">
          {/* IMAGEN */}
          <div className="game-detail-media-stack">
            <div className="game-detail-media">
              {cover ? (
                <Image
                  src={cover}
                  alt={game.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 960px"
                  quality={100}
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </div>
          </div>

          {/* INFO */}
          <div>
            <span className="badge-soft">Radar RAWG · informativo</span>
            <h1 className="game-detail-title">{game.title}</h1>

            {game.tags.length > 0 ? (
              <div className="game-detail-chip-row">
                {game.tags.slice(0, 8).map((tag) => (
                  <span key={tag} className="game-detail-chip">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="game-detail-copy">
              Este juego no esta disponible en el catalogo de GameZone. Te mostramos su
              informacion desde RAWG.
            </p>

            {specs.length > 0 ? (
              <dl className="game-detail-specs">
                {specs.map((item) => (
                  <div key={item.label} className="game-detail-spec">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="game-detail-back">
              <Link href="/" className="button-ghost btn-padding-site">
                ← Volver
              </Link>
            </div>
          </div>
        </div>

        {(game.longDescription || game.website) && (
          <section className="game-detail-extra">
            <div className="card game-detail-info-card">
              <h2 className="section-title">Informacion adicional</h2>
              {game.longDescription ? (
                <p className="game-detail-copy">{game.longDescription}</p>
              ) : null}
              <div className="game-detail-links">
                <span className="game-detail-links-label">Enlaces</span>
                <div className="game-detail-links-row">
                  <a
                    href={`https://rawg.io/games/${game.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="game-detail-link"
                  >
                    <span aria-hidden="true">🌐</span>
                    Ver en RAWG
                  </a>
                  {game.website ? (
                    <a
                      href={game.website}
                      target="_blank"
                      rel="noreferrer"
                      className="game-detail-link"
                    >
                      <span aria-hidden="true">🌐</span>
                      Web oficial
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

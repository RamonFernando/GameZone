"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { useCart } from "@/contexts/CartContext";
import { formatPublicPrice } from "@/lib/public-price";
import type { ProductPreview } from "@/types/product";

function SteamIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.39 3.39 0 0 1 1.912-.59c.063 0 .125.004.188.006l2.861-4.142v-.059a4.526 4.526 0 0 1 4.524-4.524 4.526 4.526 0 0 1 4.524 4.527 4.526 4.526 0 0 1-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159a3.396 3.396 0 0 1-3.39 3.396 3.4 3.4 0 0 1-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61a2.553 2.553 0 0 0 1.314 1.25 2.566 2.566 0 0 0 3.332-1.375 2.55 2.55 0 0 0 .005-1.949 2.554 2.554 0 0 0-1.377-1.383 2.56 2.56 0 0 0-1.878-.03l1.523.63a1.884 1.884 0 0 1 1.009 2.455 1.882 1.882 0 0 1-2.454 1.012zm11.415-9.303a3.018 3.018 0 0 0-3.015-3.015 3.019 3.019 0 0 0-3.015 3.015 3.019 3.019 0 0 0 3.015 3.015 3.018 3.018 0 0 0 3.015-3.015zm-5.273-.005a2.265 2.265 0 0 1 2.265-2.266 2.266 2.266 0 1 1 0 4.531 2.265 2.265 0 0 1-2.265-2.265z" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M8 13h8" />
    </svg>
  );
}

type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  longDescription: string | null;
  releaseDate: string | null;
  developer: string | null;
  publisher: string | null;
  genres: string[];
  platforms: string[];
  tags: string[];
  stores: string[];
  screenshots: string[];
  backgroundImage: string | null;
  website: string | null;
  externalStoreLabel: string | null;
  externalStoreUrl: string | null;
  esrbRating: string | null;
  metacritic: number | null;
  rating: number | null;
  ratingsCount: number;
  playtimeHours: number | null;
  requirements: string | null;
  metadataSource: string | null;
  metadataUpdatedAt: string | null;
  priceOriginal: number;
  discountPercent: number;
  priceFinal: number;
};

function formatDate(value: string | null, lang: "es" | "en") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function GameDetailPage() {
  const router = useRouter();
  const routeParams = useParams<{ slug: string | string[] }>();
  const { addToCart } = useCart();
  const [game, setGame] = useState<ProductView | null>(null);
  const [suggestions, setSuggestions] = useState<ProductView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lang = useLocale();
  useScrollMemory(!isLoading);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const slugParam = routeParams?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

	  useEffect(() => {
	    if (!slug) return;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
          setGame(null);
          return;
        }
        const payload = (await response.json()) as {
          product?: ProductView;
          suggestions?: ProductView[];
        };
        setGame(payload.product ?? null);
        setSuggestions(payload.suggestions ?? []);
      } catch {
        setGame(null);
      } finally {
        setIsLoading(false);
      }
    };
	
	    void loadProduct();
	  }, [slug]);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [game?.slug]);

  useEffect(() => {
    if (!game) return;
    const mediaCount = [game.backgroundImage || game.coverImage, ...game.screenshots].filter(Boolean).length;
    if (mediaCount < 2) return;

    const timer = window.setInterval(() => {
      setSelectedMediaIndex((current) => (current + 1) % mediaCount);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [game]);

  if (!slug) {
    return (
      <main className="main-wrapper">
        <p className="section-subtitle">
          {lang === "en" ? "Loading game details..." : "Cargando detalle del juego..."}
        </p>
      </main>
    );
  }

  if (!isLoading && !game) {
    return notFound();
  }

  if (isLoading || !game) {
    return (
      <main className="main-wrapper">
        <p className="section-subtitle">
          {lang === "en" ? "Loading game details..." : "Cargando detalle del juego..."}
        </p>
      </main>
    );
  }

  const isEnglish = lang === "en";
  const isUnchartedLegacySlug = game.slug === "uncharted-coleccio-un-legado-de-los-ladrones";
  const localizedName =
    isEnglish && isUnchartedLegacySlug ? "Uncharted - Legacy of Thieves Collection" : game.name;

  const fallbackDescription =
    (isEnglish ? "Digital purchase of " : "Compra digital de ") + localizedName + ".";
	  const detailDescription = game.longDescription || game.description || fallbackDescription;
	  const releaseDate = formatDate(game.releaseDate, lang);
	  const heroImage = game.backgroundImage || game.coverImage;
  const mediaImages = Array.from(new Set([heroImage, ...game.screenshots].filter(Boolean)));
  const selectedMedia = mediaImages[selectedMediaIndex] ?? heroImage;
	  const tagsToShow = [...game.genres, ...game.platforms].slice(0, 8);
  const specs = [
    { label: isEnglish ? "Platform" : "Plataforma", value: game.platform },
    { label: isEnglish ? "Activation" : "Activacion", value: game.region },
    { label: isEnglish ? "Store" : "Tienda", value: game.storeLabel },
    { label: isEnglish ? "Type" : "Tipo", value: game.cardSubtitle },
    { label: isEnglish ? "Developer" : "Desarrollador", value: game.developer },
    { label: isEnglish ? "Publisher" : "Editor", value: game.publisher },
    { label: isEnglish ? "Release date" : "Lanzamiento", value: releaseDate },
    {
      label: isEnglish ? "Rating" : "Valoracion",
      value: game.rating ? `${game.rating.toFixed(1)} / 5` : null,
    },
    { label: "Metacritic", value: game.metacritic ? String(game.metacritic) : null },
    {
      label: isEnglish ? "Playtime" : "Duracion",
      value: game.playtimeHours
        ? `${game.playtimeHours} ${isEnglish ? "hours" : "horas"}`
        : null,
    },
  ].filter((item) => item.value);

  const mainPreview: ProductPreview = {
    id: game.id,
    name: localizedName,
    slug: game.slug,
    description: detailDescription,
    coverImage: game.coverImage,
    platform: "PC",
    region: isEnglish ? "EUROPE" : "EUROPA",
    storeLabel: "Steam",
    cardSubtitle: "",
    priceOriginal: game.priceOriginal,
    discountPercent: game.discountPercent,
    cashbackPercent: 0,
    likesCount: 0,
    priceFinal: game.priceFinal,
    stock: 99,
  };

  return (
    <main className="main-wrapper">
    <div className="game-detail-shell">
      <div className="card game-detail-card">

	        {/* IMAGEN */}
        <div className="game-detail-media-stack">
          <div className="game-detail-media">
            <Image
              src={selectedMedia}
              alt={game.name}
              fill
              sizes="(max-width: 1024px) 100vw, 960px"
              quality={100}
              unoptimized
              style={{ objectFit: "cover" }}
            />
          </div>

          {mediaImages.length > 1 ? (
            <div className="game-detail-media-thumbs" aria-label={isEnglish ? "Game images" : "Imagenes del juego"}>
              {mediaImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={
                    "game-detail-media-thumb" +
                    (index === selectedMediaIndex ? " game-detail-media-thumb--active" : "")
                  }
                  onClick={() => setSelectedMediaIndex(index)}
                  aria-label={`${isEnglish ? "Show image" : "Mostrar imagen"} ${index + 1}`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="120px"
                    quality={80}
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* INFO */}
        <div>
	          <h1 className="game-detail-title">{localizedName}</h1>
	
	          {tagsToShow.length > 0 ? (
	            <div className="game-detail-chip-row">
	              {tagsToShow.map((tag) => (
	                <span key={tag} className="game-detail-chip">
	                  {tag}
	                </span>
	              ))}
	            </div>
	          ) : null}

	          <p className="game-detail-copy">{detailDescription}</p>
          <p className="game-detail-copy game-detail-price-line">
            {lang === "en" ? "Price: " : "Precio: "}
            {game.discountPercent > 0 ? (
              <>
                <span className="game-detail-price-old">
                  {formatPublicPrice(game.priceOriginal, lang)}
                </span>
                <strong className="game-detail-price-final">
                  {formatPublicPrice(game.priceFinal, lang)}
                </strong>
                <span className="game-detail-price-discount">-{game.discountPercent}%</span>
              </>
            ) : (
              <strong className="game-detail-price-final">
                {formatPublicPrice(game.priceFinal, lang)}
              </strong>
	            )}
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

          {/* 🔥 BOTÓN VOLVER ABAJO DERECHA */}
          <div className="game-detail-back">
            <button
              type="button"
              className="game-detail-cart-button"
              onClick={() => addToCart(mainPreview)}
              aria-label={lang === "en" ? "Add to cart" : "Añadir al carrito"}
              title={lang === "en" ? "Add to cart" : "Añadir al carrito"}
            >
              <Image
                src="/iconos_platforms/carritoCompra2.svg"
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="button-ghost btn-padding-site"
              onClick={() => router.push("/")}
            >
              {lang === "en" ? "← Back" : "← Volver"}
            </button>
          </div>
        </div>

	      </div>

	      {(game.requirements || game.website || game.externalStoreUrl) && (
	        <section className="game-detail-extra">
	          <div className="card game-detail-info-card">
	            <h2 className="section-title">
	              {isEnglish ? "Additional information" : "Informacion adicional"}
	            </h2>
	            {game.requirements ? (
	              <pre className="game-detail-requirements">{game.requirements}</pre>
	            ) : null}
	            {(game.website || game.externalStoreUrl) && (
	              <div className="game-detail-links">
	                <span className="game-detail-links-label">
	                  {isEnglish ? "Links" : "Enlaces"}
	                </span>
	                <div className="game-detail-links-row">
	                  {game.website ? (
	                    <a
	                      href={game.website}
	                      target="_blank"
	                      rel="noreferrer"
	                      className="game-detail-link"
	                    >
	                      <span aria-hidden="true">🌐</span>
	                      {isEnglish ? "Official website" : "Web oficial"}
	                    </a>
	                  ) : null}
	                  {game.externalStoreUrl ? (
	                    <a
	                      href={game.externalStoreUrl}
	                      target="_blank"
	                      rel="noreferrer"
	                      className={`game-detail-link${
	                        game.externalStoreLabel?.toLowerCase().includes("steam")
	                          ? " game-detail-link--steam"
	                          : ""
	                      }`}
	                    >
	                      {game.externalStoreLabel?.toLowerCase().includes("steam") ? (
	                        <SteamIcon />
	                      ) : (
	                        <StoreIcon />
	                      )}
	                      {isEnglish
	                        ? `View on ${game.externalStoreLabel ?? "store"}`
	                        : `Ver en ${game.externalStoreLabel ?? "tienda"}`}
	                    </a>
	                  ) : null}
	                </div>
	              </div>
	            )}
	          </div>
	        </section>
	      )}
	
	      {/* SUGERENCIAS */}
      {suggestions.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">
              {lang === "en" ? "You may also like" : "También te puede interesar"}
            </h2>
            <p className="section-subtitle">
              {lang === "en" ? "Other games from your catalog." : "Otros juegos de tu catálogo."}
            </p>
          </div>

          <div className="grid-games">
            {suggestions.map((g) => {
              const isUnchartedLegacySlug =
                g.slug === "uncharted-coleccio-un-legado-de-los-ladrones";
              const suggestionName =
                lang === "en" && isUnchartedLegacySlug
                  ? "Uncharted - Legacy of Thieves Collection"
                  : g.name;

              const preview: ProductPreview = {
                id: g.id,
                name: suggestionName,
                slug: g.slug,
                description:
                  (lang === "en" ? "Digital purchase of " : "Compra digital de ") +
                  suggestionName +
                  ".",
                coverImage: g.coverImage,
                platform: "PC",
                region: lang === "en" ? "EUROPE" : "EUROPA",
                storeLabel: "Steam",
                cardSubtitle: "",
                priceOriginal: g.priceOriginal,
                discountPercent: g.discountPercent,
                cashbackPercent: 0,
                likesCount: 0,
                priceFinal: g.priceFinal,
                stock: 99,
              };

              return (
                <article
                  key={g.slug}
                  className="card card-hover game-suggestion-card"
                  onClick={() => router.push(`/games/${g.slug}`)}
                >
                  <Image
                    src={g.coverImage}
                    alt={g.name}
                    width={500}
                    height={160}
                    quality={100}
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="game-suggestion-cover"
                  />
                  <div className="game-suggestion-body">
                    <h3 className="game-suggestion-title">{suggestionName}</h3>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <p
                        className="game-detail-copy game-suggestion-price"
                        style={{ marginTop: 0 }}
                      >
                        {g.discountPercent > 0 ? (
                          <>
                            <span className="game-detail-price-old">
                              {formatPublicPrice(g.priceOriginal, lang)}
                            </span>
                            <strong className="game-detail-price-final">
                              {formatPublicPrice(g.priceFinal, lang)}
                            </strong>
                            <span className="game-detail-price-discount">-{g.discountPercent}%</span>
                          </>
                        ) : (
                          <strong className="game-detail-price-final">
                            {formatPublicPrice(g.priceFinal, lang)}
                          </strong>
                        )}
                      </p>
                      <button
                        type="button"
                        className="game-suggestion-cart-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(preview);
                        }}
                        aria-label={
                          (lang === "en" ? "Add " : "Añadir ") +
                          g.name +
                          (lang === "en" ? " to cart" : " al carrito")
                        }
                        title={lang === "en" ? "Add to cart" : "Añadir al carrito"}
                      >
                        <Image
                          src="/iconos_platforms/carritoCompra2.svg"
                          alt=""
                          width={18}
                          height={18}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
    </main>
  );
}

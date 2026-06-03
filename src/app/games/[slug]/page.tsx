"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatMoneyWithGeo } from "@/lib/geo-format";
import type { ProductPreview } from "@/types/product";

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
  const [lang, setLang] = useState<"es" | "en">("es");
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const slugParam = routeParams?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieMap = new Map(
      document.cookie.split(";").map((entry) => {
        const [key, ...rest] = entry.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")] as const;
      })
    );
    const locale = cookieMap.get("uiLocale") ?? cookieMap.get("geoLocale") ?? "es-ES";
    setLang(locale.toLowerCase().startsWith("en") ? "en" : "es");
  }, []);

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
                  {formatMoneyWithGeo(game.priceOriginal)}
                </span>
                <strong className="game-detail-price-final">
                  {formatMoneyWithGeo(game.priceFinal)}
                </strong>
                <span className="game-detail-price-discount">-{game.discountPercent}%</span>
              </>
            ) : (
              <strong className="game-detail-price-final">
                {formatMoneyWithGeo(game.priceFinal)}
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

	      {(game.requirements || game.website) && (
	        <section className="game-detail-extra">
	          <div className="card game-detail-info-card">
	            <h2 className="section-title">
	              {isEnglish ? "Additional information" : "Informacion adicional"}
	            </h2>
	            {game.requirements ? (
	              <pre className="game-detail-requirements">{game.requirements}</pre>
	            ) : null}
	            {game.website ? (
	              <a
	                href={game.website}
	                target="_blank"
	                rel="noreferrer"
	                className="auth-link"
	              >
	                {isEnglish ? "Official website" : "Web oficial"}
	              </a>
	            ) : null}
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
                              {formatMoneyWithGeo(g.priceOriginal)}
                            </span>
                            <strong className="game-detail-price-final">
                              {formatMoneyWithGeo(g.priceFinal)}
                            </strong>
                            <span className="game-detail-price-discount">-{g.discountPercent}%</span>
                          </>
                        ) : (
                          <strong className="game-detail-price-final">
                            {formatMoneyWithGeo(g.priceFinal)}
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

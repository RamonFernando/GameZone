"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatMoneyWithGeo } from "@/lib/geo-format";
import type { ProductPreview } from "@/types/product";

type Props = {
  params: { slug: string };
};

type ProductView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  priceOriginal: number;
  discountPercent: number;
  priceFinal: number;
};

export default function GameDetailPage({ params }: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [game, setGame] = useState<ProductView | null>(null);
  const [suggestions, setSuggestions] = useState<ProductView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lang, setLang] = useState<"es" | "en">("es");

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
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products/${params.slug}`);
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
  }, [params.slug]);

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

  const detailDescription =
    (isEnglish ? "Digital purchase of " : "Compra digital de ") + localizedName + ".";

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
        <div className="game-detail-media">
          <Image
            src={game.coverImage}
            alt={game.name}
            fill
            sizes="(max-width: 1024px) 100vw, 960px"
            style={{ objectFit: "cover" }}
          />
          <button
            type="button"
            className="game-detail-cart-button"
            onClick={() => addToCart(mainPreview)}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt={lang === "en" ? "Add to cart" : "Añadir al carrito"}
              width={20}
              height={20}
            />
          </button>
        </div>

        {/* INFO */}
        <div>
          <h1 className="game-detail-title">{localizedName}</h1>

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

          {/* 🔥 BOTÓN VOLVER ABAJO DERECHA */}
          <div className="game-detail-back">
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

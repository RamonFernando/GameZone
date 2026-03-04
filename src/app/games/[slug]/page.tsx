"use client";

import Image from "next/image";
import { notFound } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
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
    return <p className="section-subtitle">Cargando detalle del juego...</p>;
  }

  const mainPreview: ProductPreview = {
    id: game.id,
    name: game.name,
    slug: game.slug,
    description: `Compra digital de ${game.name}.`,
    coverImage: game.coverImage,
    platform: "PC",
    region: "EUROPA",
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
              alt="Añadir al carrito"
              width={20}
              height={20}
            />
          </button>
        </div>

        {/* INFO */}
        <div>
          <h1 className="game-detail-title">
            {game.name}
          </h1>

          <p className="game-detail-copy">
            {game.description}
          </p>
          <p className="game-detail-copy game-detail-price-line">
            Precio:{" "}
            {game.discountPercent > 0 ? (
              <>
                <span className="game-detail-price-old">
                  {game.priceOriginal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </span>
                <strong className="game-detail-price-final">
                  {game.priceFinal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                </strong>
                <span className="game-detail-price-discount">-{game.discountPercent}%</span>
              </>
            ) : (
              <strong className="game-detail-price-final">
                {game.priceFinal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
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
              ← Volver
            </button>
          </div>
        </div>

      </div>

      {/* SUGERENCIAS */}
      {suggestions.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title">También te puede interesar</h2>
            <p className="section-subtitle">Otros juegos de tu catálogo.</p>
          </div>

          <div className="grid-games">
            {suggestions.map((g) => {
              const preview: ProductPreview = {
                id: g.id,
                name: g.name,
                slug: g.slug,
                description: `Compra digital de ${g.name}.`,
                coverImage: g.coverImage,
                platform: "PC",
                region: "EUROPA",
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
                    <h3 className="game-suggestion-title">{g.name}</h3>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <p className="game-detail-copy game-suggestion-price" style={{ marginTop: 0 }}>
                        {g.discountPercent > 0 ? (
                          <>
                            <span className="game-detail-price-old">
                              {g.priceOriginal.toLocaleString("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </span>
                            <strong className="game-detail-price-final">
                              {g.priceFinal.toLocaleString("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </strong>
                            <span className="game-detail-price-discount">-{g.discountPercent}%</span>
                          </>
                        ) : (
                          <strong className="game-detail-price-final">
                            {g.priceFinal.toLocaleString("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            })}
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
                        aria-label={`Añadir ${g.name} al carrito`}
                        title="Añadir al carrito"
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
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductPreview } from "@/types/product";
import { useCart } from "@/contexts/CartContext";

// Props que recibe la tarjeta de juego (información básica del producto).
type Props = {
  game: ProductPreview;
};

// Componente de tarjeta que muestra un juego dentro de listados y rejillas.
export function GameCard({ game }: Props) {
  const { addToCart } = useCart();
  const slug = game.slug;
  const [likesCount, setLikesCount] = useState(game.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(Boolean(game.likedByCurrentUser));

  // Sincroniza el estado local de likes cuando cambian los datos del juego.
  useEffect(() => {
    setLikesCount(game.likesCount);
    setLiked(Boolean(game.likedByCurrentUser));
  }, [game.likesCount, game.likedByCurrentUser, game.slug]);

  // Formatea un número como precio en euros para mostrarlo en la UI.
  const money = (value: number) =>
    value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  // Maneja el toggle de "me gusta" llamando al API y actualizando el estado local.
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      const response = await fetch(`/api/products/${slug}`, { method: "POST" });
      if (!response.ok) {
        // Si no está autenticado, redirigimos a login.
        if (response.status === 401) {
          window.location.href = "/auth";
        }
        return;
      }
      // Desestructura la respuesta del API para obtener el número de likes y si el usuario ha dado "me gusta" al juego.
      const payload = (await response.json()) as { likesCount?: number; liked?: boolean };
      if (typeof payload.likesCount === "number") {
        setLikesCount(payload.likesCount);
      }
      // Actualiza el estado local de "liked" si la respuesta del API indica que el usuario ha dado "me gusta" al juego.
      if (typeof payload.liked === "boolean") {
        setLiked(payload.liked);
      }
    } catch {
    } finally {
      setIsLiking(false);
    }
  };

  return (
    // Componente de tarjeta que muestra un juego dentro de listados y rejillas.
    <article className="card card-hover game-card-plus">
      {/* INICIO DE LA IMAGEN */}
      <div className="game-card-media">
        <Image
          src={game.coverImage}
          alt={game.name}
          fill
          sizes="(max-width: 768px) 100vw, 240px"
          style={{ objectFit: "cover" }}
        />
        {game.cashbackPercent > 0 ? (
          <span className="game-card-cashback-badge">+{game.cashbackPercent}% Cashback</span>
        ) : null}
        {game.discountPercent > 0 ? (
          <span className="game-card-discount-badge">-{game.discountPercent}%</span>
        ) : null}
        <span className="game-card-store-pill">
          {game.storeLabel.toLowerCase() === "steam" ? (
            <>
              <Image
                src="/iconos_platforms/icon-steam.svg"
                alt="Steam"
                width={14}
                height={14}
                className="game-card-store-icon"
              />
              <span className="game-card-store-text">{game.storeLabel}</span>
            </>
          ) : (
            <span className="game-card-store-text">{game.storeLabel}</span>
          )}
        </span>
      </div> {/* FIN DE LA IMAGEN */}
      {/* INICIO DEL CUERPO */}
      <div className="game-card-body">
        {/*TÍTULO */}
        <h3 className="game-card-title">{game.name}</h3>
        {game.cardSubtitle ? <p className="game-card-subtitle">{game.cardSubtitle}</p> : null}
        <p className="game-card-region">{game.region}</p>

        {/* PRECIO */}
        <div className="game-card-price">
          {/* PRECIO ORIGINAL */}
          <p
            className={
              "game-card-original-line" +
              (game.discountPercent > 0 ? "" : " game-card-original-line--empty")
            }
          >
            {game.discountPercent > 0 ? (
              <>
                Desde <span className="game-card-original-price">{money(game.priceOriginal)}</span>{" "}
                <span className="game-card-discount">-{game.discountPercent}%</span>
              </>
            ) : (
              "\u00A0"
            )}
          </p> {/* FIN DEL PRECIO ORIGINAL */}
          {/* PRECIO CON DESCUENTO */}
          <p className="game-card-final-price">{money(game.priceFinal)}</p>
        </div>
        {/* CASHBACK */}
        {game.cashbackPercent > 0 ? (
          <p className="game-card-cashback-text">{game.cashbackPercent}% Cashback</p>
        ) : null}
        {/* FIN DEL CASHBACK */}
        <button
          type="button"
          className="game-card-like-button"
          onClick={handleLike}
          disabled={isLiking}
          aria-label={`${liked ? "Quitar me gusta de" : "Dar me gusta a"} ${game.name}`}
          title={liked ? "Quitar me gusta" : "Me gusta"}
        > 
          <span className={`game-card-like-icon${liked ? " game-card-like-icon--active" : ""}`}>
            {liked ? "♥" : "♡"}
          </span>{" "}
          {likesCount}
        </button>
        {/* INICIO DE LAS ACCIONES */}
        <div className="game-card-actions">
          <Link
            href={`/games/${slug}`}
            className="button-ghost game-card-button btn-padding-site"
          >
            Ver detalles
          </Link>
          <button
            type="button"
            className="button-primary game-card-button btn-padding-site"
            onClick={() => addToCart(game)}
          >
            Añadir
          </button>
        </div>
      </div> {/* FIN DEL CUERPO */}
    </article>
  );
}
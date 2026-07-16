"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ProductPreview } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import { formatPublicPrice } from "@/lib/public-price";
import { useLocale } from "@/hooks/useLocale";
import { toPortraitCover } from "@/components/features/portrait-cover";
import styles from "./GameCard.module.scss";

// Props que recibe la tarjeta de juego (información básica del producto).
type Props = {
  game: ProductPreview;
};

// Componente de tarjeta que muestra un juego dentro de listados y rejillas.
export function GameCard({ game }: Props) {
  const router = useRouter();
  const { addToCart } = useCart();
  const slug = game.slug;
  const [likesCount, setLikesCount] = useState(game.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(Boolean(game.likedByCurrentUser));
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState(() => toPortraitCover(game.slug, game.coverImage));
  // Detectamos al cargar si la imagen resuelta es horizontal (sin portada vertical
  // disponible) para mostrarla entera sobre un fondo difuminado en vez de recortada.
  const [isLandscape, setIsLandscape] = useState(false);
  const lang = useLocale();

  useEffect(() => {
    if (!game.saleEndsAt) return;
    function tick() {
      const ms = new Date(game.saleEndsAt!).getTime() - Date.now();
      if (ms <= 0) { setTimeLeft(null); return; }
      const d = Math.floor(ms / 86400000);
      const h = String(Math.floor((ms % 86400000) / 3600000)).padStart(2, "0");
      const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
      setTimeLeft(d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game.saleEndsAt]);

  // Sincroniza el estado local de likes cuando cambian los datos del juego.
  useEffect(() => {
    setLikesCount(game.likesCount);
    setLiked(Boolean(game.likedByCurrentUser));
  }, [game.likesCount, game.likedByCurrentUser, game.slug]);

  // Formatea un número como precio para mostrarlo en la UI (según geo/ui locale).
  const money = (value: number) => formatPublicPrice(value, lang);

  const displayRegion =
    lang === "en" && game.region === "EUROPA" ? "EUROPE" : game.region;

  const displayCardSubtitle =
    lang === "en" && game.cardSubtitle === "Código digital oficial"
      ? "Official digital code"
      : game.cardSubtitle;

  // Maneja el toggle de "me gusta" llamando al API y actualizando el estado local.
  const handleLike = async (event: React.MouseEvent) => {
    event.stopPropagation();
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
    <article
      className={`card card-hover ${styles.gameCardPlus}`}
      onClick={() => router.push(`/games/${slug}`)}
    >
      {/* INICIO DE LA IMAGEN */}
      <div className={styles.gameCardMedia}>
        {isLandscape ? (
          <Image
            src={imgSrc}
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
            quality={50}
            className={styles.gameCardBackdrop}
          />
        ) : null}
        <Image
          src={imgSrc}
          alt={game.name}
          fill
          sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
          quality={85}
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IGZpbGw9IiMwZjE3MmEiIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz48L3N2Zz4="
          className={isLandscape ? styles.gameCardFgContain : styles.gameCardFgCover}
          onLoad={(event) => {
            const el = event.currentTarget;
            if (el.naturalWidth && el.naturalHeight) {
              setIsLandscape(el.naturalWidth > el.naturalHeight * 1.05);
            }
          }}
          onError={() => setImgSrc(game.coverImage)}
        />
        {timeLeft ? (
          <span className={styles.gameCardCountdown} aria-label={`Oferta termina en ${timeLeft}`}>
            ⏱ {timeLeft}
          </span>
        ) : null}
        <span className={styles.gameCardStorePill}>
          {(() => {
            const icons: Record<string, string> = {
              steam: "/iconos_platforms/icon-steam.svg",
              g2a:   "/iconos_platforms/icon-g2a.svg",
              xbox:  "/iconos_platforms/icon-xbox.svg",
            };
            const icon = icons[game.storeLabel.toLowerCase()];
            return icon ? (
              <>
                <Image src={icon} alt={game.storeLabel} width={14} height={14} className={styles.gameCardStoreIcon} />
                <span>{game.storeLabel}</span>
              </>
            ) : (
              <span>{game.storeLabel}</span>
            );
          })()}
        </span>
      </div> {/* FIN DE LA IMAGEN */}
      {/* INICIO DEL CUERPO */}
      <div className={styles.gameCardBody}>
        {/*TÍTULO */}
        <h3 className={styles.gameCardTitle}>{game.name}</h3>
        {displayCardSubtitle ? (
          <p className={styles.gameCardSubtitle}>{displayCardSubtitle}</p>
        ) : null}
        <p className={styles.gameCardRegion}>{displayRegion}</p>

        {/* PRECIO */}
        <div className={styles.gameCardPrice}>
          {/* PRECIO ORIGINAL */}
          <p
            className={
              styles.gameCardOriginalLine +
              (game.discountPercent > 0 ? "" : ` ${styles.gameCardOriginalLineEmpty}`)
            }
          >
            {game.discountPercent > 0 ? (
              <>
                Desde <span className={styles.gameCardOriginalPrice}>{money(game.priceOriginal)}</span>{" "}
                <span className={styles.gameCardDiscount}>-{game.discountPercent}%</span>
              </>
            ) : (
              "\u00A0"
            )}
          </p> {/* FIN DEL PRECIO ORIGINAL */}
          {/* PRECIO CON DESCUENTO */}
          <p className={styles.gameCardFinalPrice}>{money(game.priceFinal)}</p>
        </div>
        {/* CASHBACK */}
        {game.cashbackPercent > 0 ? (
          <p className={styles.gameCardCashbackText}>
            {game.cashbackPercent}% Cashback
          </p>
        ) : null}
        {/* FIN DEL CASHBACK */}
        {/* INICIO DEL PIE: me gusta + añadir al carrito */}
        <div className={styles.gameCardFooter}>
          <button
            type="button"
            className={styles.gameCardLikeButton}
            onClick={handleLike}
            disabled={isLiking}
            aria-label={`${liked ? "Quitar me gusta de" : "Dar me gusta a"} ${game.name}`}
            title={liked ? "Quitar me gusta" : "Me gusta"}
          >
            <span className={`${styles.gameCardLikeIcon}${liked ? ` ${styles.gameCardLikeIconActive}` : ""}`}>
              {liked ? "♥" : "♡"}
            </span>{" "}
            {likesCount}
          </button>
          <button
            type="button"
            className={`cart-icon-button ${styles.gameCardCartButton}`}
            onClick={(event) => {
              event.stopPropagation();
              addToCart(game);
            }}
            aria-label={lang === "en" ? `Add ${game.name} to cart` : `Añadir ${game.name} al carrito`}
            title={lang === "en" ? "Add to cart" : "Añadir al carrito"}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt=""
              width={16}
              height={16}
              className={styles.gameCardCartIcon}
            />
          </button>
        </div> {/* FIN DEL PIE */}
      </div> {/* FIN DEL CUERPO */}
    </article>
  );
}

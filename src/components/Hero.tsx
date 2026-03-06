// Hero principal del home: carrusel destacado con un juego activo y miniaturas de otros.
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import type { ProductPreview } from "@/types/product";
import { formatMoneyWithGeo } from "@/lib/geo-format";
import type { ReactNode } from "react";

// Estructura interna que usamos para representar cada slide del hero.
type Slide = {
  id: ProductPreview["id"];
  title: ProductPreview["name"];
  subtitle: string;
  priceOriginal: number;
  priceFinal: number;
  discountPercent: number;
  cashbackPercent: number;
  image: string;
  badge: string;
  game: ProductPreview;
};

// Tiempo de rotación: imagen grande, borde naranja y focus del carrusel a 10 s (sincronizados).
const BANNER_ROTATE_MS = 10000;

// Convierte un ProductPreview en un Slide listo para pintar en el hero.
function toSlide(game: ProductPreview, index: number, lang: "es" | "en"): Slide {
  const badgeByIndexEs = ["Oferta destacada", "Más vendido", "Top descuento", "Recomendado"];
  const badgeByIndexEn = ["Featured offer", "Best seller", "Top discount", "Recommended"];
  const badgeByIndex = lang === "en" ? badgeByIndexEn : badgeByIndexEs;

  const defaultSubtitleEs = "Entrega inmediata";
  const defaultSubtitleEn = "Instant delivery";

  const cardSubtitle =
    lang === "en" && game.cardSubtitle === "Código digital oficial"
      ? "Official digital code"
      : game.cardSubtitle;

  const subtitleParts = [
    game.platform,
    game.region === "EUROPA" && lang === "en" ? "EUROPE" : game.region,
    cardSubtitle ||
      (lang === "en" ? "Official digital code" : defaultSubtitleEs) ||
      (lang === "en" ? defaultSubtitleEn : defaultSubtitleEs),
  ];

  return {
    id: game.id,
    title: game.name,
    subtitle: subtitleParts.filter(Boolean).join(" · "),
    priceOriginal: game.priceOriginal,
    priceFinal: game.priceFinal,
    discountPercent: game.discountPercent,
    cashbackPercent: game.cashbackPercent,
    image: game.coverImage,
    badge: badgeByIndex[index % badgeByIndex.length],
    game,
  };
}

// Props que recibe el Hero: lista de productos destacados y opcionalmente el header para meter dentro de la section.
type Props = {
  products: ProductPreview[];
  headerSlot?: ReactNode;
};

// Sección hero/carrousel que muestra el juego destacado y las miniaturas clicables.
export function Hero({ products, headerSlot }: Props) {
  const { addToCart } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [thumbScrollIndex, setThumbScrollIndex] = useState(0);
  const [thumbTransition, setThumbTransition] = useState(true);
  const [lang, setLang] = useState<"es" | "en">("es");

  const slides = useMemo<Slide[]>(() => {
    const featured = [...products]
      .sort((a, b) => {
        if (b.discountPercent !== a.discountPercent) {
          return b.discountPercent - a.discountPercent;
        }
        return b.likesCount - a.likesCount;
      })
      .slice(0, 4);

    return featured.map((game, index) => toSlide(game, index, lang));
  }, [products, lang]);

  // Última posición del carrusel de thumbs (rueda triplicada: 3× slides, ventana de 3).
  const maxThumbScrollIndex = useMemo(
    () => (slides.length > 0 ? slides.length * 3 - 3 : 0),
    [slides.length]
  );

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

  // Detectar zoom aproximado del navegador:
  // - Si el ratio outerWidth/innerWidth está cerca de 1, asumimos zoom ~100% (modo "normal").
  // - Si se aleja, consideramos que el usuario ha cambiado el zoom y pasamos a modo "scaled",
  //   para que el banner no se quede fijado al 80% de la pantalla y se comporte como el resto.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateZoomFlag = () => {
      const { innerWidth, outerWidth } = window;
      if (!innerWidth || !outerWidth) return;

      const ratio = outerWidth / innerWidth;
      const isNormalZoom = ratio > 0.95 && ratio < 1.05;

      document.documentElement.setAttribute(
        "data-hero-zoom",
        isNormalZoom ? "normal" : "scaled"
      );
    };

    updateZoomFlag();
    window.addEventListener("resize", updateZoomFlag);

    return () => {
      window.removeEventListener("resize", updateZoomFlag);
    };
  }, []);

  // Al cargar o cambiar datos: centrar el primer slide para que el borde naranja esté en el centro.
  useEffect(() => {
    if (slides.length > 0) {
      setActiveIndex(0);
      setThumbScrollIndex(slides.length - 1);
    } else {
      setActiveIndex(0);
      setThumbScrollIndex(0);
    }
  }, [slides.length]);

  // Un solo timer a 10 s: avanza carrusel, imagen grande y borde naranja a la vez (mismo tick).
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setThumbScrollIndex((i) => {
        const next = i + 1;
        if (next > maxThumbScrollIndex) {
          setThumbTransition(false);
          setActiveIndex(0);
          return slides.length - 1;
        }
        setThumbTransition(true);
        setActiveIndex((next + 1) % slides.length);
        return next;
      });
    }, BANNER_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, maxThumbScrollIndex]);

  // Reactivar transición después de resetear el índice a 0 (evita que se vea el salto).
  useEffect(() => {
    if (!thumbTransition) {
      const t = setTimeout(() => setThumbTransition(true), 0);
      return () => clearTimeout(t);
    }
  }, [thumbTransition]);

  // Rueda infinita: triplicamos los slides para que nunca se vea vacío al hacer loop.
  const slidesWithLoop =
    slides.length > 0 ? [...slides, ...slides, ...slides] : [];

  if (slides.length === 0) {
    return null;
  }

  const active = slides[Math.min(activeIndex, slides.length - 1)];
  const money = (value: number) => formatMoneyWithGeo(value);

  return (
    <section className={`hero hero--carousel${headerSlot ? " hero--with-header" : ""}`}>
      {/* Background: la imagen cubre toda la section, incluida la zona del header */}
      <div className="hero-bg">
        <Image
          src={active.image}
          alt={active.title}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center center" }}
        />
        <div className="hero-bg-gradient" />
      </div>

      {/* Header dentro de la section para que la imagen coja la barra superior */}
      {headerSlot}

      {/* Content */}
      <div className="hero-inner">
        <div className="hero-main">
          {active.badge && <span className="badge-soft">{active.badge}</span>}

          <h1 className="hero-title">{active.title}</h1>

          <p className="hero-subtitle">{active.subtitle}</p>

          <div className="hero-meta-row">
            <div className="hero-price-box">
              {active.discountPercent > 0 ? (
                <>
                  <span className="hero-discount">-{active.discountPercent}%</span>
                  <span className="hero-price-old">{money(active.priceOriginal)}</span>
                </>
              ) : null}
              <span className="hero-price">{money(active.priceFinal)}</span>
            </div>

            {active.cashbackPercent > 0 ? (
              <span className="hero-cashback-chip">
                {active.cashbackPercent}% {lang === "en" ? "Cashback" : "Cashback"}
              </span>
            ) : null}

            <button
              type="button"
              className="button-primary hero-cta btn-padding-site"
              onClick={() => addToCart(active.game)}
            >
              {lang === "en" ? "Add to cart" : "Añadir al carrito"}
            </button>

          </div>

          <p className="hero-subcopy">
            {lang === "en"
              ? "Browse the latest releases and prepare your gaming catalog."
              : "Desliza entre los últimos lanzamientos y prepara tu catálogo gaming."}
            <br />
            {lang === "en" ? "Don't miss it!" : "¡No te lo pierdas!"}
          </p>
        </div>

        {/* Mini carrusel de últimos lanzamientos */}
        <div className="hero-thumbs-wrapper">
          <div className="hero-thumbs-header">
            <h2 className="section-title">
              {lang === "en" ? "Featured" : "Destacados"}
            </h2>
            {/* <p className="section-subtitle">Explora juegos recientes de tu catálogo.</p> */}
          </div>

          <div className="hero-thumbs-row-wrap">
            <div
              className="hero-thumbs-row hero-thumbs-row--slider"
              style={
                {
                  "--thumbs-offset": thumbScrollIndex,
                  "--thumbs-offset-center": activeIndex,
                  transition: thumbTransition ? "transform 0.6s ease-in-out" : "none",
                } as React.CSSProperties
              }
            >
              {slidesWithLoop.map((slide, index) => {
                const realIndex = index % slides.length;
                const position =
                  index === thumbScrollIndex
                    ? "left"
                    : index === thumbScrollIndex + 1
                      ? "center"
                      : index === thumbScrollIndex + 2
                        ? "right"
                        : "off";
                return (
                  <button
                    key={`${slide.id}-${index}`}
                    type="button"
                    className={
                      "hero-thumb hero-thumb--" +
                      position +
                      (realIndex === activeIndex ? " hero-thumb--active" : "")
                    }
                    onClick={() => {
                    setActiveIndex(realIndex);
                    setThumbScrollIndex((realIndex - 1 + slides.length) % slides.length);
                  }}
                  >
                    <div className="hero-thumb-image">
                      <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        sizes="160px"
                        style={{ objectFit: "cover", objectPosition: "center center" }}
                      />
                    </div>
                    <div className="hero-thumb-info">
                      <div className="hero-thumb-title">{slide.title}</div>
                      <div className="hero-thumb-meta">
                        <span>{money(slide.priceFinal)}</span>
                        {slide.discountPercent > 0 ? (
                          <span className="hero-thumb-discount">-{slide.discountPercent}%</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

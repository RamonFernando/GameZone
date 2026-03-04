// Hero principal del home: carrusel destacado con un juego activo y miniaturas de otros.
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import type { ProductPreview } from "@/types/product";

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

// Tiempo de auto-rotación del carrusel (en milisegundos).
const AUTO_DELAY_MS = 7000;

// Convierte un ProductPreview en un Slide listo para pintar en el hero.
function toSlide(game: ProductPreview, index: number): Slide {
  const badgeByIndex = ["Oferta destacada", "Más vendido", "Top descuento", "Recomendado"];
  const subtitleParts = [game.platform, game.region, game.cardSubtitle || "Entrega inmediata"];
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

// Props que recibe el Hero: lista de productos destacados.
type Props = {
  products: ProductPreview[];
};

// Sección hero/carrousel que muestra el juego destacado y las miniaturas clicables.
export function Hero({ products }: Props) {
  const { addToCart } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo<Slide[]>(() => {
    const featured = [...products]
      .sort((a, b) => {
        if (b.discountPercent !== a.discountPercent) {
          return b.discountPercent - a.discountPercent;
        }
        return b.likesCount - a.likesCount;
      })
      .slice(0, 4);

    return featured.map((game, index) => toSlide(game, index));
  }, [products]);

  useEffect(() => {
    if (slides.length < 2) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, AUTO_DELAY_MS);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const active = slides[Math.min(activeIndex, slides.length - 1)];
  const money = (value: number) => value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <section className="hero hero--carousel">
      {/* Background */}
      <div className="hero-bg">
        <Image
          src={active.image}
          alt={active.title}
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className="hero-bg-gradient" />
      </div>

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
              <span className="hero-cashback-chip">{active.cashbackPercent}% Cashback</span>
            ) : null}

            <button
              type="button"
              className="button-primary hero-cta btn-padding-site"
              onClick={() => addToCart(active.game)}
            >
              Añadir al carrito
            </button>

          </div>

          <p className="hero-subcopy">
            Desliza entre los últimos lanzamientos y prepara tu catálogo gaming.
            <br />
            ¡No te lo pierdas!
          </p>
        </div>

        {/* Mini carrusel de últimos lanzamientos */}
        <div className="hero-thumbs-wrapper">
          <div className="hero-thumbs-header">
            <h2 className="section-title">Destacados</h2>
            {/* <p className="section-subtitle">Explora juegos recientes de tu catálogo.</p> */}
          </div>

          <div className="hero-thumbs-row">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={
                  "hero-thumb" + (index === activeIndex ? " hero-thumb--active" : "")
                }
                onClick={() => setActiveIndex(index)}
              >
                <div className="hero-thumb-image">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="160px"
                    style={{ objectFit: "cover" }}
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

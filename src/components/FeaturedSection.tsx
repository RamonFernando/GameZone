"use client";

import { useMemo, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { useSearch } from "@/contexts/SearchContext";
import type { ProductPreview } from "@/types/product";

type Props = { products: ProductPreview[] };

const GENRE_SVG: Record<string, string> = {
  Action: "/iconos_generos/icon-action.svg",
  Shooter: "/iconos_generos/icon-shooter.svg",
  RPG: "/iconos_generos/icon-rpg.svg",
  "Action RPG": "/iconos_generos/icon-rpg.svg",
  Adventure: "/iconos_generos/icon-adventure.svg",
  Indie: "/iconos_generos/icon-indie.svg",
  Strategy: "/iconos_generos/icon-strategy.svg",
};

const GENRE_EMOJI: Record<string, string> = {
  Simulation: "🎮", Sports: "⚽", Racing: "🏎️",
  Puzzle: "🧩", Fighting: "🥊", Horror: "👻", Platformer: "🏃",
  "Massively Multiplayer": "🌐", "Card": "🃏",
};

// Shorten labels that overflow the chip
const GENRE_SHORT: Record<string, string> = {
  "Massively Multiplayer": "MMO",
  "Action RPG": "ARPG",
  "Point-and-click": "P&C",
};

function getGenreIcon(genre: string): { type: "svg"; src: string } | { type: "emoji"; char: string } {
  if (GENRE_SVG[genre]) return { type: "svg", src: GENRE_SVG[genre] };
  return { type: "emoji", char: GENRE_EMOJI[genre] ?? "🎮" };
}

function fmt(n: number) { return n.toString().padStart(2, "0"); }

function formatPrice(price: number) {
  return price.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function useCountdown() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setSecs(Math.floor((midnight.getTime() - now.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60), s: secs % 60 };
}

function SideCard({ game, badge, badgeClass }: { game: ProductPreview; badge: string; badgeClass: string }) {
  return (
    <Link href={`/games/${game.slug}`} className="featured-side-card" aria-label={game.name}>
      <div className="featured-side-card__media">
        <Image src={game.coverImage} alt={game.name} fill sizes="220px" className="featured-side-card__img" unoptimized />
        <div className="featured-side-card__overlay" />
        <div className="featured-side-card__info">
          <span className={`featured-side-card__badge ${badgeClass}`}>{badge}</span>
          <p className="featured-side-card__name">{game.name}</p>
          <div className="featured-side-card__price-row">
            {game.discountPercent > 0 && (
              <span className="featured-side-card__discount">-{game.discountPercent}%</span>
            )}
            <span className="featured-side-card__price">{formatPrice(game.priceFinal)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DealsOfTheDay({ games, lang }: { games: ProductPreview[]; lang: string }) {
  const { h, m, s } = useCountdown();
  return (
    <div className="featured-deal">
      <div className="featured-deal__header">
        <span className="featured-deal__fire">🔥</span>
        <span className="featured-deal__title">{lang === "en" ? "Deals of the day" : "Ofertas del día"}</span>
        <div className="featured-deal__countdown">
          <div className="featured-deal__cd-block">
            <span className="featured-deal__cd-num">{fmt(h)}</span>
            <span className="featured-deal__cd-unit">h</span>
          </div>
          <span className="featured-deal__cd-sep">:</span>
          <div className="featured-deal__cd-block">
            <span className="featured-deal__cd-num">{fmt(m)}</span>
            <span className="featured-deal__cd-unit">min</span>
          </div>
          <span className="featured-deal__cd-sep">:</span>
          <div className="featured-deal__cd-block">
            <span className="featured-deal__cd-num">{fmt(s)}</span>
            <span className="featured-deal__cd-unit">seg</span>
          </div>
        </div>
      </div>
      <div className="featured-deal__list">
        {games.map((game) => (
          <Link key={game.slug} href={`/games/${game.slug}`} className="featured-deal__row">
            <div className="featured-deal__cover">
              <Image src={game.coverImage} alt={game.name} fill sizes="64px" style={{ objectFit: "cover" }} unoptimized />
            </div>
            <div className="featured-deal__info">
              <p className="featured-deal__name">{game.name}</p>
              <div className="featured-deal__price-row">
                <span className="featured-deal__badge">-{game.discountPercent}%</span>
                <span className="featured-deal__price">{formatPrice(game.priceFinal)}</span>
                <span className="featured-deal__original">{formatPrice(game.priceOriginal)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FeaturedSection({ products }: Props) {
  const lang = useLocale();
  const { setPlatform, setQuery } = useSearch();

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      for (const g of p.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
  }, [products]);

  const featuredGame = useMemo(
    () => [...products].sort((a, b) => b.likesCount - a.likesCount)[0] ?? null,
    [products]
  );

  const biggestDiscountGame = useMemo(() => {
    const skip = featuredGame?.slug;
    return [...products].filter((p) => p.discountPercent > 0 && p.slug !== skip)
      .sort((a, b) => b.discountPercent - a.discountPercent)[0] ?? null;
  }, [products, featuredGame]);

  const dealGames = useMemo(() => {
    const skip = new Set([featuredGame?.slug, biggestDiscountGame?.slug]);
    return [...products]
      .filter((p) => p.discountPercent > 0 && !skip.has(p.slug))
      .sort((a, b) => b.discountPercent - a.discountPercent)
      .slice(0, 3);
  }, [products, featuredGame, biggestDiscountGame]);

  if (!featuredGame && topGenres.length === 0) return null;

  return (
    <section className="featured-section" aria-label={lang === "en" ? "Featured section" : "Sección destacada"}>
      <div className="featured-grid">

        {featuredGame && (
          <SideCard game={featuredGame} badge={lang === "en" ? "Most liked" : "Más destacado"} badgeClass="featured-side-card__badge--purple" />
        )}

        <div className="featured-center">
          {topGenres.length > 0 && (
            <div className="featured-genres">
              <p className="featured-genres-label">{lang === "en" ? "Browse by genre" : "Explorar por género"}</p>
              <div className="featured-genres-row">
                {topGenres.map((genre) => {
                  const icon = getGenreIcon(genre);
                  const label = GENRE_SHORT[genre] ?? genre;
                  return (
                    <button
                      key={genre}
                      type="button"
                      className="featured-genre-chip"
                      onClick={() => {
                        setPlatform(null);
                        setQuery(genre);
                      }}
                    >
                      <span className="featured-genre-icon" aria-hidden="true">
                        {icon.type === "svg"
                          ? <Image src={icon.src} alt="" width={40} height={40} unoptimized />
                          : icon.char}
                      </span>
                      <span className="featured-genre-name">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {dealGames.length > 0 && <DealsOfTheDay games={dealGames} lang={lang} />}
        </div>

        {biggestDiscountGame && (
          <SideCard game={biggestDiscountGame} badge={lang === "en" ? "Best deal" : "Mayor descuento"} badgeClass="featured-side-card__badge--orange" />
        )}

      </div>
    </section>
  );
}

"use client";

import { useMemo, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import lightningBolt   from "@iconify-icons/mdi/lightning-bolt";
import crosshairs      from "@iconify-icons/mdi/crosshairs";
import sword           from "@iconify-icons/mdi/sword";
import swordCross      from "@iconify-icons/mdi/sword-cross";
import compass         from "@iconify-icons/mdi/compass";
import gamepadVariant  from "@iconify-icons/mdi/gamepad-variant";
import chessPawn       from "@iconify-icons/mdi/chess-pawn";
import earth           from "@iconify-icons/mdi/earth";
import cog             from "@iconify-icons/mdi/cog";
import soccer          from "@iconify-icons/mdi/soccer";
import carSports       from "@iconify-icons/mdi/car-sports";
import puzzle          from "@iconify-icons/mdi/puzzle";
import boxingGlove     from "@iconify-icons/mdi/boxing-glove";
import ghost           from "@iconify-icons/mdi/ghost";
import runFast         from "@iconify-icons/mdi/run-fast";
import cardsPlaying    from "@iconify-icons/mdi/cards-playing";
import joystick        from "@iconify-icons/mdi/controller-classic";
import spaceInvaders   from "@iconify-icons/mdi/space-invaders";
import puzzleOutline   from "@iconify-icons/mdi/puzzle-outline";
import { useLocale } from "@/hooks/useLocale";
import { useSearch } from "@/contexts/SearchContext";
import type { ProductPreview } from "@/types/product";

type Props = { products: ProductPreview[] };

const GENRE_COLOR: Record<string, string> = {
  Action:                  "#b91c1c",
  Shooter:                 "#1d4ed8",
  RPG:                     "#6d28d9",
  "Action RPG":            "#7c3aed",
  Adventure:               "#047857",
  Indie:                   "#be185d",
  Strategy:                "#1e3a8a",
  "Massively Multiplayer": "#0e7490",
  Simulation:              "#92400e",
  Sports:                  "#15803d",
  Racing:                  "#b45309",
  Puzzle:                  "#0369a1",
  Fighting:                "#9f1239",
  Horror:                  "#292524",
  Platformer:              "#6d28d9",
  Card:                    "#0f766e",
  Arcade:                  "#7e22ce",
  Casual:                  "#0891b2",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GENRE_ICON: Record<string, any> = {
  Action:                  lightningBolt,
  Shooter:                 crosshairs,
  RPG:                     sword,
  "Action RPG":            swordCross,
  Adventure:               compass,
  Indie:                   gamepadVariant,
  Strategy:                chessPawn,
  "Massively Multiplayer": earth,
  Simulation:              cog,
  Sports:                  soccer,
  Racing:                  carSports,
  Puzzle:                  puzzle,
  Fighting:                boxingGlove,
  Horror:                  ghost,
  Platformer:              runFast,
  Card:                    cardsPlaying,
  Arcade:                  spaceInvaders,
  Casual:                  puzzleOutline,
};

const GENRE_SHORT: Record<string, string> = {
  "Massively Multiplayer": "MMO",
  "Action RPG": "ARPG",
  "Point-and-click": "P&C",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGenreIcon(genre: string): any {
  return GENRE_ICON[genre] ?? joystick;
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
  const { setFilterGenre, filterGenre } = useSearch();

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      for (const g of p.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([g]) => g);
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
                  const iconName = getGenreIcon(genre);
                  const label = GENRE_SHORT[genre] ?? genre;
                  return (
                    <button
                      key={genre}
                      type="button"
                      className={`featured-genre-chip${filterGenre === genre ? " featured-genre-chip--active" : ""}`}
                      data-genre={genre}
                      style={{ "--genre-color": GENRE_COLOR[genre] ?? "#6366f1" } as React.CSSProperties}
                      onClick={() => {
                        setFilterGenre(filterGenre === genre ? null : genre);
                        requestAnimationFrame(() => {
                          document.getElementById("game-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      }}
                    >
                      <span className="featured-genre-icon" aria-hidden="true">
                        <Icon icon={iconName} width={40} height={40} />
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

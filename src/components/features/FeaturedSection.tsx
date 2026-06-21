"use client";

import { useMemo, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./FeaturedSection.module.scss";
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
import { toPortraitCover } from "@/lib/portrait-cover";
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

const BADGE_CLASS: Record<string, string> = {
  "featured-side-card__badge--purple": styles.featuredSideCardBadgePurple,
  "featured-side-card__badge--orange": styles.featuredSideCardBadgeOrange,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGenreIcon(genre: string): any {
  return GENRE_ICON[genre] ?? joystick;
}

function fmt(n: number) { return n.toString().padStart(2, "0"); }

function formatPrice(price: number) {
  return price.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

const DEAL_ROTATE_S = 8;

function useCountdown() {
  const [secs, setSecs] = useState<number | null>(null);
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
  if (secs === null) return { h: null, m: null, s: null };
  return { h: Math.floor(secs / 3600), m: Math.floor((secs % 3600) / 60), s: secs % 60 };
}

function SideCard({ game, badge, badgeClass }: { game: ProductPreview; badge: string; badgeClass: string }) {
  const [imgSrc, setImgSrc] = useState(() => toPortraitCover(game.slug, game.coverImage));
  return (
    <Link href={`/games/${game.slug}`} className={styles.featuredSideCard} aria-label={game.name}>
      <div className={styles.featuredSideCardMedia}>
        <Image
          src={imgSrc}
          alt={game.name}
          fill
          sizes="(max-width: 360px) 100vw, (max-width: 720px) 50vw, 220px"
          className={styles.featuredSideCardImg}
          unoptimized
          onError={() => setImgSrc(game.coverImage)}
        />
        <span className={`${styles.featuredSideCardBadge} ${BADGE_CLASS[badgeClass] ?? ""}`}>{badge}</span>
      </div>
      <div className={styles.featuredSideCardInfo}>
        <p className={styles.featuredSideCardName}>{game.name}</p>
        <div className={styles.featuredSideCardPriceRow}>
          {game.discountPercent > 0 && (
            <span className={styles.featuredSideCardDiscount}>-{game.discountPercent}%</span>
          )}
          <span className={styles.featuredSideCardPrice}>{formatPrice(game.priceFinal)}</span>
        </div>
      </div>
    </Link>
  );
}


function PlatformPanel({
  games, logo, activeGameIdx, isActive, timeLeft,
}: {
  games: ProductPreview[];
  logo: React.ReactNode;
  activeGameIdx: number;
  isActive: boolean;
  timeLeft: number;
}) {
  const game = games[activeGameIdx];
  if (!game) return null;
  return (
    <Link
      href={`/games/${game.slug}`}
      className={`${styles.featuredDealPanel}${isActive ? ` ${styles.featuredDealPanelActive}` : ""}`}
    >
      <div className={styles.featuredDealCover}>
        <Image src={game.coverImage} alt={game.name} fill sizes="200px" style={{ objectFit: "cover" }} unoptimized />
        <span className={styles.featuredDealPlatformLogo}>{logo}</span>
      </div>
      {games.length > 1 && (
        <div className={styles.featuredDealDots}>
          {games.map((_, i) => (
            <span key={i} className={`${styles.featuredDealDot}${i === activeGameIdx ? ` ${styles.featuredDealDotActive}` : ""}`} />
          ))}
        </div>
      )}
      <div className={styles.featuredDealInfo}>
        <p className={styles.featuredDealName}>{game.name}</p>
        <div className={styles.featuredDealPriceRow}>
          {game.discountPercent > 0 && <span className={styles.featuredDealBadge}>-{game.discountPercent}%</span>}
          <span className={styles.featuredDealPrice}>{formatPrice(game.priceFinal)}</span>
          <span className={styles.featuredDealOriginal}>{formatPrice(game.priceOriginal)}</span>
        </div>
      </div>
      <div className={`${styles.featuredDealProgress}${!isActive ? ` ${styles.featuredDealProgressIdle}` : ""}`}>
        <div
          className={styles.featuredDealProgressBar}
          style={{ width: isActive ? `${(timeLeft / DEAL_ROTATE_S) * 100}%` : "0%" }}
        />
      </div>
    </Link>
  );
}

function DealsOfTheDay({ games, lang }: { games: ProductPreview[]; lang: string }) {
  const { h, m, s } = useCountdown();
  const [activeSlot, setActiveSlot] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEAL_ROTATE_S);

  useEffect(() => {
    if (games.length < 2) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setActiveSlot((prev) => (prev + 1) % games.length); return DEAL_ROTATE_S; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [games.length]);

  const steamGames = games.slice(0, 2);
  const g2aGames   = games.slice(2, 4);
  const xboxGames  = games.slice(4, 6);

  const PANEL_SIZE      = 2;
  const NUM_PANELS      = [steamGames, g2aGames, xboxGames].filter(g => g.length > 0).length;
  // right-to-left: slot 0 → rightmost panel, slot last → leftmost panel
  const activePanelIdx  = (NUM_PANELS - 1) - Math.floor(activeSlot / PANEL_SIZE);
  const activeGameInPanel = activeSlot % PANEL_SIZE;

  function gameIdx(panelIdx: number) {
    if (panelIdx === activePanelIdx) return activeGameInPanel;
    // panel inactivo → conserva su último juego mostrado (cada panel termina su turno en el último juego),
    // así no se resetea a juego 0 al reiniciar el ciclo (corrige que el panel izquierdo no rotara)
    return PANEL_SIZE - 1;
  }

  return (
    <div className={styles.featuredDeal}>
      <div className={styles.featuredDealHeader}>
        <span className={styles.featuredDealFire}>🔥</span>
        <span className={styles.featuredDealTitle}>{lang === "en" ? "Deals of the day" : "Ofertas del día"}</span>
        <div className={styles.featuredDealCountdown}>
          <div className={styles.featuredDealCdBlock}>
            <span className={styles.featuredDealCdNum} suppressHydrationWarning>{h !== null ? fmt(h) : "--"}</span>
            <span className={styles.featuredDealCdUnit}>h</span>
          </div>
          <span className={styles.featuredDealCdSep}>:</span>
          <div className={styles.featuredDealCdBlock}>
            <span className={styles.featuredDealCdNum} suppressHydrationWarning>{m !== null ? fmt(m) : "--"}</span>
            <span className={styles.featuredDealCdUnit}>min</span>
          </div>
          <span className={styles.featuredDealCdSep}>:</span>
          <div className={styles.featuredDealCdBlock}>
            <span className={styles.featuredDealCdNum} suppressHydrationWarning>{s !== null ? fmt(s) : "--"}</span>
            <span className={styles.featuredDealCdUnit}>seg</span>
          </div>
        </div>
      </div>
      <div className={styles.featuredDealPlatformGrid}>
        {steamGames.length > 0 && (
          <PlatformPanel
            games={steamGames}
            logo={<Image src="/iconos_platforms/icon-steam.svg" width={26} height={26} alt="Steam" />}
            activeGameIdx={gameIdx(0)}
            isActive={activePanelIdx === 0}
            timeLeft={timeLeft}
          />
        )}
        {g2aGames.length > 0 && (
          <PlatformPanel
            games={g2aGames}
            logo={<Image src="/iconos_platforms/icon-g2a.svg" alt="G2A" width={20} height={20} />}
            activeGameIdx={gameIdx(1)}
            isActive={activePanelIdx === 1}
            timeLeft={timeLeft}
          />
        )}
        {xboxGames.length > 0 && (
          <PlatformPanel
            games={xboxGames}
            logo={<Image src="/iconos_platforms/icon-xbox.svg" width={26} height={26} alt="Xbox" />}
            activeGameIdx={gameIdx(2)}
            isActive={activePanelIdx === 2}
            timeLeft={timeLeft}
          />
        )}
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
      .slice(0, 6);
  }, [products, featuredGame, biggestDiscountGame]);

  if (!featuredGame && topGenres.length === 0) return null;

  return (
    <section className={styles.featuredSection} aria-label={lang === "en" ? "Featured section" : "Sección destacada"}>
      <div className={styles.featuredGrid}>

        {featuredGame && (
          <SideCard game={featuredGame} badge={lang === "en" ? "Most liked" : "Más destacado"} badgeClass="featured-side-card__badge--purple" />
        )}

        <div className={styles.featuredCenter}>
          {topGenres.length > 0 && (
            <div className={styles.featuredGenres}>
              <p className={styles.featuredGenresLabel}>{lang === "en" ? "Browse by genre" : "Explorar por género"}</p>
              <div className={styles.featuredGenresRow}>
                {topGenres.map((genre) => {
                  const iconName = getGenreIcon(genre);
                  const label = GENRE_SHORT[genre] ?? genre;
                  return (
                    <button
                      key={genre}
                      type="button"
                      className={`${styles.featuredGenreChip}${filterGenre === genre ? ` ${styles.featuredGenreChipActive}` : ""}`}
                      data-genre={genre}
                      style={{ "--genre-color": GENRE_COLOR[genre] ?? "#6366f1" } as React.CSSProperties}
                      onClick={() => {
                        setFilterGenre(filterGenre === genre ? null : genre);
                        requestAnimationFrame(() => {
                          document.getElementById("game-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        });
                      }}
                    >
                      <span className={styles.featuredGenreIcon} aria-hidden="true">
                        <Icon icon={iconName} width={40} height={40} />
                      </span>
                      <span className={styles.featuredGenreName}>{label}</span>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductPreview } from "@/types/product";
import { GameCard } from "@/components/GameCard";
import { useLocale } from "@/hooks/useLocale";

const DESKTOP_LIMIT = 40;
const MOBILE_LIMIT = 20;

type Props = {
  games: ProductPreview[];
  /** true cuando hay búsqueda o filtro activo → mostrar todos los resultados sin límite */
  isFiltered?: boolean;
  /** Sobreescribe el título por defecto "Últimos lanzamientos" */
  title?: string;
  /** Sobreescribe el subtítulo por defecto */
  subtitle?: string;
};

export function GameGrid({ games, isFiltered = false, title, subtitle }: Props) {
  const lang = useLocale();
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cardNodes = Array.from(
      document.querySelectorAll<HTMLElement>(".game-card-reveal[data-reveal-slug]")
    );

    if (cardNodes.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      setVisibleCards(new Set(games.map((game) => game.slug)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = new Set<string>();

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const slug = entry.target.getAttribute("data-reveal-slug");
          if (!slug) return;
          nextVisible.add(slug);
          observer.unobserve(entry.target);
        });

        if (nextVisible.size > 0) {
          setVisibleCards((current) => {
            const merged = new Set(current);
            nextVisible.forEach((slug) => merged.add(slug));
            return merged;
          });
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    cardNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, [games]);

  const limit = isFiltered ? undefined : (isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT);
  const displayedGames = limit ? games.slice(0, limit) : games;
  const hasMore = !isFiltered && games.length > (limit ?? 0);

  return (
    <section id="game-results">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {title ?? (lang === "en" ? "Latest releases" : "Últimos lanzamientos")}
          </h2>
          <p className="section-subtitle">
            {subtitle ?? (lang === "en"
              ? "Recently released games. Discover the latest in the gaming world!"
              : "Juegos lanzados recientemente. ¡Descubre lo último en el mundo gaming!")}
          </p>
        </div>
        {hasMore && (
          <Link href="/games" className="section-view-all">
            {lang === "en" ? "View all →" : "Ver todos →"}
          </Link>
        )}
      </div>
      <div className="grid-games">
        {displayedGames.length === 0 ? (
          <p className="section-subtitle">
            {lang === "en"
              ? "We couldn't find games with that title. Try another one."
              : "No hemos encontrado juegos con el título buscado. Prueba con otro título."}
          </p>
        ) : (
          <div className="grid-games">
            {displayedGames.map((game, index) => (
              <div
                key={game.slug}
                className={
                  "game-card-reveal" +
                  ` reveal-delay-${Math.min(index, 8)}` +
                  (visibleCards.has(game.slug) ? " game-card-reveal--visible" : "")
                }
                data-reveal-slug={game.slug}
              >
                <GameCard game={game} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

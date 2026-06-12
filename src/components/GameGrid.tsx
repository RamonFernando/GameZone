"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProductPreview } from "@/types/product";
import { GameCard } from "@/components/GameCard";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";

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
  /** Enlace de vuelta que aparece a la derecha del header de sección */
  backHref?: string;
  /** Texto de búsqueda activo, para mostrarlo en el mensaje de sin resultados */
  emptyQuery?: string;
  /** Juegos populares a sugerir cuando la búsqueda no da resultados */
  allGames?: ProductPreview[];
  popularSuggestions?: ProductPreview[];
  /** Callback para limpiar la búsqueda activa */
  onClearSearch?: () => void;
};

export function GameGrid({
  games,
  isFiltered = false,
  title,
  subtitle,
  backHref,
  emptyQuery,
  allGames,
  popularSuggestions,
  onClearSearch,
}: Props) {
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
  const suggestions = useMemo(() => {
    if (popularSuggestions) return popularSuggestions.slice(0, 4);
    if (!allGames) return [];

    return [...allGames]
      .sort((a, b) => {
        if (b.discountPercent !== a.discountPercent) {
          return b.discountPercent - a.discountPercent;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 4);
  }, [allGames, popularSuggestions]);
  const isEmpty = displayedGames.length === 0;

  return (
    <section id="game-results">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {title ?? t(lang, "grid.title")}
          </h2>
          <p className="section-subtitle">
            {subtitle ?? t(lang, "grid.subtitle")}
          </p>
        </div>
        {hasMore && (
          <Link href="/games" className="button-ghost button-ghost--nav btn-padding-site">
            {t(lang, "grid.view-all")}
          </Link>
        )}
        {!hasMore && backHref && (
          <Link href={backHref} className="button-ghost button-ghost--nav btn-padding-site">
            {t(lang, "grid.back")}
          </Link>
        )}
      </div>
      <div className={isEmpty ? "game-grid-empty-shell" : "grid-games"}>
        {isEmpty ? (
          isFiltered ? (
            <div className="game-grid-empty">
              <p className="section-subtitle">
                {emptyQuery
                  ? t(lang, "grid.empty-query")(emptyQuery)
                  : t(lang, "grid.empty-no-query")}
              </p>
              {onClearSearch && (
                <button
                  type="button"
                  className="button-ghost btn-padding-site"
                  onClick={onClearSearch}
                >
                  {t(lang, "grid.clear-search")}
                </button>
              )}
              {suggestions.length > 0 && (
                <div className="game-grid-empty-suggestions">
                  <p className="section-subtitle game-grid-empty-suggestions-title">
                    {t(lang, "grid.suggestions-label")}
                  </p>
                  <div className="grid-games">
                    {suggestions.map((game) => (
                      <GameCard key={game.slug} game={game} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="section-subtitle">
              {t(lang, "grid.empty-catalog")}
            </p>
          )
        ) : (
          displayedGames.map((game, index) => (
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
          ))
        )}
      </div>
      {backHref && (
        <div className="section-footer-back">
          <Link href={backHref} className="button-ghost button-ghost--nav btn-padding-site">
            {t(lang, "grid.back")}
          </Link>
        </div>
      )}
    </section>
  );
}

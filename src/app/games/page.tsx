"use client";

import { useEffect, useMemo, useState } from "react";
import { GameGrid } from "@/components/GameGrid";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { useSearch } from "@/contexts/SearchContext";
import type { ProductPreview } from "@/types/product";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default function GamesPage() {
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const { query, setQuery, platform, setPlatform } = useSearch();
  useScrollMemory(!loading);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { products?: ProductPreview[] }) => {
        setProducts(data.products ?? []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredGames = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    const normalizedPlatform = platform ? normalizeText(platform) : "";

    return products.filter((game) => {
      const matchesPlatform =
        !normalizedPlatform ||
        normalizeText(game.platform).includes(normalizedPlatform);

      const matchesQuery =
        !normalizedQuery ||
        normalizeText(game.name).includes(normalizedQuery) ||
        normalizeText(game.description ?? "").includes(normalizedQuery);

      return matchesPlatform && matchesQuery;
    });
  }, [products, query, platform]);

  const isFiltered = Boolean(query.trim()) || Boolean(platform);

  return (
    <>
      <main className="main-wrapper">
        {loading ? (
          <p className="section-subtitle">Cargando catálogo...</p>
        ) : (
          <GameGrid
            games={filteredGames}
            isFiltered={true}
            backHref="/"
            title="Catálogo completo"
            subtitle={
              isFiltered
                ? `${filteredGames.length} juego${filteredGames.length !== 1 ? "s" : ""} encontrado${filteredGames.length !== 1 ? "s" : ""}`
                : `${products.length} juego${products.length !== 1 ? "s" : ""} disponible${products.length !== 1 ? "s" : ""} en GameZone`
            }
            emptyQuery={query.trim() || undefined}
            allGames={products}
            onClearSearch={isFiltered ? () => { setQuery(""); setPlatform(null); } : undefined}
          />
        )}
      </main>
      <ScrollToTop />
    </>
  );
}

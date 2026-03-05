"use client";

import { useEffect, useMemo, useState } from "react";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/Header";
import { GameGrid } from "@/components/GameGrid";
import { useSearch } from "@/contexts/SearchContext";
import type { ProductPreview } from "@/types/product";

export default function HomePage() {
  const { query, platform } = useSearch();
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"es" | "en">("es");

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

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products");
        if (!response.ok) {
          setProducts([]);
          return;
        }
        const payload = (await response.json()) as { products?: ProductPreview[] };
        setProducts(payload.products ?? []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((game) => {
      const matchesText = !q || game.name.toLowerCase().includes(q);
      const matchesPlatform =
        !platform || game.platform.toLowerCase() === platform.toLowerCase();
      return matchesText && matchesPlatform;
    });
  }, [query, platform, products]);

  return (
    <>
      <Hero
        products={filteredGames.length > 0 ? filteredGames : products}
        headerSlot={<Header />}
      />
      <main className="main-wrapper">
        {loading ? (
          <p className="section-subtitle">
            {lang === "en" ? "Loading products..." : "Cargando productos..."}
          </p>
        ) : null}
        <GameGrid games={filteredGames} />
      </main>
    </>
  );
}

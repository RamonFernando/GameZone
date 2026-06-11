"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { Hero } from "@/components/Hero";
import { Header } from "@/components/Header";
import { GameGrid } from "@/components/GameGrid";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useSearch } from "@/contexts/SearchContext";
import { useLocale } from "@/hooks/useLocale";
import type { HomeHeroSection, ProductPreview } from "@/types/product";

const MarketIntelligenceSections = dynamic(
  () =>
    import("../components/MarketIntelligenceSections").then(
      (module) => module.MarketIntelligenceSections
    ),
  {
    ssr: false,
    loading: () => (
      <section className="market-intel market-intel--loading" aria-label="Cargando datos de mercado">
        <p className="section-subtitle">Preparando datos de mercado...</p>
      </section>
    ),
  }
);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSearchTokens(value: string) {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

function getDistance(a: string, b: string) {
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function isCloseMatch(token: string, candidates: string[]) {
  if (token.length < 4) return false;
  const maxDistance = token.length > 7 ? 2 : 1;

  return candidates.some((candidate) => {
    if (candidate.length < 4) return false;
    return getDistance(token, candidate) <= maxDistance;
  });
}

function scoreProductSearch(game: ProductPreview, queryText: string) {
  const normalizedQuery = normalizeSearchText(queryText);
  const tokens = getSearchTokens(queryText);

  if (!normalizedQuery || tokens.length === 0) {
    return 1;
  }

  const name = normalizeSearchText(game.name);
  const slug = normalizeSearchText(game.slug);
  const platform = normalizeSearchText(game.platform);
  const storeLabel = normalizeSearchText(game.storeLabel);
  const region = normalizeSearchText(game.region);
  const cardSubtitle = normalizeSearchText(game.cardSubtitle);
  const description = normalizeSearchText(game.description);
  const nameWords = getSearchTokens(`${game.name} ${game.slug}`);

  let score = 0;

  if (name === normalizedQuery) score += 1000;
  if (name.startsWith(normalizedQuery)) score += 800;
  if (name.includes(normalizedQuery)) score += 650;
  if (slug.includes(normalizedQuery)) score += 500;

  for (const token of tokens) {
    let tokenScore = 0;

    if (name.split(" ").includes(token)) tokenScore = Math.max(tokenScore, 140);
    if (name.includes(token)) tokenScore = Math.max(tokenScore, 110);
    if (slug.includes(token)) tokenScore = Math.max(tokenScore, 90);
    if (platform.includes(token)) tokenScore = Math.max(tokenScore, 70);
    if (storeLabel.includes(token)) tokenScore = Math.max(tokenScore, 65);
    if (region.includes(token)) tokenScore = Math.max(tokenScore, 45);
    if (cardSubtitle.includes(token)) tokenScore = Math.max(tokenScore, 40);
    if (description.includes(token)) tokenScore = Math.max(tokenScore, 25);
    if (isCloseMatch(token, nameWords)) tokenScore = Math.max(tokenScore, 35);

    if (tokenScore === 0) {
      return 0;
    }

    score += tokenScore;
  }

  return score;
}

type HomeClientProps = {
  initialProducts: ProductPreview[];
  initialHeroSections: HomeHeroSection[];
};

export function HomeClient({ initialProducts, initialHeroSections }: HomeClientProps) {
  const { query, setQuery, platform } = useSearch();
  const [products, setProducts] = useState<ProductPreview[]>(initialProducts);
  const lang = useLocale();
  useScrollMemory(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get("q") ?? "";

    if (urlQuery) {
      setQuery(urlQuery);
      params.delete("q");
      const nextSearch = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}#game-results`
      );
      window.requestAnimationFrame(() => {
        document.getElementById("game-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }, [setQuery]);

  // El catálogo llega cacheado del servidor (igual para todos los usuarios);
  // el estado personal de likes se hidrata aparte tras el primer render.
  useEffect(() => {
    let cancelled = false;

    const loadLikes = async () => {
      try {
        const response = await fetch("/api/products/likes", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { likedIds?: string[] };
        const likedIds = payload.likedIds ?? [];
        if (cancelled || likedIds.length === 0) return;

        const liked = new Set(likedIds);
        setProducts((previous) =>
          previous.map((product) =>
            liked.has(product.id) ? { ...product, likedByCurrentUser: true } : product
          )
        );
      } catch {
        // Usuario anónimo o error de red: la home funciona sin marcar likes.
      }
    };

    void loadLikes();

    return () => {
      cancelled = true;
    };
  }, []);

  const popularSuggestions = useMemo(
    () => [...products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 4),
    [products]
  );

  const filteredGames = useMemo(() => {
    const normalizedPlatform = platform ? normalizeSearchText(platform) : "";
    const rankedGames = products
      .map((game) => ({ game, score: scoreProductSearch(game, query) }))
      .filter(({ game, score }) => {
        const gamePlatform = normalizeSearchText(game.platform);
        const matchesPlatform =
          !normalizedPlatform ||
          gamePlatform === normalizedPlatform ||
          gamePlatform.includes(normalizedPlatform);

        return score > 0 && matchesPlatform;
      });

    if (!query.trim()) {
      return rankedGames.map(({ game }) => game);
    }

    return rankedGames
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.game.discountPercent !== a.game.discountPercent) {
          return b.game.discountPercent - a.game.discountPercent;
        }
        return a.game.name.localeCompare(b.game.name);
      })
      .map(({ game }) => game);
  }, [query, platform, products]);

  return (
    <>
      <Hero
        products={products}
        heroSections={initialHeroSections}
        headerSlot={<Header topTransparentOnTop />}
      />
      <section
        className="trust-bar"
        aria-label={lang === "en" ? "Why shop with us" : "Por qué comprar con nosotros"}
      >
        <div className="trust-bar-inner">
          <div className="trust-item">
            <span className="trust-item-icon" aria-hidden="true">⚡</span>
            <span className="trust-item-label">
              {lang === "en" ? "Instant delivery" : "Entrega inmediata"}
            </span>
          </div>
          <div className="trust-item">
            <span className="trust-item-icon" aria-hidden="true">🔒</span>
            <span className="trust-item-label">
              {lang === "en" ? "Secure payment" : "Pago seguro"}
            </span>
            <div className="trust-payment-logos">
              <Image src="/payment/visa.svg" alt="VISA" width={36} height={16} unoptimized />
              <Image src="/payment/mastercard.svg" alt="Mastercard" width={28} height={16} unoptimized />
              <Image src="/payment/paypal.svg" alt="PayPal" width={36} height={16} unoptimized />
            </div>
          </div>
          <div className="trust-item">
            <span className="trust-item-icon" aria-hidden="true">🎧</span>
            <span className="trust-item-label">
              {lang === "en" ? "24h support" : "Soporte 24h"}
            </span>
          </div>
        </div>
      </section>
      <main className="main-wrapper">
        <MarketIntelligenceSections />
        <GameGrid
          games={filteredGames}
          isFiltered={Boolean(query.trim()) || Boolean(platform)}
          emptyQuery={query}
          popularSuggestions={popularSuggestions}
          onClearSearch={() => setQuery("")}
        />
      </main>
      <ScrollToTop />
    </>
  );
}

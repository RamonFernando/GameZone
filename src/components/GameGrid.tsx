"use client";

import { useEffect, useState } from "react";
import type { ProductPreview } from "@/types/product";
import { GameCard } from "@/components/GameCard";

type Props = {
  games: ProductPreview[];
};

export function GameGrid({ games }: Props) {
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

  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {lang === "en" ? "Latest releases" : "Últimos lanzamientos"}
          </h2>
          <p className="section-subtitle">
            {lang === "en"
              ? "Recently released games. Discover the latest in the gaming world!"
              : "Juegos lanzados recientemente. ¡Descubre lo último en el mundo gaming!"}
          </p>
        </div>
      </div>
      <div className="grid-games">
        {games.length === 0 ? (
          <p className="section-subtitle">
            {lang === "en"
              ? "We couldn't find games with that title. Try another one."
              : "No hemos encontrado juegos con el título buscado. Prueba con otro título."}
          </p>
        ) : (
          <div className="grid-games">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
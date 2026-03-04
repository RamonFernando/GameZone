"use client";

import type { ProductPreview } from "@/types/product";
import { GameCard } from "@/components/GameCard";

type Props = {
  games: ProductPreview[];
};

export function GameGrid({ games }: Props) {
  return (
    <section>
      <div className="section-header">
        <div>
          <h2 className="section-title">Últimos lanzamientos</h2>
          <p className="section-subtitle">
            Juegos lanzados recientemente. ¡Descubre lo último en
            el mundo gaming!
          </p>
        </div>
      </div>
      <div className="grid-games">
        {games.length === 0 ? (
          <p className="section-subtitle">
            No hemos encontrado juegos con el título buscado. Prueba con otro título.
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
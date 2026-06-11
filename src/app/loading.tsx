export default function Loading() {
  return (
    <div className="game-grid-skeleton" aria-busy="true" aria-label="Cargando catálogo">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="game-card-skeleton">
          <div className="game-card-skeleton__media" />
          <div className="game-card-skeleton__body">
            <div className="game-card-skeleton__line game-card-skeleton__line--title" />
            <div className="game-card-skeleton__line game-card-skeleton__line--subtitle" />
            <div className="game-card-skeleton__line game-card-skeleton__line--price" />
          </div>
        </div>
      ))}
    </div>
  );
}

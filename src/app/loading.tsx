export default function Loading() {
  return (
    <main className="main-wrapper">
      <div className="section-header" aria-hidden="true">
        <div>
          <div
            className="game-card-skeleton__line game-card-skeleton__line--title"
            style={{ height: "1.5rem", width: "13rem", marginBottom: "0.5rem" }}
          />
          <div
            className="game-card-skeleton__line game-card-skeleton__line--subtitle"
            style={{ height: "0.9rem", width: "21rem" }}
          />
        </div>
      </div>
      <div className="game-grid-skeleton" aria-busy="true" aria-label="Cargando catálogo…">
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
    </main>
  );
}

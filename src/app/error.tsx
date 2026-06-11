"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-boundary">
      <h1>Algo ha fallado</h1>
      <p>No hemos podido cargar esta página. Inténtalo de nuevo.</p>
      <button type="button" className="button-primary" onClick={() => reset()}>
        Reintentar
      </button>
    </main>
  );
}

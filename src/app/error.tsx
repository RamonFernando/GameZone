"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error boundary capturó un fallo de ruta.", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
  }, [error]);

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

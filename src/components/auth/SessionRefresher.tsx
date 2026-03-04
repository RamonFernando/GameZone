// Componente invisible que refresca silenciosamente la sesión en segundo plano.
"use client";

import { useEffect } from "react";

// Llama al endpoint de refresh una vez cuando se monta la página.
export function SessionRefresher() {
  useEffect(() => {
    const runRefresh = async () => {
      try {
        await fetch("/api/auth/refresh", { method: "POST" });
      } catch {
        // No interrumpimos la UI si falla el refresh silencioso.
      }
    };

    void runRefresh();
  }, []);

  return null;
}

"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const KEY_PREFIX = "scroll:";

const getScrollY = () =>
  window.scrollY || document.documentElement.scrollTop || 0;

const showPage = () => {
  document.body.style.opacity = "";
  document.body.style.pointerEvents = "";
};

export function useScrollMemory(ready = false) {
  const pathname = usePathname();
  const storageKey = KEY_PREFIX + pathname;
  const restoredRef = useRef(false);

  // Resetear flag al cambiar de ruta
  useEffect(() => {
    restoredRef.current = false;
  }, [pathname]);

  // Si hay posicion guardada: ocultar pagina para evitar el flash visual
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved || parseInt(saved, 10) === 0) return;

    document.body.style.opacity = "0";
    document.body.style.pointerEvents = "none";

    // Seguridad: mostrar siempre despues de 600ms aunque falle algo
    const safety = setTimeout(showPage, 600);
    return () => {
      clearTimeout(safety);
      showPage();
    };
  }, [storageKey]);

  // Guardar posicion en click (capture) y popstate — cubre Link y router.push()
  useEffect(() => {
    const saveNow = () => {
      const y = getScrollY();
      if (y > 0) sessionStorage.setItem(storageKey, String(y));
    };

    document.addEventListener("click", saveNow, true);
    window.addEventListener("popstate", saveNow);

    if (!ready) {
      return () => {
        document.removeEventListener("click", saveNow, true);
        window.removeEventListener("popstate", saveNow);
      };
    }

    // Guardar tambien al scrollar cuando el contenido ya esta cargado
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(saveNow);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", saveNow, true);
      window.removeEventListener("popstate", saveNow);
    };
  }, [ready, storageKey]);

  // Restaurar posicion cuando el contenido ya esta en el DOM
  useEffect(() => {
    if (!ready || restoredRef.current) return;
    restoredRef.current = true;

    const saved = sessionStorage.getItem(storageKey);
    const y = saved ? parseInt(saved, 10) : 0;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (y > 0) window.scrollTo({ top: y, behavior: "instant" });
        showPage(); // mostrar pagina YA en la posicion correcta
      });
    });
  }, [ready, storageKey]);
}

// Header principal del sitio: logo, filtros de plataforma, buscador, carrito y avatar.
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { useSearch } from "@/contexts/SearchContext";

// Datos mínimos del usuario para mostrar en el avatar de la nav.
type MiniProfile = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

// Lista de plataformas disponibles para el filtro rápido del header.
const PLATFORMS = [
  "PlayStation",
  "Xbox",
  "Nintendo",
  "PC"
];

type UiLocaleOption = {
  value: string;
  label: string;
  currency: string;
};

const UI_LOCALE_OPTIONS: UiLocaleOption[] = [
  { value: "es-ES", label: "ES · EUR", currency: "EUR" },
  { value: "en-US", label: "EN · USD", currency: "USD" },
];

// Header que envuelve logo, filtros de plataforma, buscador, carrito y avatar.
export function Header() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [miniProfile, setMiniProfile] = useState<MiniProfile | null>(null);
  const { query, setQuery, platform, setPlatform } = useSearch();
  const [uiLocale, setUiLocale] = useState<string>("es-ES");
  const [lang, setLang] = useState<"es" | "en">("es");

  // Lee el idioma/moneda preferidos (si existen) al montar.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieMap = new Map(
      document.cookie.split(";").map((entry) => {
        const [key, ...rest] = entry.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")] as const;
      })
    );
    const locale = cookieMap.get("uiLocale") ?? cookieMap.get("geoLocale") ?? "es-ES";
    setUiLocale(locale);
    setLang(locale.toLowerCase().startsWith("en") ? "en" : "es");
  }, []);

  const handleUiLocaleChange = (value: string) => {
    if (typeof document === "undefined") return;
    const option = UI_LOCALE_OPTIONS.find((opt) => opt.value === value);
    const currency = option?.currency ?? "EUR";
    const maxAge = 60 * 60 * 24 * 30; // 30 días
    document.cookie = `uiLocale=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
    document.cookie = `uiCurrency=${encodeURIComponent(currency)}; path=/; max-age=${maxAge}`;
    setUiLocale(value);
    // Recargamos la página para que todos los textos/precios se actualicen.
    window.location.reload();
  };

  // Carga un mini perfil del usuario autenticado para mostrar su avatar en la nav.
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          return;
        }
        const payload = (await res.json()) as { user?: MiniProfile };
        if (!cancelled && payload.user) {
          setMiniProfile(payload.user);
        }
      } catch {
        // Si falla, simplemente dejamos el icono genérico.
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="header-shell">
      <div className="navbar">

        {/* LOGO: reset de filtros */}
        <Link
          href="/"
          className="nav-logo"
          onClick={() => {
            setQuery("");
            setPlatform(null);
          }}
        >
          <div className="nav-logo-mark">
            <span>
              <span className="nav-logo-letter nav-logo-letter--big nav-logo-letter-g">G</span>
              <span className="nav-logo-letter">ame</span>
              <span className="nav-logo-letter nav-logo-letter--big nav-logo-letter-z">Z</span>
              <span className="nav-logo-letter">one</span>
            </span>
          </div>
          <div className="nav-logo-text">
            <span className="nav-logo-text-1">Digital store</span>
            <span className="nav-logo-text-2">GameZone Edition</span>
          </div>
        </Link>

        {/* PLATAFORMAS */}
<nav
  className="nav-platforms"
  aria-label={lang === "en" ? "Platforms" : "Plataformas"}
>
  {PLATFORMS.map((platformName) => {
    const iconMap: Record<string, string> = {
      PlayStation: "/iconos_platforms/icon-play.svg",
      Xbox: "/iconos_platforms/icon-xbx.svg",
      Nintendo: "/iconos_platforms/icon-swt.svg",
      PC: "/iconos_platforms/icon-pc.svg"
    };

    return (
      <button
        key={platformName}
        type="button"
        className={
          "nav-platform-pill nav-platform-with-icon" +
          (platform === platformName ? " nav-platform-pill--active" : "")
        }
        onClick={() =>
          setPlatform(platform === platformName ? null : platformName)
        }
        aria-pressed={platform === platformName}
      >
        <Image
          src={iconMap[platformName]}
          alt={platformName}
          width={16}
          height={16}
          className="nav-platform-icon"
        />
        <span className="nav-platform-text">{platformName}</span>
      </button>
    );
  })}
</nav>




        {/* ACCIONES DERECHA */}
        <div className="nav-actions">
          
          {/* BUSCADOR */}
          <div className="nav-search">
            <span className="nav-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder={lang === "en" ? "Search..." : "Buscar..."}
              className="nav-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                  setQuery("");
                }
              }}
            />
          </div>

          {/* CARRITO */}
          <button
            type="button"
            className="button-primary button-ghost button-ghost-cart"
            onClick={() => setOpen(true)}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt={lang === "en" ? "Cart" : "Carrito"}
              width={16}
              height={16}
              className="nav-cart-icon"
            />
            <span className="nav-cart-badge">{totalItems}</span>
          </button>
           {/* LOGIN / REGISTRO */}
          <Link href="/account" className="">
            {miniProfile ? (
              <div
                className="nav-auth-avatar-circle"
                style={
                  miniProfile.avatarUrl && miniProfile.avatarUrl.trim().length > 0
                    ? {
                        backgroundImage: `url("${miniProfile.avatarUrl}")`,
                      }
                    : undefined
                }
              >
                {!(miniProfile.avatarUrl && miniProfile.avatarUrl.trim().length > 0)
                  ? (miniProfile.name || miniProfile.email).trim().charAt(0).toUpperCase() ||
                    "G"
                  : null}
              </div>
            ) : (
              <Image
                src="/iconos_platforms/person_avatar_white.svg"
                alt="avatar"
                width={39}
                height={39}
                className="nav-auth-icon"
              />
            )}
          </Link>

          {/* Selector idioma/moneda */}
          <select
            className="nav-locale-select"
            aria-label="Idioma y moneda"
            value={uiLocale}
            onChange={(event) => handleUiLocaleChange(event.target.value)}
          >
            {UI_LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

        </div>
      </div>

      {open && <CartDrawer onClose={() => setOpen(false)} />}
    </header>
  );
}

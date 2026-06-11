// Header principal del sitio: logo, filtros de plataforma, buscador, carrito y avatar.
"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

type HeaderProps = {
  topTransparentOnTop?: boolean;
};

const UI_LOCALE_OPTIONS: UiLocaleOption[] = [
  { value: "es-ES", label: "ES · EUR", currency: "EUR" },
  { value: "en-US", label: "EN · USD", currency: "USD" },
];

const AUTH_CHANGED_EVENT = "gamezone:auth-changed";
const CART_OPEN_EVENT = "gamezone:cart-open";

// Header que envuelve logo, filtros de plataforma, buscador, carrito y avatar.
export function Header({ topTransparentOnTop = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [miniProfile, setMiniProfile] = useState<MiniProfile | null>(null);
  const { query, setQuery, platform, setPlatform } = useSearch();
  const [uiLocale, setUiLocale] = useState<string>("es-ES");
  const lang = useLocale();
  const [isScrolled, setIsScrolled] = useState(false);

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
  }, []);

  useEffect(() => {
    const openCart = () => setOpen(true);
    window.addEventListener(CART_OPEN_EVENT, openCart);
    return () => window.removeEventListener(CART_OPEN_EVENT, openCart);
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
        const res = await fetch("/api/account/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setMiniProfile(null);
          }
          return;
        }
        const payload = (await res.json()) as { user?: MiniProfile };
        if (!cancelled) {
          setMiniProfile(payload.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setMiniProfile(null);
        }
      }
    };

    const handleAuthChanged = () => {
      void loadProfile();
    };

    void loadProfile();
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!topTransparentOnTop) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [topTransparentOnTop]);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth > 480) {
        setMobileMenuOpen(false);
      }
    };

    closeOnDesktop();
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, []);

  const headerClassName =
    "header-shell" +
    (topTransparentOnTop ? " header-shell--fixed" : "") +
    (topTransparentOnTop ? " header-shell--top-transparent" : "") +
    (isScrolled ? " header-shell--scrolled" : "");

  const handleSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    event.currentTarget.blur();
  };

  const scrollToSearchResults = () => {
    window.requestAnimationFrame(() => {
      document.getElementById("game-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSearchChange = (value: string) => {
    const shouldScrollToResults = !query.trim() && value.trim();
    setQuery(value);

    if (pathname !== "/" && value.trim()) {
      router.push(`/?q=${encodeURIComponent(value)}#game-results`);
      setMobileMenuOpen(false);
      return;
    }

    if (shouldScrollToResults) {
      scrollToSearchResults();
    }
  };

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    setQuery("");
    setPlatform(null);

    if (pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className={headerClassName}>
      <div className="navbar">

        {/* LOGO: reset de filtros */}
        <Link
          href="/"
          className="nav-logo"
          onClick={handleLogoClick}
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
  className="nav-platforms nav-platforms--desktop"
  aria-label={t(lang, "nav.platforms")}
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
                 aria-pressed={platform === platformName ? "true" : "false"}
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
        <div className="nav-actions nav-actions--desktop">
          
          {/* BUSCADOR */}
          <div className="nav-search">
            <span className="nav-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder={lang === "en" ? "Search..." : "Buscar..."}
              className="nav-search-input"
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchEnter}
            />
          </div>

          {/* CARRITO */}
          <button
            type="button"
            className="button-primary button-ghost button-ghost-cart"
            onClick={() => setOpen(true)}
            aria-label={t(lang, "header.cart-open")(totalItems)}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="nav-cart-icon"
            />
            <span className="nav-cart-badge" aria-hidden="true">{totalItems}</span>
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

        <button
          type="button"
          className="nav-mobile-toggle"
          aria-label={mobileMenuOpen ? t(lang, "nav.close-menu") : t(lang, "nav.open-menu")}
           aria-expanded={mobileMenuOpen ? "true" : "false"}
          onClick={() => setMobileMenuOpen((value) => !value)}
        >
          <span className="nav-mobile-toggle-line" />
          <span className="nav-mobile-toggle-line" />
          <span className="nav-mobile-toggle-line" />
        </button>
      </div>

      <div className={"nav-mobile-panel" + (mobileMenuOpen ? " nav-mobile-panel--open" : "")}>
        <div className="nav-mobile-section nav-mobile-search">
          <span className="nav-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder={lang === "en" ? "Search..." : "Buscar..."}
            className="nav-search-input"
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={handleSearchEnter}
          />
        </div>

        <nav className="nav-mobile-section nav-mobile-platforms" aria-label={t(lang, "nav.platforms")}>
          {PLATFORMS.map((platformName) => {
            const iconMap: Record<string, string> = {
              PlayStation: "/iconos_platforms/icon-play.svg",
              Xbox: "/iconos_platforms/icon-xbx.svg",
              Nintendo: "/iconos_platforms/icon-swt.svg",
              PC: "/iconos_platforms/icon-pc.svg"
            };

            return (
              <button
                key={`mobile-${platformName}`}
                type="button"
                className={
                  "nav-platform-pill nav-platform-with-icon" +
                  (platform === platformName ? " nav-platform-pill--active" : "")
                }
                onClick={() => {
                  setPlatform(platform === platformName ? null : platformName);
                  setMobileMenuOpen(false);
                }}
                 aria-pressed={platform === platformName ? "true" : "false"}
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

        <div className="nav-mobile-section nav-mobile-actions">
          <button
            type="button"
            className="button-primary button-ghost button-ghost-cart"
            onClick={() => {
              setOpen(true);
              setMobileMenuOpen(false);
            }}
            aria-label={t(lang, "header.cart-open")(totalItems)}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className="nav-cart-icon"
            />
            <span className="nav-cart-badge" aria-hidden="true">{totalItems}</span>
          </button>

          <Link
            href="/account"
            className="nav-mobile-account-link"
            onClick={() => setMobileMenuOpen(false)}
          >
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

          <select
            className="nav-locale-select"
            aria-label="Idioma y moneda"
            value={uiLocale}
            onChange={(event) => handleUiLocaleChange(event.target.value)}
          >
            {UI_LOCALE_OPTIONS.map((opt) => (
              <option key={`mobile-${opt.value}`} value={opt.value}>
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

// Header principal del sitio: logo, filtros de plataforma, buscador, carrito y avatar.
"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useLocale } from "@/hooks/useLocale";
import { t } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/features/CartDrawer";
import { useSearch } from "@/contexts/SearchContext";
import styles from "./Header.module.scss";

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
  const headerRef = useRef<HTMLElement>(null);

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
        const hasSessionIndicator = document.cookie.split(";").some(
          (c) => c.trim().startsWith("gz_auth=1")
        );
        const isAuthenticatedArea =
          pathname?.startsWith("/account") ||
          pathname?.startsWith("/checkout") ||
          pathname?.startsWith("/admin");
        if (!hasSessionIndicator && !isAuthenticatedArea) {
          if (!cancelled) setMiniProfile(null);
          return;
        }
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
  }, [pathname]);

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

  // Cierra el menú móvil al tocar/hacer click fuera del header.
  // pointerdown unifica mouse y touch en un solo evento — funciona en iOS/Android/PC.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleOutside = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutside);

    return () => {
      document.removeEventListener("pointerdown", handleOutside);
    };
  }, [mobileMenuOpen]);

  const headerClassName = [
    styles.headerShell,
    "header-shell",
    topTransparentOnTop ? styles.headerShellFixed : "",
    topTransparentOnTop ? "header-shell--fixed" : "",
    topTransparentOnTop ? styles.headerShellTopTransparent : "",
    isScrolled ? styles.headerShellScrolled : "",
  ].filter(Boolean).join(" ");

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

    if (pathname !== "/" && pathname !== "/games" && value.trim()) {
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
    <header ref={headerRef} className={headerClassName}>
      <div className={styles.navbar}>

        {/* LOGO: reset de filtros */}
        <Link
          href="/"
          className={styles.navLogo}
          onClick={handleLogoClick}
        >
          <div className={styles.navLogoMark}>
            <span>
              <span className={`${styles.navLogoLetter} ${styles.navLogoLetterBig} ${styles.navLogoLetterG}`}>G</span>
              <span className={styles.navLogoLetter}>ame</span>
              <span className={`${styles.navLogoLetter} ${styles.navLogoLetterBig} ${styles.navLogoLetterZ}`}>Z</span>
              <span className={styles.navLogoLetter}>one</span>
            </span>
          </div>
          <div className={styles.navLogoText}>
            <span className={styles.navLogoText1}>Digital store</span>
            <span className={styles.navLogoText2}>GameZone Edition</span>
          </div>
        </Link>

        {/* PLATAFORMAS */}
<nav
  className={`${styles.navPlatforms} ${styles.navPlatformsDesktop}`}
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
        className={`${styles.navPlatformPill} ${styles.navPlatformWithIcon}${platform === platformName ? ` ${styles.navPlatformPillActive}` : ""}`}
        onClick={() => {
          const next = platform === platformName ? null : platformName;
          setPlatform(next);
          if (next) scrollToSearchResults();
        }}
        aria-pressed={platform === platformName ? "true" : "false"}
      >
        <Image
          src={iconMap[platformName]}
          alt={platformName}
          width={16}
          height={16}
          className={styles.navPlatformIcon}
        />
        <span className={styles.navPlatformText}>{platformName}</span>
      </button>
    );
  })}
</nav>




        {/* ACCIONES DERECHA */}
        <div className={`${styles.navActions} ${styles.navActionsDesktop}`}>

          {/* BUSCADOR */}
          <div className={styles.navSearch}>
            <span className={styles.navSearchIcon} aria-hidden="true">🔍</span>
            <input
              type="text"
              placeholder={lang === "en" ? "Search..." : "Buscar..."}
              className={styles.navSearchInput}
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchEnter}
            />
          </div>

          {/* CARRITO */}
          <button
            type="button"
            className={`button-primary button-ghost ${styles.buttonGhostCart}`}
            onClick={() => setOpen(true)}
            aria-label={t(lang, "header.cart-open")(totalItems)}
          >
            <Image
              src="/iconos_platforms/carritoCompra2.svg"
              alt=""
              aria-hidden="true"
              width={16}
              height={16}
              className={styles.navCartIcon}
            />
            <span className={styles.navCartBadge} aria-hidden="true">{totalItems}</span>
          </button>
           {/* LOGIN / REGISTRO */}
          <Link href="/account" className="">
            {miniProfile ? (
              <div
                className={styles.navAuthAvatarCircle}
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
                className={styles.navAuthIcon}
              />
            )}
          </Link>

          {/* Selector idioma/moneda */}
          <select
            className={styles.navLocaleSelect}
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
          className={styles.navMobileToggle}
          aria-label={mobileMenuOpen ? t(lang, "nav.close-menu") : t(lang, "nav.open-menu")}
           aria-expanded={mobileMenuOpen ? "true" : "false"}
          onClick={() => setMobileMenuOpen((value) => !value)}
        >
          <span className={styles.navMobileToggleLine} />
          <span className={styles.navMobileToggleLine} />
          <span className={styles.navMobileToggleLine} />
        </button>
      </div>

      <div className={`${styles.navMobilePanel}${mobileMenuOpen ? ` ${styles.navMobilePanelOpen}` : ""}`}>
        <div className={`${styles.navMobileSection} ${styles.navMobileSearch}`}>
          <span className={styles.navSearchIcon} aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder={lang === "en" ? "Search..." : "Buscar..."}
            className={styles.navSearchInput}
            value={query}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={handleSearchEnter}
          />
        </div>

        <nav className={`${styles.navMobileSection} ${styles.navMobilePlatforms}`} aria-label={t(lang, "nav.platforms")}>
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
                className={`${styles.navPlatformPill} ${styles.navPlatformWithIcon}${platform === platformName ? ` ${styles.navPlatformPillActive}` : ""}`}
                onClick={() => {
                  const next = platform === platformName ? null : platformName;
                  setPlatform(next);
                  setMobileMenuOpen(false);
                  if (next) scrollToSearchResults();
                }}
                aria-pressed={platform === platformName ? "true" : "false"}
              >
                <Image
                  src={iconMap[platformName]}
                  alt={platformName}
                  width={16}
                  height={16}
                  className={styles.navPlatformIcon}
                />
                <span className={styles.navPlatformText}>{platformName}</span>
              </button>
            );
          })}
        </nav>

        <div className={`${styles.navMobileSection} ${styles.navMobileActions}`}>
          <button
            type="button"
            className={`button-primary button-ghost ${styles.buttonGhostCart}`}
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
              className={styles.navCartIcon}
            />
            <span className={styles.navCartBadge} aria-hidden="true">{totalItems}</span>
          </button>

          <Link
            href="/account"
            className={styles.navMobileAccountLink}
            onClick={() => setMobileMenuOpen(false)}
          >
            {miniProfile ? (
              <div
                className={styles.navAuthAvatarCircle}
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
                className={styles.navAuthIcon}
              />
            )}
          </Link>

          <select
            className={styles.navLocaleSelect}
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

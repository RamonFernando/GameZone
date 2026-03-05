"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PAYMENT_METHODS = [
  { name: "PayPal", src: "/payment/paypal.svg", size: "large" as const, wide: false },
  { name: "VISA", src: "/payment/visa.svg", size: "ref" as const, wide: false },
  { name: "Mastercard", src: "/payment/mastercard.svg", size: "small" as const, wide: false },
  { name: "Discover", src: "/payment/discover.svg", size: "large" as const, wide: false },
  { name: "Paysafecard", src: "/payment/paysafecard.svg", size: "xlarge" as const, wide: true },
] as const;

const LOCALE_OPTIONS = [
  { code: "ES", currency: "EUR", label: "Español / EUR" },
  { code: "EN", currency: "USD", label: "English / USD" },
] as const;

export function Footer() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const [localeIndex, setLocaleIndex] = useState(0);
  const [localeOpen, setLocaleOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieMap = new Map(
      document.cookie.split(";").map((entry) => {
        const [key, ...rest] = entry.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")] as const;
      })
    );
    const locale = cookieMap.get("uiLocale") ?? cookieMap.get("geoLocale") ?? "es-ES";
    setLang(locale.toLowerCase().startsWith("en") ? "en" : "es");
    setLocaleIndex(locale.toLowerCase().startsWith("en") ? 1 : 0);
  }, []);

  const year = new Date().getFullYear();
  const currentLocale = LOCALE_OPTIONS[localeIndex];

  return (
    <footer className="footer">
      {/* Barra métodos de pago + selector idioma/moneda (estilo G2A) */}
      <div className="footer-bar">
        <div className="footer-bar-inner">
          <div className="footer-payments">
            <div className="footer-payment-icons">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method.name}
                  className={`footer-payment-icon footer-payment-icon--${method.size}${method.wide ? " footer-payment-icon--wide" : ""}`}
                  title={method.name}
                >
                  <Image
                    src={method.src}
                    alt={method.name}
                    width={method.wide ? 108 : 80}
                    height={44}
                    className="footer-payment-img"
                    unoptimized
                  />
                </span>
              ))}
            </div>
          </div>
          <div className="footer-locale-wrap">
            <div className="footer-locale">
              <button
                type="button"
                className="footer-locale-trigger"
                onClick={() => setLocaleOpen((o) => !o)}
                aria-expanded={localeOpen}
                aria-haspopup="listbox"
                aria-label={
                  lang === "en"
                    ? "Select language and currency"
                    : "Seleccionar idioma y moneda"
                }
              >
                <span className="footer-locale-globe" aria-hidden>
                  🌐
                </span>
                <span className="footer-locale-value">
                  {currentLocale.code} / {currentLocale.currency}
                </span>
                <span className="footer-locale-chevron" aria-hidden>
                  ▼
                </span>
              </button>
              {localeOpen && (
                <>
                  <div
                    className="footer-locale-backdrop"
                    aria-hidden
                    onClick={() => setLocaleOpen(false)}
                  />
                  <ul
                    className="footer-locale-dropdown"
                    role="listbox"
                    aria-label={
                      lang === "en"
                        ? "Language and currency options"
                        : "Opciones de idioma y moneda"
                    }
                  >
                    {LOCALE_OPTIONS.map((opt, i) => (
                      <li key={opt.code} role="option" aria-selected={i === localeIndex}>
                        <button
                          type="button"
                          className="footer-locale-option"
                          onClick={() => {
                            setLocaleIndex(i);
                            setLocaleOpen(false);
                            setLang(i === 0 ? "es" : "en");
                            document.cookie = `uiLocale=${i === 0 ? "es-ES" : "en-US"}; path=/; max-age=31536000`;
                            window.dispatchEvent(new Event("locale-change"));
                          }}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="footer-wrapper">
        {/* IZQUIERDA – INFO */}
        <div className="footer-info">
          <h3 className="footer-title">Next Gaming Store</h3>
          <p className="footer-text">
            {lang === "en"
              ? "Your digital store for videogames and gaming content. UI designed to offer the best experience on PlayStation, Xbox, Nintendo and PC."
              : "Tu tienda digital de videojuegos y contenido gaming. UI creada para ofrecer la mejor experiencia en plataformas PlayStation, Xbox, Nintendo y PC."}
          </p>
          <span className="footer-copy">
            © {year} Next Gaming Store.{" "}
            {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
          </span>
        </div>

        {/* DERECHA – REDES SOCIALES */}
        <div className="footer-social">
          <h4 className="footer-social-title">
            {lang === "en" ? "Follow us" : "Síguenos"}
          </h4>

          <div className="footer-icons">
            {/* youtube */}
            <a href="#" aria-label="YouTube" className="footer-icon">
              <Image
                src="/iconos_platforms/youtube2.svg"
                alt="YouTube"
                width={28}
                height={28}
                className="footer-icon-img"
                unoptimized
              />
            </a>
            {/* Instagram */}
            <a href="#" aria-label="Instagram" className="footer-icon">
              <Image
                src="/iconos_platforms/instagram.svg"
                alt="Instagram"
                width={28}
                height={28}
                className="footer-icon-img"
                unoptimized
              />
            </a>

            {/* Twitter */}
            <a href="#" aria-label="Twitter" className="footer-icon">
              <Image
                src="/iconos_platforms/twiter.svg"
                alt="Twitter"
                width={28}
                height={28}
                className="footer-icon-img"
              />
            </a>

            {/* facebook */}
            <a href="#" aria-label="Facebook" className="footer-icon">
              <Image
                src="/iconos_platforms/facebook2.svg"
                alt="Facebook"
                width={28}
                height={28}
                className="footer-icon-img"
              />
            </a>
          </div>
        </div>
      </div>

      {/* Línea legal / copyright (estilo G2A): separada por una línea del mismo ancho que footer-wrapper */}
      <div className="footer-legal">
        <div className="footer-legal-inner">
        <p className="footer-legal-text">
          {lang === "en" ? (
            <>
              Use of the platform implies acceptance of our{" "}
              <Link href="/terms" className="footer-legal-link">
                Terms and Conditions
              </Link>
              . You can find information about how we process your personal data in our{" "}
              <Link href="/privacy" className="footer-legal-link">
                Privacy Policy
              </Link>
              . Copyright © {year} Next Gaming Store. All rights reserved.
            </>
          ) : (
            <>
              El uso de la plataforma implica la aceptación de los{" "}
              <Link href="/terms" className="footer-legal-link">
                Términos y condiciones
              </Link>
              . Puedes encontrar información sobre cómo procesamos tus datos personales en la{" "}
              <Link href="/privacy" className="footer-legal-link">
                Política de privacidad
              </Link>
              . Copyright © {year} Next Gaming Store. Todos los derechos reservados.
            </>
          )}
        </p>
        </div>
      </div>
    </footer>
  );
}
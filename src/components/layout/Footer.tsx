"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import styles from "./Footer.module.scss";

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
  const lang = useLocale();
  const localeIndex = lang === "en" ? 1 : 0;
  const [localeOpen, setLocaleOpen] = useState(false);

  const year = new Date().getFullYear();
  const currentLocale = LOCALE_OPTIONS[localeIndex];

  return (
    <footer className={styles.footer}>
      {/* Barra métodos de pago + selector idioma/moneda (estilo G2A) */}
      <div className={styles["footer-bar"]}>
        <div className={styles["footer-bar-inner"]}>
          <div className={styles["footer-payments"]}>
            <div className={styles["footer-payment-icons"]}>
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method.name}
                  className={[
                    styles["footer-payment-icon"],
                    styles[`footer-payment-icon--${method.size}`],
                    method.wide ? styles["footer-payment-icon--wide"] : "",
                  ].filter(Boolean).join(" ")}
                  title={method.name}
                >
                  <Image
                    src={method.src}
                    alt={method.name}
                    width={method.wide ? 108 : 80}
                    height={44}
                    className={styles["footer-payment-img"]}
                    unoptimized
                  />
                </span>
              ))}
            </div>
          </div>
          <div className={styles["footer-locale-wrap"]}>
            <div className={styles["footer-locale"]}>
              <button
                type="button"
                className={styles["footer-locale-trigger"]}
                onClick={() => setLocaleOpen((o) => !o)}
                aria-expanded={localeOpen}
                aria-haspopup="listbox"
                aria-label={
                  lang === "en"
                    ? "Select language and currency"
                    : "Seleccionar idioma y moneda"
                }
              >
                <span className={styles["footer-locale-globe"]} aria-hidden>
                  🌐
                </span>
                <span className={styles["footer-locale-value"]}>
                  {currentLocale.code} / {currentLocale.currency}
                </span>
                <span className={styles["footer-locale-chevron"]} aria-hidden>
                  ▼
                </span>
              </button>
              {localeOpen && (
                <>
                  <div
                    className={styles["footer-locale-backdrop"]}
                    aria-hidden
                    onClick={() => setLocaleOpen(false)}
                  />
                  <ul
                    className={styles["footer-locale-dropdown"]}
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
                          className={styles["footer-locale-option"]}
                          onClick={() => {
                            setLocaleOpen(false);
                            document.cookie = `uiLocale=${i === 0 ? "es-ES" : "en-US"}; path=/; max-age=31536000`;
                            window.location.reload();
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

      <div className={styles["footer-wrapper"]}>
        {/* IZQUIERDA – INFO */}
        <div className={styles["footer-info"]}>
          <h3 className={`${styles["footer-title"]} ${styles["footer-brand-title"]}`} aria-label="Game Zone">
            <span className={styles["footer-brand-logo-lockup"]} aria-hidden="true">
              <span className={styles["footer-brand-disc"]} />
              <span className={styles["footer-brand-word"]}>
                <span>Game</span>
                <span className={styles["footer-brand-word-z"]}>Z</span>
                <span>one</span>
              </span>
            </span>
            <span>Game Zone</span>
          </h3>
          <p className={styles["footer-text"]}>
            {lang === "en"
              ? "Your digital store for videogames and gaming content. UI designed to offer the best experience on PlayStation, Xbox, Nintendo and PC."
              : "Tu tienda digital de videojuegos y contenido gaming. UI creada para ofrecer la mejor experiencia en plataformas PlayStation, Xbox, Nintendo y PC."}
          </p>
          <span className={styles["footer-copy"]}>
            © {year} Game Zone.{" "}
            {lang === "en" ? "All rights reserved." : "Todos los derechos reservados."}
          </span>
        </div>

        {/* DERECHA – REDES SOCIALES */}
        <div className={styles["footer-social"]}>
          <h4 className={styles["footer-social-title"]}>
            {lang === "en" ? "Follow us" : "Síguenos"}
          </h4>

          <div className={styles["footer-icons"]}>
            {/* youtube */}
            <a href="#" aria-label="YouTube" className={styles["footer-icon"]}>
              <Image
                src="/iconos_platforms/youtube2.svg"
                alt="YouTube"
                width={28}
                height={28}
                className={styles["footer-icon-img"]}
                unoptimized
              />
            </a>
            {/* Instagram */}
            <a href="#" aria-label="Instagram" className={styles["footer-icon"]}>
              <Image
                src="/iconos_platforms/instagram.svg"
                alt="Instagram"
                width={28}
                height={28}
                className={styles["footer-icon-img"]}
                unoptimized
              />
            </a>

            {/* Twitter */}
            <a href="#" aria-label="Twitter" className={styles["footer-icon"]}>
              <Image
                src="/iconos_platforms/twiter.svg"
                alt="Twitter"
                width={28}
                height={28}
                className={styles["footer-icon-img"]}
              />
            </a>

            {/* facebook */}
            <a href="#" aria-label="Facebook" className={styles["footer-icon"]}>
              <Image
                src="/iconos_platforms/facebook2.svg"
                alt="Facebook"
                width={28}
                height={28}
                className={styles["footer-icon-img"]}
              />
            </a>
          </div>
        </div>
      </div>

      {/* Línea legal / copyright (estilo G2A): separada por una línea del mismo ancho que footer-wrapper */}
      <div className={styles["footer-legal"]}>
        <div className={styles["footer-legal-inner"]}>
        <p className={styles["footer-legal-text"]}>
          {lang === "en" ? (
            <>
              Use of the platform implies acceptance of our{" "}
              <Link href="/terms" className={styles["footer-legal-link"]}>
                Terms and Conditions
              </Link>
              . You can find information about how we process your personal data in our{" "}
              <Link href="/privacy" className={styles["footer-legal-link"]}>
                Privacy Policy
              </Link>
              . Copyright © {year} Game Zone. All rights reserved.
            </>
          ) : (
            <>
              El uso de la plataforma implica la aceptación de los{" "}
              <Link href="/terms" className={styles["footer-legal-link"]}>
                Términos y condiciones
              </Link>
              . Puedes encontrar información sobre cómo procesamos tus datos personales en la{" "}
              <Link href="/privacy" className={styles["footer-legal-link"]}>
                Política de privacidad
              </Link>
              . Copyright © {year} Game Zone. Todos los derechos reservados.
            </>
          )}
        </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function Footer() {
  const [lang, setLang] = useState<"es" | "en">("es");

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
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="footer">
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
    </footer>
  );
}
"use client";

import Image from "next/image";

import { useLocale } from "@/hooks/useLocale";

const promoAlt = {
  es: "Promocion de la app Game Zone con codigo GAME15",
  en: "Game Zone app promotion with code GAME15",
};

export function PromoAppBanner() {
  const lang = useLocale();
  const alt = lang === "en" ? promoAlt.en : promoAlt.es;

  return (
    <section className="promo-app-banner" aria-label={alt}>
      <Image
        src="/banners/app-promo-gamezone.png"
        alt={alt}
        fill
        sizes="100vw"
        className="promo-app-banner__image"
      />
    </section>
  );
}

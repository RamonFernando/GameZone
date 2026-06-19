import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import "@/styles/globals.scss";
import "@/styles/responsive-refinements.scss";
import { ReactNode } from "react";
import { cookies } from "next/headers";
import { CartProvider } from "@/contexts/CartContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { SiteShell } from "@/components/layout/SiteShell";

const exoDisplay = Exo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const baseUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "GameZone — Tienda de videojuegos digitales",
    template: "%s · GameZone",
  },
  description:
    "Compra videojuegos digitales para PC, PlayStation, Xbox y Nintendo al mejor precio. Códigos oficiales con entrega inmediata en GameZone.",
  applicationName: "GameZone",
  keywords: [
    "videojuegos",
    "juegos digitales",
    "claves Steam",
    "ofertas gaming",
    "PC",
    "PlayStation",
    "Xbox",
    "Nintendo",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "GameZone",
    title: "GameZone — Tienda de videojuegos digitales",
    description:
      "Compra videojuegos digitales al mejor precio. Códigos oficiales con entrega inmediata.",
    url: baseUrl,
    locale: "es_ES",
    images: [{ url: "/Recursos/og-card.png", width: 1200, height: 630, alt: "GameZone" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameZone — Tienda de videojuegos digitales",
    description:
      "Compra videojuegos digitales al mejor precio. Códigos oficiales con entrega inmediata.",
    images: ["/Recursos/og-card.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "BkE1639rD38Uq4aXVpdrrztMOZzz1bE2RNu8AHR-6KI",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const uiLocale = cookieStore.get("uiLocale")?.value ?? cookieStore.get("geoLocale")?.value ?? "es-ES";
  const lang = uiLocale.slice(0, 2);
  return (
    <html lang={lang} className={exoDisplay.variable}>
      <head>
        <link rel="preconnect" href="https://shared.akamai.steamstatic.com" />
        <link rel="preconnect" href="https://cdn.akamai.steamstatic.com" />
        <link rel="preconnect" href="https://media.rawg.io" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://www.paypal.com" />
      </head>
      <body>
        <CartProvider>
          <SearchProvider>
            <SiteShell>{children}</SiteShell>
          </SearchProvider>
        </CartProvider>
      </body>
    </html>
  );
}
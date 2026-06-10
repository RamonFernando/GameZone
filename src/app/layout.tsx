import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@/styles/responsive-refinements.scss";
import { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { SiteShell } from "@/components/SiteShell";

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
    images: [{ url: "/Recursos/logo.png", alt: "GameZone" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GameZone — Tienda de videojuegos digitales",
    description:
      "Compra videojuegos digitales al mejor precio. Códigos oficiales con entrega inmediata.",
    images: ["/Recursos/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "BkE1639rD38Uq4aXVpdrrztMOZzz1bE2RNu8AHR-6KI",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
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
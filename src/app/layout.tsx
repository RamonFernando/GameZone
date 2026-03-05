import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@/styles/responsive-refinements.scss";
import { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import { SearchProvider } from "@/contexts/SearchContext";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "Next Gaming Store",
  description: "Ecommerce gaming recreado con tus recursos, listo para conectar con API.",
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
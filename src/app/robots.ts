import type { MetadataRoute } from "next";

const baseUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";

// Genera /robots.txt. Permite el catálogo público y bloquea las zonas privadas
// o sin valor SEO (API, panel admin, cuenta, checkout, flujos de auth).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/account/", "/checkout/", "/auth/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

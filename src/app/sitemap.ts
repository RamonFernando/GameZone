import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Se genera en cada petición (no en build) para reflejar el catálogo actual
// y no depender de la BD durante el build.
export const dynamic = "force-dynamic";

const baseUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/games`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
    productRoutes = products.map((product) => ({
      url: `${baseUrl}/games/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Si la BD no está disponible, devolvemos al menos las rutas estáticas.
  }

  return [...staticRoutes, ...productRoutes];
}

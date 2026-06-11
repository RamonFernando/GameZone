import { HomeClient } from "./HomeClient";
import { getCachedCatalog, getCachedHeroSections } from "@/lib/home-data";

// force-dynamic evita que el build necesite acceso a la base de datos para
// prerenderizar la home. Los datos en sí van cacheados (unstable_cache, tag
// "products", 5 min) así que la DB solo se consulta al expirar o invalidar.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, heroSections] = await Promise.all([
    getCachedCatalog(),
    getCachedHeroSections(),
  ]);

  const baseUrl =
    process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GameZone",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GameZone",
    url: baseUrl,
    logo: `${baseUrl}/Recursos/logo.png`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <HomeClient initialProducts={products} initialHeroSections={heroSections} />
    </>
  );
}

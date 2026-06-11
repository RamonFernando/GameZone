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

  return <HomeClient initialProducts={products} initialHeroSections={heroSections} />;
}

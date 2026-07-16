// Arte portrait (vertical) curado para las side cards destacadas.
//
// Las side cards de FeaturedSection son verticales (estilo G2A), pero muchos
// productos guardan en `coverImage` una imagen landscape (header de Steam,
// thumbnails de G2A, arte promocional de Epic/RAWG). Aquí resolvemos la mejor
// imagen vertical disponible para cada caso, sin tocar la base de datos:
//
//  1. Override curado por slug (verificado a mano) → tiene prioridad.
//  2. Steam: header.jpg → library_600x900.jpg (arte vertical oficial).
//  3. G2A: thumbnail pequeño → 600x876.
//  4. Si no hay nada mejor, se devuelve la original (la card aplica un fondo
//     difuminado como red de seguridad).

const STEAM_LIB = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

const IGDB_COVER = (id: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big/${id}.jpg`;

// Mapa curado slug → URL portrait. Todas las imágenes verificadas (juego correcto
// + orientación vertical). Los productos sin override (p. ej. StarCraft) usan el
// fondo difuminado de la card.
const PORTRAIT_OVERRIDES: Record<string, string> = {
  // Juegos en Steam → arte de biblioteca oficial 600×900
  "destroy-all-humans-2-reprobed": STEAM_LIB(1372280),
  "god-of-war-ragnarok": STEAM_LIB(2322010),
  "hogwarts-legacy": STEAM_LIB(990080),
  "marvel-c-s-spider-man-miles-morales": STEAM_LIB(1817070),
  "one-piece-odyssey": STEAM_LIB(1366540),
  "resident-evil-4-deluxe-edition": STEAM_LIB(2050650),
  "uncharted-coleccio-un-legado-de-los-ladrones": STEAM_LIB(1659420),
  "the-last-of-us-part-i": STEAM_LIB(1888930),
  "forspoken": STEAM_LIB(1680880),
  "elden-ring": STEAM_LIB(1245620),
  "red-dead-redemption-2-gamezone": STEAM_LIB(1174180),
  "sonic-frontiers": STEAM_LIB(1237320),
  // Productos no-Steam (monedas / no en Steam) → box-art vertical de IGDB
  "fortnite-v-bucks-pack-gamezone": IGDB_COVER("co2ekt"),
  "league-of-legends-rp-pack-gamezone": IGDB_COVER("co49wj"),
  "valorant-points-pack-gamezone": IGDB_COVER("co2mvt"),
  "minecraft-java-bedrock-edition-gamezone": IGDB_COVER("co8fu6"),
};

export function toPortraitCover(slug: string, coverImage: string): string {
  const override = PORTRAIT_OVERRIDES[slug];
  if (override) return override;

  // Steam: cualquier arte landscape (header.jpg, header_alt_*, con o sin ?t=…,
  // en cdn.akamai / shared.akamai / cdn.cloudflare) → arte vertical de biblioteca.
  // Extraemos el appId de la URL en vez de exigir que termine en /header.jpg.
  const steamApp = coverImage.match(/\/steam\/apps\/(\d+)\//);
  if (steamApp) {
    return STEAM_LIB(Number(steamApp[1]));
  }

  // G2A: upgrade small thumbnails to portrait 600×876
  if (coverImage.includes("images.g2a.com")) {
    return coverImage.replace(/\/images\/(?:58x58|230x336|0x0)\//, "/images/600x876/");
  }

  return coverImage;
}

export type Game = {
  title: string;
  coverImage: string;
  slug: string;
  price: number;
};

export const games: Game[] = [
  { title: "Destroy All Humans! 2 Reprobed", coverImage: "/games_data/Destroy All Humans! 2 Reprobed/destroy-all-humans-2-reprobed-cover.jpg", slug: "destroy-all-humans-2-reprobed",
    price: 20.49 },
  { title: "Forspoken", coverImage: "/games_data/Forspoken/forspoken-cover.jpg", slug: "forspoken",
    price: 31.99 },
  { title: "God of War - Ragnarok", coverImage: "/games_data/God of War - Ragnarok/god-of-war-ragnarok-ps5-cover.jpg", slug: "god-of-war-ragnarok",
    price: 34.99 },
  { title: "Hogwarts Legacy", coverImage: "/games_data/Hogwarts Legacy/hogwarts-legacy-cover.jpg", slug: "hogwarts-legacy",
    price: 74.99 },
  { title: "Marvel's Spider-Man - Miles Morales", coverImage: "/games_data/Marvel's Spider-Man - Miles Morales/marvel-s-spider-man-miles-morales-cover.jpg", slug: "marvel-c-s-spider-man-miles-morales",
    price: 29.99 },
  { title: "One Piece Odyssey", coverImage: "/games_data/One Piece Odyssey/one-piece-odyssey-cover.jpeg", slug: "one-piece-odyssey",
    price: 17.99 },
  { title: "Resident Evil 4 Deluxe Edition", coverImage: "/games_data/Resident Evil 4 Deluxe Edition/resident-evil-4-deluxe-edition-deluxe-cover.jpeg", slug: "resident-evil-4-deluxe-edition",
    price: 26.99 },
  { title: "Sonic Frontiers", coverImage: "/games_data/Sonic Frontiers/sonic-frontiers-cover.jpeg", slug: "sonic-frontiers",
    price: 20.99 },
  { title: "The Last of Us Part I", coverImage: "/games_data/The Last of Us Part I/the-last-of-us-part-i-cover.jpg", slug: "the-last-of-us-part-i",
    price: 39.99 },
  { title: "Uncharted - Colección Legado de los Ladrones", coverImage: "/games_data/Uncharted - Colección Legado de los Ladrones/uncharted-coleccion-legado-de-los-ladrones-cover.jpg", slug: "uncharted-coleccio-un-legado-de-los-ladrones",
    price: 19.99 },
];

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getGameBySlug(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function validateGamesCatalog(catalog: Game[]) {
  const slugSet = new Set<string>();

  for (const game of catalog) {
    if (!game.slug || slugSet.has(game.slug)) {
      throw new Error(`Slug de juego inválido o duplicado: ${game.slug || "<empty>"}`);
    }
    if (!Number.isFinite(game.price) || game.price <= 0) {
      throw new Error(`Precio inválido para juego: ${game.title}`);
    }
    slugSet.add(game.slug);
  }
}

validateGamesCatalog(games);

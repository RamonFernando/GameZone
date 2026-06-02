import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const RAWG_BASE_URL = "https://api.rawg.io/api";
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    slug: null,
    limit: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--slug") {
      args.slug = argv[i + 1] ?? null;
      i += 1;
    } else if (current === "--limit") {
      const value = Number(argv[i + 1]);
      args.limit = Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
      i += 1;
    } else if (current === "--dry-run") {
      args.dryRun = true;
    }
  }

  return args;
}

function requireRawgApiKey() {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new Error("Falta RAWG_API_KEY en .env. Crea una API key en RAWG y agregala antes de ejecutar el script.");
  }
  return key;
}

async function rawgFetch(path, params, apiKey) {
  const url = new URL(`${RAWG_BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`RAWG respondio ${response.status} para ${url.pathname}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

function toJsonList(items, mapper) {
  const mapped = (items ?? [])
    .map(mapper)
    .filter((item) => item && String(item).trim().length > 0);

  return JSON.stringify([...new Set(mapped)]);
}

function firstName(items) {
  return items?.[0]?.name ?? null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadOverrides() {
  const path = join(__dirname, "rawg-overrides.json");
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function requirementsFromPlatforms(platforms) {
  const pc = (platforms ?? []).find((item) => item.platform?.slug === "pc");
  const requirements = pc?.requirements;
  if (!requirements) return null;

  const parts = [];
  if (requirements.minimum) parts.push(`Minimos:\n${requirements.minimum}`);
  if (requirements.recommended) parts.push(`Recomendados:\n${requirements.recommended}`);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function buildUpdateData(details, screenshots) {
  return {
    longDescription: details.description_raw || null,
    rawgId: details.id ?? null,
    rawgSlug: details.slug ?? null,
    releaseDate: parseDate(details.released),
    developer: firstName(details.developers),
    publisher: firstName(details.publishers),
    genresJson: toJsonList(details.genres, (item) => item.name),
    platformsJson: toJsonList(details.platforms, (item) => item.platform?.name),
    tagsJson: toJsonList(details.tags, (item) => item.name),
    storesJson: toJsonList(details.stores, (item) => item.store?.name),
    screenshotsJson: JSON.stringify(
      (screenshots?.results ?? [])
        .map((item) => item.image)
        .filter(Boolean)
        .slice(0, 8)
    ),
    backgroundImage: details.background_image || null,
    website: details.website || null,
    esrbRating: details.esrb_rating?.name ?? null,
    metacritic: details.metacritic ?? null,
    rating: details.rating ?? null,
    ratingsCount: details.ratings_count ?? 0,
    playtimeHours: details.playtime ?? null,
    requirements: requirementsFromPlatforms(details.platforms),
    metadataSource: "RAWG",
    metadataUpdatedAt: new Date(),
  };
}

async function findRawgGame(product, apiKey, overrides) {
  const override = overrides[product.slug];
  if (override?.rawgSlug || override?.rawgId) {
    const idOrSlug = override.rawgId ?? override.rawgSlug;
    return rawgFetch(`/games/${idOrSlug}`, {}, apiKey);
  }

  const search = await rawgFetch(
    "/games",
    {
      search: product.name,
      page_size: 5,
      search_precise: true,
    },
    apiKey
  );

  const candidates = search.results ?? [];
  return candidates[0] ?? null;
}

async function enrichProduct(product, apiKey, dryRun, overrides) {
  const match = await findRawgGame(product, apiKey, overrides);
  if (!match) {
    console.log(`Sin resultado RAWG: ${product.name}`);
    return;
  }

  const detailsPromise = match.description_raw
    ? Promise.resolve(match)
    : rawgFetch(`/games/${match.id}`, {}, apiKey);

  const [details, screenshots] = await Promise.all([
    detailsPromise,
    rawgFetch(`/games/${match.id}/screenshots`, { page_size: 8 }, apiKey),
  ]);

  const updateData = buildUpdateData(details, screenshots);

  console.log(`${dryRun ? "[dry-run] " : ""}${product.name} -> ${details.name} (${details.id})`);

  if (dryRun) {
    console.log({
      developer: updateData.developer,
      publisher: updateData.publisher,
      releaseDate: updateData.releaseDate,
      genres: JSON.parse(updateData.genresJson),
      platforms: JSON.parse(updateData.platformsJson),
      screenshots: JSON.parse(updateData.screenshotsJson).length,
    });
    return;
  }

  await prisma.product.update({
    where: { id: product.id },
    data: updateData,
  });
}

async function main() {
  const apiKey = requireRawgApiKey();
  const args = parseArgs(process.argv.slice(2));
  const overrides = await loadOverrides();

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(args.slug ? { slug: args.slug } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: args.limit ?? undefined,
  });

  if (products.length === 0) {
    console.log(args.slug ? `No existe producto activo con slug ${args.slug}.` : "No hay productos activos.");
    return;
  }

  for (const product of products) {
    await enrichProduct(product, apiKey, args.dryRun, overrides);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

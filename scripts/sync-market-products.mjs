import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const includeAllSources = args.has("--all");
const pulseUrl = process.env.MARKET_PULSE_URL ?? "http://localhost:3000/api/market/pulse";
const catalogMatchSyncScore = 80;

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function validImage(value) {
  return typeof value === "string" && (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://"));
}

function inferPrice(item) {
  if (typeof item.gameZonePrice === "number") return item.gameZonePrice;
  if (typeof item.g2aPrice === "number") return item.g2aPrice;
  if (item.steamIsFree) return 0;
  if (typeof item.steamPrice === "number") return item.steamPrice;
  return null;
}

function createDescription(item) {
  return `Ficha sincronizada desde ${item.source}: ${item.signal}. Ranking #${item.rank}.`;
}

function resolveStoreLabel(item) {
  const source = String(item.source ?? "").trim().toLowerCase();
  if (source === "g2a") return "G2A";
  if (source === "steam") return "Steam";
  if (source === "rawg") return "RAWG";
  return "GameZone";
}

async function syncItem(item) {
  const matchedSlug =
    item.catalogMatch?.matchScore >= catalogMatchSyncScore ? item.catalogMatch?.slug : null;
  const slug = matchedSlug ?? slugify(item.title);
  const price = inferPrice(item);
  const existing = matchedSlug
    ? await prisma.product.findUnique({ where: { slug: matchedSlug } })
    : await prisma.product.findUnique({ where: { slug } });

  if (existing) {
    if (write) {
      await prisma.product.update({
        where: { slug: existing.slug },
        data: {
          coverImage: validImage(item.image) ? item.image : existing.coverImage,
          platform: item.platform || existing.platform,
          priceOriginal: item.source === "G2A" && typeof item.g2aPrice === "number" ? item.g2aPrice : existing.priceOriginal,
          storeLabel: resolveStoreLabel(item),
          metadataSource: item.source,
          metadataUpdatedAt: new Date(),
        },
      });
    }

    return {
      action: "updated",
      title: item.title,
      slug: existing.slug,
      reason: write ? "Producto existente actualizado." : "Dry-run: producto existente se actualizaria.",
    };
  }

  if (!validImage(item.image)) {
    return { action: "skipped", title: item.title, slug, reason: "Sin imagen valida." };
  }

  if (price === null) {
    return { action: "skipped", title: item.title, slug, reason: "Sin precio fiable." };
  }

  if (write) {
    await prisma.product.create({
      data: {
        name: item.title,
        slug,
        description: createDescription(item),
        coverImage: item.image,
        platform: item.platform || "PC",
        region: "EUROPA",
        storeLabel: resolveStoreLabel(item),
        cardSubtitle: "Codigo digital oficial",
        priceOriginal: price,
        discountPercent: 0,
        cashbackPercent: 0,
        likesCount: Math.max(0, 1000 - item.rank * 25),
        stock: 99,
        isActive: true,
        metadataSource: item.source,
        metadataUpdatedAt: new Date(),
      },
    });
  }

  return {
    action: "created",
    title: item.title,
    slug,
    reason: write ? "Producto creado desde pulso de mercado." : "Dry-run: producto se crearia.",
  };
}

async function main() {
  const response = await fetch(pulseUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar pulso de mercado: ${response.status}`);
  }

  const pulse = await response.json();
  const sections = includeAllSources
    ? pulse.sections ?? []
    : (pulse.sections ?? []).filter((section) => section.source === "G2A");
  const seen = new Set();
  const skippedSourceImageMatches = [];
  const results = [];

  for (const section of sections) {
    for (const item of section.items ?? []) {
      const key = item.catalogMatch?.slug ?? slugify(item.title);
      if (seen.has(key)) {
        if ((section.source === "RAWG" || section.source === "Steam") && item.catalogMatch?.slug) {
          skippedSourceImageMatches.push(item);
        }
        continue;
      }
      seen.add(key);
      results.push(await syncItem(item));
    }
  }

  for (const item of skippedSourceImageMatches) {
    results.push(await syncItem(item));
  }

  const summary = {
    mode: write ? "write" : "dry-run",
    sourceScope: includeAllSources ? "all" : "G2A",
    created: results.filter((result) => result.action === "created").length,
    updated: results.filter((result) => result.action === "updated").length,
    skipped: results.filter((result) => result.action === "skipped").length,
  };

  console.table(results.slice(0, 20));
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from "@/lib/prisma";
import { clampDiscountPercent } from "@/lib/products";
import { slugify } from "@/lib/games";
import { listMarketPulse, type MarketPulseItem } from "@/lib/market/pulse";

type SyncAction = "created" | "updated" | "skipped";

export type MarketProductSyncResult = {
  action: SyncAction;
  title: string;
  slug: string | null;
  reason: string;
};

function validImage(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

function inferPrice(item: MarketPulseItem) {
  if (typeof item.gameZonePrice === "number") return item.gameZonePrice;
  if (item.steamIsFree) return 0;
  if (typeof item.steamPrice === "number") return item.steamPrice;
  return null;
}

function createDescription(item: MarketPulseItem) {
  return `Ficha sincronizada desde ${item.source}: ${item.signal}. Ranking #${item.rank}.`;
}

async function syncMatchedProduct(item: MarketPulseItem) {
  const slug = item.catalogMatch.slug;

  if (!slug) {
    return null;
  }

  const updateData = {
    coverImage: validImage(item.image) ? item.image : undefined,
    platform: item.platform || undefined,
    metadataSource: item.source,
    metadataUpdatedAt: new Date(),
  };

  await prisma.product.update({
    where: { slug },
    data: updateData,
  });

  return {
    action: "updated",
    title: item.title,
    slug,
    reason: "Producto existente actualizado con imagen/datos del pulso.",
  } satisfies MarketProductSyncResult;
}

async function createMissingProduct(item: MarketPulseItem) {
  const price = inferPrice(item);
  const slug = slugify(item.title);

  if (!validImage(item.image)) {
    return {
      action: "skipped",
      title: item.title,
      slug,
      reason: "Sin imagen valida para crear producto.",
    } satisfies MarketProductSyncResult;
  }

  if (price === null) {
    return {
      action: "skipped",
      title: item.title,
      slug,
      reason: "Sin precio fiable para crear producto.",
    } satisfies MarketProductSyncResult;
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    await prisma.product.update({
      where: { slug },
      data: {
        coverImage: item.image,
        platform: item.platform,
        metadataSource: item.source,
        metadataUpdatedAt: new Date(),
      },
    });

    return {
      action: "updated",
      title: item.title,
      slug,
      reason: "Producto encontrado por slug y actualizado.",
    } satisfies MarketProductSyncResult;
  }

  await prisma.product.create({
    data: {
      name: item.title,
      slug,
      description: createDescription(item),
      coverImage: item.image,
      platform: item.platform || "PC",
      region: "EUROPA",
      storeLabel: item.source === "Steam" ? "Steam" : "Marketplace",
      cardSubtitle: "Codigo digital oficial",
      priceOriginal: price,
      discountPercent: clampDiscountPercent(0),
      cashbackPercent: 0,
      likesCount: Math.max(0, 1000 - item.rank * 25),
      stock: 99,
      isActive: true,
      metadataSource: item.source,
      metadataUpdatedAt: new Date(),
    },
  });

  return {
    action: "created",
    title: item.title,
    slug,
    reason: "Producto creado desde pulso de mercado.",
  } satisfies MarketProductSyncResult;
}

export async function syncProductsFromMarketPulse() {
  const pulse = await listMarketPulse();
  const seen = new Set<string>();
  const results: MarketProductSyncResult[] = [];

  for (const section of pulse.sections) {
    for (const item of section.items) {
      const key = item.catalogMatch.slug ?? slugify(item.title);
      if (seen.has(key)) continue;
      seen.add(key);

      const matchedResult = await syncMatchedProduct(item);
      results.push(matchedResult ?? (await createMissingProduct(item)));
    }
  }

  const created = results.filter((result) => result.action === "created").length;
  const updated = results.filter((result) => result.action === "updated").length;
  const skipped = results.filter((result) => result.action === "skipped").length;

  return {
    created,
    updated,
    skipped,
    results,
    fallbackUsed: pulse.fallbackUsed,
  };
}

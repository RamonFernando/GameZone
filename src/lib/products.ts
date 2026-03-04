import { prisma } from "@/lib/prisma";
import { games } from "@/lib/games";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  priceOriginal: number;
  discountPercent: number;
  cashbackPercent: number;
  likesCount: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(90, Math.max(0, Math.floor(value)));
}

export function computeDiscountedPrice(priceOriginal: number, discountPercent: number) {
  const discount = clampDiscountPercent(discountPercent);
  const factor = (100 - discount) / 100;
  return Number((priceOriginal * factor).toFixed(2));
}

export function clampCashbackPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(50, Math.max(0, Math.floor(value)));
}

function inferPlatformFromTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("xbox")) return "Xbox";
  if (lower.includes("nintendo")) return "Nintendo";
  if (lower.includes("playstation") || lower.includes("ps")) return "PlayStation";
  return "PC";
}

let seedPromise: Promise<void> | null = null;

async function seedProductsIfEmpty() {
  const count = await prisma.product.count();
  if (count > 0) {
    return;
  }

  const records = games.map((game) => ({
    name: game.title,
    slug: game.slug,
    description: `Compra digital de ${game.title}.`,
    coverImage: game.coverImage,
    platform: inferPlatformFromTitle(game.title),
    region: "EUROPA",
    storeLabel: "Steam",
    cardSubtitle: "Código digital oficial",
    priceOriginal: game.price,
    discountPercent: 15,
    cashbackPercent: 5,
    likesCount: 1000,
    stock: 99,
    isActive: true,
  }));

  await prisma.product.createMany({ data: records });
}

export async function ensureProductsSeeded() {
  if (!seedPromise) {
    seedPromise = seedProductsIfEmpty();
  }
  await seedPromise;
}

export async function listActiveProducts() {
  await ensureProductsSeeded();
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActiveProductBySlug(slug: string) {
  await ensureProductsSeeded();
  return prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
    },
  });
}

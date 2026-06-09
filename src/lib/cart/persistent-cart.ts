import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { computeDiscountedPrice, resolveStoreLabel } from "@/lib/products";
import type { ProductPreview } from "@/types/product";

export type PersistedCartInputItem = {
  slug?: string;
  quantity?: number;
};

export type PersistedCartItem = {
  slug: string;
  game: ProductPreview;
  quantity: number;
};

type UserCartRow = {
  quantity: number;
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
};

const MAX_CART_QUANTITY = 99;

function normalizeQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(MAX_CART_QUANTITY, Math.max(1, Math.floor(value)));
}

function productPreviewFromRow(row: UserCartRow): ProductPreview {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    coverImage: row.coverImage,
    platform: row.platform,
    region: row.region,
    storeLabel: resolveStoreLabel(row),
    cardSubtitle: row.cardSubtitle,
    priceOriginal: row.priceOriginal,
    discountPercent: row.discountPercent,
    cashbackPercent: row.cashbackPercent,
    likesCount: row.likesCount,
    priceFinal: computeDiscountedPrice(row.priceOriginal, row.discountPercent),
    stock: row.stock,
  };
}

export async function getUserCartItems(userId: string): Promise<PersistedCartItem[]> {
  const rows = await prisma.$queryRaw<UserCartRow[]>`
    SELECT
      ci.quantity,
      p.id,
      p.name,
      p.slug,
      p.description,
      p.coverImage,
      p.platform,
      p.region,
      p.storeLabel,
      p.cardSubtitle,
      p.priceOriginal,
      p.discountPercent,
      p.cashbackPercent,
      p.likesCount,
      p.stock
    FROM UserCartItem ci
    INNER JOIN Product p ON p.id = ci.productId
    WHERE ci.userId = ${userId}
      AND p.isActive = 1
    ORDER BY ci.updatedAt DESC
  `;

  return rows.map((row) => ({
    slug: row.slug,
    game: productPreviewFromRow(row),
    quantity: normalizeQuantity(row.quantity),
  }));
}

export async function replaceUserCartItems(userId: string, items: PersistedCartInputItem[]) {
  const quantityBySlug = new Map<string, number>();

  for (const item of items) {
    const slug = item.slug?.trim();
    if (!slug) continue;
    quantityBySlug.set(slug, (quantityBySlug.get(slug) ?? 0) + normalizeQuantity(item.quantity));
  }

  const slugs = Array.from(quantityBySlug.keys());
  const products =
    slugs.length > 0
      ? await prisma.product.findMany({
          where: {
            slug: { in: slugs },
            isActive: true,
          },
          select: {
            id: true,
            slug: true,
          },
        })
      : [];

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM UserCartItem WHERE userId = ${userId}`;

    for (const product of products) {
      const quantity = Math.min(MAX_CART_QUANTITY, quantityBySlug.get(product.slug) ?? 1);
      await tx.$executeRaw`
        INSERT INTO UserCartItem (id, userId, productId, quantity, createdAt, updatedAt)
        VALUES (${randomUUID()}, ${userId}, ${product.id}, ${quantity}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
    }
  });

  return getUserCartItems(userId);
}

export async function clearUserCartItems(userId: string) {
  await prisma.$executeRaw`DELETE FROM UserCartItem WHERE userId = ${userId}`;
}

export async function addUserCartItemDelta(userId: string, slug: string, delta: number) {
  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!product) return;

    if (delta > 0) {
      await tx.$executeRaw`
        INSERT INTO UserCartItem (id, userId, productId, quantity, createdAt, updatedAt)
        VALUES (${randomUUID()}, ${userId}, ${product.id}, ${Math.min(MAX_CART_QUANTITY, delta)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (userId, productId) DO UPDATE SET
          quantity = MIN(${MAX_CART_QUANTITY}, UserCartItem.quantity + ${delta}),
          updatedAt = CURRENT_TIMESTAMP
      `;
    } else {
      await tx.$executeRaw`
        UPDATE UserCartItem SET
          quantity = quantity + ${delta},
          updatedAt = CURRENT_TIMESTAMP
        WHERE userId = ${userId} AND productId = ${product.id}
      `;
      await tx.$executeRaw`
        DELETE FROM UserCartItem
        WHERE userId = ${userId} AND productId = ${product.id} AND quantity <= 0
      `;
    }
  });

  return getUserCartItems(userId);
}

export async function deleteUserCartItem(userId: string, slug: string) {
  await prisma.$executeRaw`
    DELETE FROM UserCartItem
    WHERE userId = ${userId}
      AND productId = (SELECT id FROM Product WHERE slug = ${slug} AND isActive = 1 LIMIT 1)
  `;
  return getUserCartItems(userId);
}

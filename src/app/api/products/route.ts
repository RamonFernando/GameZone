// Evita que Next intente prerenderizar esta ruta en el build:
// siempre se ejecuta de forma dinámica en el servidor.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeDiscountedPrice, listActiveProducts } from "@/lib/products";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";

export async function GET(request: Request) {
  const products = await listActiveProducts();

  let likedIds = new Set<string>();

  try {
    const token = getSessionTokenFromRequest(request);
    if (token) {
      const activeSession = await getActiveSessionFromToken(token);
      if (activeSession) {
        const likes = await prisma.productLike.findMany({
          where: {
            userId: activeSession.userId,
            productId: { in: products.map((p) => p.id) },
          },
          select: { productId: true },
        });
        likedIds = new Set(likes.map((item) => item.productId));
      }
    }
  } catch {
    // Si algo falla al resolver la sesión, simplemente no marcamos likedByCurrentUser.
  }

  return NextResponse.json(
    {
      message: "Productos cargados.",
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        coverImage: product.coverImage,
        platform: product.platform,
        region: product.region,
        storeLabel: product.storeLabel,
        cardSubtitle: product.cardSubtitle,
        priceOriginal: product.priceOriginal,
        discountPercent: product.discountPercent,
        cashbackPercent: product.cashbackPercent,
        likesCount: product.likesCount,
        likedByCurrentUser: likedIds.has(product.id),
        priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
        stock: product.stock,
      })),
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";

export type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  coverImage: string;
  platform: string;
  priceFinal: number;
  discountPercent: number;
};

export async function GET(request: Request) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const activeSession = await getActiveSessionFromToken(token);
    if (!activeSession) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const likes = await prisma.productLike.findMany({
      where: { userId: activeSession.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            coverImage: true,
            platform: true,
            priceOriginal: true,
            discountPercent: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items: WishlistItem[] = likes
      .filter((like) => like.product.isActive)
      .map((like) => ({
        id: like.product.id,
        name: like.product.name,
        slug: like.product.slug,
        coverImage: like.product.coverImage,
        platform: like.product.platform,
        priceFinal:
          like.product.priceOriginal * (1 - like.product.discountPercent / 100),
        discountPercent: like.product.discountPercent,
      }));

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

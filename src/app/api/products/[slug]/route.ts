import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { computeDiscountedPrice, getActiveProductBySlug, listActiveProducts } from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";

export async function GET(request: Request, context: { params: { slug: string } }) {
  const product = await getActiveProductBySlug(context.params.slug);
  if (!product) {
    return NextResponse.json(
      { message: "Producto no encontrado.", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
    );
  }

  let likedByCurrentUser = false;

  try {
    const token = getSessionTokenFromRequest(request);
    if (token) {
      const activeSession = await getActiveSessionFromToken(token);
      if (activeSession) {
        const like = await prisma.productLike.findUnique({
          where: {
            userId_productId: {
              userId: activeSession.userId,
              productId: product.id,
            },
          },
        });
        likedByCurrentUser = Boolean(like);
      }
    }
  } catch {
    likedByCurrentUser = false;
  }

  const suggestions = (await listActiveProducts())
    .filter((item) => item.slug !== product.slug)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      coverImage: item.coverImage,
      platform: item.platform,
      region: item.region,
      storeLabel: item.storeLabel,
      cardSubtitle: item.cardSubtitle,
      priceOriginal: item.priceOriginal,
      discountPercent: item.discountPercent,
      cashbackPercent: item.cashbackPercent,
      likesCount: item.likesCount,
      priceFinal: computeDiscountedPrice(item.priceOriginal, item.discountPercent),
    }));

  return NextResponse.json(
    {
      message: "Producto cargado.",
      product: {
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
        likedByCurrentUser,
        priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
        stock: product.stock,
      },
      suggestions,
    },
    { status: 200 }
  );
}

export async function POST(request: Request, context: { params: { slug: string } }) {
  const authResult = await requireAuth(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const { auth } = authResult;

  const slug = String(context.params.slug ?? "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json(
      { message: "Slug inválido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: { id: true, likesCount: true },
  });

  if (!product) {
    return NextResponse.json(
      { message: "Producto no encontrado.", code: "PRODUCT_NOT_FOUND" },
      { status: 404 }
    );
  }

  let likesCount = product.likesCount;
  let liked = false;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productLike.findUnique({
        where: {
          userId_productId: {
            userId: auth.userId,
            productId: product.id,
          },
        },
      });

      if (existing) {
        await tx.productLike.delete({
          where: { id: existing.id },
        });
        const updated = await tx.product.update({
          where: { id: product.id },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        });
        return { likesCount: Math.max(0, updated.likesCount), liked: false };
      }

      await tx.productLike.create({
        data: {
          userId: auth.userId,
          productId: product.id,
        },
      });
      const updated = await tx.product.update({
        where: { id: product.id },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });
      return { likesCount: updated.likesCount, liked: true };
    });

    likesCount = result.likesCount;
    liked = result.liked;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const fresh = await prisma.product.findUnique({
        where: { id: product.id },
        select: { likesCount: true },
      });
      likesCount = fresh?.likesCount ?? likesCount;
    } else {
      throw error;
    }
  }

  const response = NextResponse.json(
    {
      message: "Like registrado.",
      likesCount,
      liked,
    },
    { status: 200 }
  );

  if (auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: auth.rotatedToken,
    });
  }

  return response;
}

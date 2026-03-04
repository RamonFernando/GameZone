import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import {
  clampCashbackPercent,
  clampDiscountPercent,
  computeDiscountedPrice,
  ensureProductsSeeded,
} from "@/lib/products";

type ProductPayload = {
  name?: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  platform?: string;
  region?: string;
  storeLabel?: string;
  cardSubtitle?: string;
  priceOriginal?: number;
  discountPercent?: number;
  cashbackPercent?: number;
  likesCount?: number;
  stock?: number;
  isActive?: boolean;
};

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  await ensureProductsSeeded();
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const response = NextResponse.json(
    {
      message: "Productos cargados.",
      products: products.map((product) => ({
        ...product,
        priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
      })),
    },
    { status: 200 }
  );

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: ProductPayload;
  try {
    payload = (await request.json()) as ProductPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const name = String(payload.name ?? "").trim();
  const slug = String(payload.slug ?? "").trim().toLowerCase();
  const description = String(payload.description ?? "").trim();
  const coverImage = String(payload.coverImage ?? "").trim();
  const platform = String(payload.platform ?? "PC").trim() || "PC";
  const region = String(payload.region ?? "EUROPA").trim() || "EUROPA";
  const storeLabel = String(payload.storeLabel ?? "Steam").trim() || "Steam";
  const cardSubtitle = String(payload.cardSubtitle ?? "").trim();
  const priceOriginal = Number(payload.priceOriginal ?? 0);
  const discountPercent = clampDiscountPercent(Number(payload.discountPercent ?? 0));
  const cashbackPercent = clampCashbackPercent(Number(payload.cashbackPercent ?? 0));
  const likesCount = Math.max(0, Math.floor(Number(payload.likesCount ?? 0) || 0));
  const stock = Number(payload.stock ?? 0);
  const isActive = payload.isActive ?? true;

  if (!name || !slug || !description || !coverImage || !Number.isFinite(priceOriginal) || priceOriginal <= 0) {
    return NextResponse.json(
      { message: "Datos incompletos para crear producto.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return NextResponse.json(
      { message: "Stock inválido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        coverImage,
        platform,
        region,
        storeLabel,
        cardSubtitle,
        priceOriginal,
        discountPercent,
        cashbackPercent,
        likesCount,
        stock,
        isActive,
      },
    });

    const response = NextResponse.json(
      {
        message: "Producto creado correctamente.",
        product: {
          ...product,
          priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
        },
      },
      { status: 201 }
    );

    if (authResult.auth.rotatedToken) {
      response.cookies.set({
        ...getSessionCookieOptions(),
        value: authResult.auth.rotatedToken,
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { message: "No se pudo crear el producto (slug duplicado).", code: "CREATE_FAILED" },
      { status: 409 }
    );
  }
}

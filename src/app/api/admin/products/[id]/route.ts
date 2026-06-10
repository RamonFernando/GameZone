import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { clampCashbackPercent, clampDiscountPercent, computeDiscountedPrice } from "@/lib/products";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

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

const productSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  platform: z.string().optional(),
  region: z.string().optional(),
  storeLabel: z.string().optional(),
  cardSubtitle: z.string().optional(),
  priceOriginal: z.coerce.number().optional(),
  discountPercent: z.coerce.number().optional(),
  cashbackPercent: z.coerce.number().optional(),
  likesCount: z.coerce.number().optional(),
  stock: z.coerce.number().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = await parseJsonBody(request, productSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const updateData: ProductPayload = {};
  if (payload.name !== undefined) updateData.name = String(payload.name).trim();
  if (payload.slug !== undefined) updateData.slug = String(payload.slug).trim().toLowerCase();
  if (payload.description !== undefined) updateData.description = String(payload.description).trim();
  if (payload.coverImage !== undefined) updateData.coverImage = String(payload.coverImage).trim();
  if (payload.platform !== undefined) updateData.platform = String(payload.platform).trim();
  if (payload.region !== undefined) updateData.region = String(payload.region).trim();
  if (payload.storeLabel !== undefined) updateData.storeLabel = String(payload.storeLabel).trim();
  if (payload.cardSubtitle !== undefined) updateData.cardSubtitle = String(payload.cardSubtitle).trim();
  if (payload.priceOriginal !== undefined) updateData.priceOriginal = Number(payload.priceOriginal);
  if (payload.discountPercent !== undefined) {
    updateData.discountPercent = clampDiscountPercent(Number(payload.discountPercent));
  }
  if (payload.cashbackPercent !== undefined) {
    updateData.cashbackPercent = clampCashbackPercent(Number(payload.cashbackPercent));
  }
  if (payload.likesCount !== undefined) {
    updateData.likesCount = Math.max(0, Math.floor(Number(payload.likesCount) || 0));
  }
  if (payload.stock !== undefined) updateData.stock = Number(payload.stock);
  if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

  if (updateData.priceOriginal !== undefined && (!Number.isFinite(updateData.priceOriginal) || updateData.priceOriginal <= 0)) {
    return NextResponse.json(
      { message: "Precio original inválido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  if (updateData.stock !== undefined && (!Number.isInteger(updateData.stock) || updateData.stock < 0)) {
    return NextResponse.json(
      { message: "Stock inválido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const { id } = await context.params;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    const response = NextResponse.json(
      {
        message: "Producto actualizado correctamente.",
        product: {
          ...product,
          priceFinal: computeDiscountedPrice(product.priceOriginal, product.discountPercent),
        },
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
  } catch {
    return NextResponse.json(
      { message: "No se pudo actualizar el producto.", code: "UPDATE_FAILED" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { id } = await context.params;

  try {
    await prisma.product.delete({
      where: { id },
    });

    const response = NextResponse.json(
      { message: "Producto eliminado correctamente." },
      { status: 200 }
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
      { message: "No se pudo eliminar el producto.", code: "DELETE_FAILED" },
      { status: 400 }
    );
  }
}

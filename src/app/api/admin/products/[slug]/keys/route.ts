import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/services/auth/require-auth";
import { PERMISSIONS } from "@/services/auth/permissions";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const addKeysSchema = z.object({
  keys: z.string().min(1),
  platform: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_READ);
  if (!authResult.ok) return authResult.response;

  const { slug } = await context.params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { slug: true } });
  if (!product) {
    return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
  }

  const keys = await prisma.gameKey.findMany({
    where: { productSlug: slug },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyCode: true,
      platform: true,
      assignedOrderId: true,
      assignedItemId: true,
      assignedAt: true,
      createdAt: true,
    },
  });

  const available = keys.filter((k) => k.assignedOrderId === null).length;
  return NextResponse.json({ keys, available });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) return authResult.response;

  const { slug } = await context.params;
  const product = await prisma.product.findUnique({ where: { slug }, select: { slug: true, platform: true } });
  if (!product) {
    return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, addKeysSchema);
  if (!parsed.ok) return parsed.response;

  const platform = parsed.data.platform ?? product.platform ?? "PC";
  const rawKeys = parsed.data.keys
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  if (rawKeys.length === 0) {
    return NextResponse.json({ message: "No se encontraron claves válidas." }, { status: 400 });
  }

  const uniqueKeys = [...new Set(rawKeys)];

  const existing = await prisma.gameKey.findMany({
    where: { keyCode: { in: uniqueKeys } },
    select: { keyCode: true },
  });
  const existingSet = new Set(existing.map((k) => k.keyCode));
  const newKeys = uniqueKeys.filter((k) => !existingSet.has(k));

  if (newKeys.length === 0) {
    return NextResponse.json({ message: "Todas las claves ya existen.", added: 0 });
  }

  await prisma.gameKey.createMany({
    data: newKeys.map((keyCode) => ({ productSlug: slug, keyCode, platform })),
  });

  return NextResponse.json({ added: newKeys.length, duplicates: uniqueKeys.length - newKeys.length });
}

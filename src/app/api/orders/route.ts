import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ORDER_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const orders = await prisma.order.findMany({
    where: {
      userId: authResult.auth.userId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20,
  });

  const response = NextResponse.json(
    {
      message: "Pedidos cargados correctamente.",
      orders,
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

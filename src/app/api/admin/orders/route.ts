import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";

type AllowedStatus = "pending" | "paid" | "failed" | "refunded";
type AllowedProvider = "stripe" | "paypal" | "manual";

function parseStatus(raw: string | null): AllowedStatus | null {
  if (!raw) return null;
  if (raw === "pending" || raw === "paid" || raw === "failed" || raw === "refunded") {
    return raw;
  }
  return null;
}

function parseProvider(raw: string | null): AllowedProvider | null {
  if (!raw) return null;
  if (raw === "stripe" || raw === "paypal" || raw === "manual") {
    return raw;
  }
  return null;
}

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_ORDERS_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const requestUrl = new URL(request.url);
  const status = parseStatus(requestUrl.searchParams.get("status"));
  const provider = parseProvider(requestUrl.searchParams.get("provider"));

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(provider ? { paymentProvider: provider } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const response = NextResponse.json(
    {
      message: "Pedidos cargados.",
      filters: { status, provider },
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

import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { syncProductsFromMarketPulse } from "@/lib/market/product-sync";

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const sync = await syncProductsFromMarketPulse({ dryRun });
  const response = NextResponse.json(
    {
      message: dryRun
        ? "Previsualizacion de sincronizacion de mercado."
        : "Productos sincronizados desde pulso de mercado.",
      sync,
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

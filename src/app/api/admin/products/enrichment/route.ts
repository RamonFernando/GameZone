import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { PRODUCTS_CACHE_TAG } from "@/lib/home-data";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import {
  enrichCatalogProductsFromRawg,
  getCatalogQualityReport,
} from "@/lib/market/rawg-enrichment";

export const dynamic = "force-dynamic";

function withRotatedCookie<T>(payload: T, status: number, rotatedToken?: string) {
  const response = NextResponse.json(payload, { status });
  if (rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: rotatedToken,
    });
  }
  return response;
}

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));
  const report = await getCatalogQualityReport(limit);

  return withRotatedCookie(
    {
      message: "Auditoria de catalogo cargada.",
      report,
    },
    200,
    authResult.auth.rotatedToken ?? undefined
  );
}

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") ?? 12) || 12));

  const enrichment = await enrichCatalogProductsFromRawg({ dryRun, limit });
  const report = await getCatalogQualityReport(24);

  // Un dry run no escribe en DB; solo invalidar la home cacheada tras enriquecer.
  if (!dryRun) {
    revalidateTag(PRODUCTS_CACHE_TAG, "max");
  }

  return withRotatedCookie(
    {
      message: dryRun ? "Previsualizacion de enriquecimiento lista." : "Enriquecimiento RAWG ejecutado.",
      enrichment,
      report,
    },
    200,
    authResult.auth.rotatedToken ?? undefined
  );
}

import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import {
  CatalogSyncBlockedError,
  getCatalogSyncStatus,
  runCatalogSync,
} from "@/lib/market/catalog-sync";

export const dynamic = "force-dynamic";

function serializeRun(run: Awaited<ReturnType<typeof getCatalogSyncStatus>>["latestRun"]) {
  if (!run) return null;

  return {
    id: run.id,
    status: run.status,
    mode: run.mode,
    triggeredBy: run.triggeredBy,
    triggeredByUserId: run.triggeredByUserId,
    sources: JSON.parse(run.sourcesJson) as string[],
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    createdCount: run.createdCount,
    updatedCount: run.updatedCount,
    skippedCount: run.skippedCount,
    fallbackUsed: run.fallbackUsed,
    dryRun: run.dryRun,
    error: run.error,
  };
}

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_CATALOG_SYNC);
  if (!authResult.ok) {
    return authResult.response;
  }

  const status = await getCatalogSyncStatus();
  const response = NextResponse.json(
    {
      latestRun: serializeRun(status.latestRun),
      runningRun: serializeRun(status.runningRun),
      lastWriteSuccess: serializeRun(status.lastWriteSuccess),
      canRunToday: status.canRunToday,
      canForce: authResult.auth.role === "SUPER_ADMIN",
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
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_CATALOG_SYNC);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const force = searchParams.get("force") === "1" && authResult.auth.role === "SUPER_ADMIN";

  let result: Awaited<ReturnType<typeof runCatalogSync>>;
  try {
    result = await runCatalogSync({
      dryRun,
      force,
      triggeredBy: "admin",
      triggeredByUserId: authResult.auth.userId,
    });
  } catch (error) {
    if (error instanceof CatalogSyncBlockedError) {
      return NextResponse.json(
        { message: error.message, code: error.code, lastRunId: error.lastRunId },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "No se pudo sincronizar mercado.",
        code: "SYNC_FAILED",
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json(
    {
      message: dryRun
        ? "Previsualizacion de sincronizacion de mercado."
        : "Productos sincronizados desde pulso de mercado.",
      sync: result.sync,
      run: serializeRun(result.run),
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

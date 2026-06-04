import { NextResponse } from "next/server";
import { CatalogSyncBlockedError, runCatalogSync } from "@/lib/market/catalog-sync";

export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && getBearerToken(request) === secret);
}

async function handleCatalogCron(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { message: "Cron no autorizado.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const result = await runCatalogSync({
      dryRun: false,
      triggeredBy: "cron",
    });

    return NextResponse.json(
      {
        message: "Catalogos sincronizados por cron.",
        sync: result.sync,
        runId: result.run.id,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof CatalogSyncBlockedError) {
      return NextResponse.json(
        { message: error.message, code: error.code, lastRunId: error.lastRunId },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "No se pudo ejecutar el cron.",
        code: "SYNC_FAILED",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleCatalogCron(request);
}

export async function POST(request: Request) {
  return handleCatalogCron(request);
}

import { prisma } from "@/lib/prisma";
import { syncProductsFromMarketPulse } from "@/lib/market/product-sync";

export type CatalogSyncTrigger = "admin" | "cron";
export type CatalogSyncStatus = "running" | "success" | "failed" | "skipped";

export type CatalogSyncOptions = {
  dryRun?: boolean;
  force?: boolean;
  triggeredBy: CatalogSyncTrigger;
  triggeredByUserId?: string | null;
};

const SOURCES = ["G2A", "Steam", "RAWG"] as const;
const LOCK_WINDOW_MS = 30 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export class CatalogSyncBlockedError extends Error {
  code: "SYNC_ALREADY_RUNNING" | "SYNC_RECENTLY_COMPLETED";
  lastRunId?: string;

  constructor(input: { code: CatalogSyncBlockedError["code"]; message: string; lastRunId?: string }) {
    super(input.message);
    this.name = "CatalogSyncBlockedError";
    this.code = input.code;
    this.lastRunId = input.lastRunId;
  }
}

function recentDate(ms: number) {
  return new Date(Date.now() - ms);
}

function serializeSources() {
  return JSON.stringify(SOURCES);
}

export async function getCatalogSyncStatus() {
  const [latestRun, runningRun] = await Promise.all([
    prisma.catalogSyncRun.findFirst({
      orderBy: { startedAt: "desc" },
    }),
    prisma.catalogSyncRun.findFirst({
      where: {
        status: "running",
        startedAt: { gte: recentDate(LOCK_WINDOW_MS) },
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const lastWriteSuccess = await prisma.catalogSyncRun.findFirst({
    where: {
      status: "success",
      dryRun: false,
    },
    orderBy: { finishedAt: "desc" },
  });

  return {
    latestRun,
    runningRun,
    lastWriteSuccess,
    canRunToday:
      !lastWriteSuccess ||
      lastWriteSuccess.finishedAt === null ||
      lastWriteSuccess.finishedAt.getTime() <= Date.now() - DAILY_WINDOW_MS,
  };
}

async function assertCatalogSyncCanStart(options: CatalogSyncOptions) {
  const runningRun = await prisma.catalogSyncRun.findFirst({
    where: {
      status: "running",
      startedAt: { gte: recentDate(LOCK_WINDOW_MS) },
    },
    orderBy: { startedAt: "desc" },
  });

  if (runningRun) {
    throw new CatalogSyncBlockedError({
      code: "SYNC_ALREADY_RUNNING",
      message: "Ya hay una sincronizacion de catalogos en curso.",
      lastRunId: runningRun.id,
    });
  }

  if (options.dryRun || options.force) {
    return;
  }

  const lastWriteSuccess = await prisma.catalogSyncRun.findFirst({
    where: {
      status: "success",
      dryRun: false,
      finishedAt: { gte: recentDate(DAILY_WINDOW_MS) },
    },
    orderBy: { finishedAt: "desc" },
  });

  if (lastWriteSuccess) {
    throw new CatalogSyncBlockedError({
      code: "SYNC_RECENTLY_COMPLETED",
      message: "Los catalogos ya se sincronizaron en las ultimas 24 horas.",
      lastRunId: lastWriteSuccess.id,
    });
  }
}

export async function runCatalogSync(options: CatalogSyncOptions) {
  await assertCatalogSyncCanStart(options);

  const dryRun = options.dryRun ?? false;
  const run = await prisma.catalogSyncRun.create({
    data: {
      status: "running",
      mode: dryRun ? "dry-run" : "write",
      triggeredBy: options.triggeredBy,
      triggeredByUserId: options.triggeredByUserId ?? null,
      sourcesJson: serializeSources(),
      dryRun,
    },
  });

  try {
    const sync = await syncProductsFromMarketPulse({ dryRun });
    const completedRun = await prisma.catalogSyncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        createdCount: sync.created,
        updatedCount: sync.updated,
        skippedCount: sync.skipped,
        fallbackUsed: sync.fallbackUsed,
      },
    });

    return {
      run: completedRun,
      sync,
    };
  } catch (error) {
    const failedRun = await prisma.catalogSyncRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : "Error desconocido sincronizando catalogos.",
      },
    });

    throw Object.assign(error instanceof Error ? error : new Error("Error sincronizando catalogos."), {
      syncRun: failedRun,
    });
  }
}

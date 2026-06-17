import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type RateLimitScope = "register" | "verify" | "resend" | "login" | "2fa-verify";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
  upstashWindow: `${number} m`;
};

type RateLimitResult =
  | { blocked: false; remaining: number }
  | { blocked: true; retryAfterSeconds: number };

const RATE_LIMIT_CONFIG: Record<RateLimitScope, RateLimitConfig> = {
  register: { limit: 5, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  verify: { limit: 12, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  resend: { limit: 4, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  login: { limit: 8, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
  "2fa-verify": { limit: 5, windowMs: 10 * 60 * 1000, upstashWindow: "10 m" },
};

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  upstashUrl && upstashToken
    ? new Redis({
        url: upstashUrl,
        token: upstashToken,
      })
    : null;

const upstashLimiters = redis
  ? Object.fromEntries(
      Object.entries(RATE_LIMIT_CONFIG).map(([scope, config]) => [
        scope,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.limit, config.upstashWindow),
          analytics: false,
          prefix: `gamezone:auth:${scope}`,
        }),
      ])
    )
  : null;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown-ip";
  }
  return request.headers.get("x-real-ip") ?? "unknown-ip";
}

async function enforceUpstashRateLimit(
  key: string,
  scope: RateLimitScope
): Promise<RateLimitResult | null> {
  const limiter = upstashLimiters?.[scope];
  if (!limiter) {
    return null;
  }

  try {
    const result = await limiter.limit(key);
    if (!result.success) {
      return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    }

    return { blocked: false, remaining: result.remaining };
  } catch (error) {
    logger.error("Upstash rate limit failed; falling back to database rate limit.", {
      scope,
      err: error,
    });
    return null;
  }
}

/**
 * Persistent database fallback. It survives restarts and keeps local/dev working
 * when Upstash credentials are not configured. If the DB fails, fail open so auth
 * routes do not go down because of the limiter.
 */
async function enforceDatabaseRateLimit(
  key: string,
  scope: RateLimitScope
): Promise<RateLimitResult> {
  const now = Date.now();
  const { limit, windowMs } = RATE_LIMIT_CONFIG[scope];

  try {
    const incremented = await prisma.rateLimitBucket.updateMany({
      where: { key, resetAt: { gt: new Date(now) } },
      data: { count: { increment: 1 } },
    });

    if (incremented.count === 0) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now + windowMs) },
        update: { count: 1, resetAt: new Date(now + windowMs) },
      });
      return { blocked: false, remaining: limit - 1 };
    }

    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
    if (!bucket) {
      return { blocked: false, remaining: limit - 1 };
    }

    if (bucket.count > limit) {
      return {
        blocked: true,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt.getTime() - now) / 1000)),
      };
    }

    return { blocked: false, remaining: Math.max(0, limit - bucket.count) };
  } catch (error) {
    logger.error("Database rate limit failed; request allowed.", {
      scope,
      err: error,
    });
    return { blocked: false, remaining: limit - 1 };
  }
}

export async function enforceRateLimit(
  request: Request,
  scope: RateLimitScope
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const upstashResult = await enforceUpstashRateLimit(key, scope);

  if (upstashResult) {
    return upstashResult;
  }

  return enforceDatabaseRateLimit(key, scope);
}

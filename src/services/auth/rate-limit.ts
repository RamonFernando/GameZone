import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown-ip";
  }
  return request.headers.get("x-real-ip") ?? "unknown-ip";
}

function getConfigForScope(scope: "register" | "verify" | "resend" | "login" | "2fa-verify") {
  const configs = {
    register: { limit: 5, windowMs: 10 * 60 * 1000 },
    verify: { limit: 12, windowMs: 10 * 60 * 1000 },
    resend: { limit: 4, windowMs: 10 * 60 * 1000 },
    login: { limit: 8, windowMs: 10 * 60 * 1000 },
    "2fa-verify": { limit: 5, windowMs: 10 * 60 * 1000 },
  } as const;

  return configs[scope];
}

type RateLimitResult =
  | { blocked: false; remaining: number }
  | { blocked: true; retryAfterSeconds: number };

/**
 * Rate limit persistente respaldado en la base de datos. A diferencia de un
 * contador en memoria, sobrevive a reinicios/redeploys y es compartido entre
 * instancias. Si la DB falla, hacemos "fail open" para no tumbar el login.
 */
export async function enforceRateLimit(
  request: Request,
  scope: "register" | "verify" | "resend" | "login" | "2fa-verify"
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const { limit, windowMs } = getConfigForScope(scope);

  try {
    // Atomic increment: only touches an active bucket (resetAt still in the future).
    // This eliminates the TOCTOU race between the old findUnique+update pattern.
    const incremented = await prisma.rateLimitBucket.updateMany({
      where: { key, resetAt: { gt: new Date(now) } },
      data: { count: { increment: 1 } },
    });

    if (incremented.count === 0) {
      // No active bucket or window expired — open a fresh window.
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
        retryAfterSeconds: Math.ceil((bucket.resetAt.getTime() - now) / 1000),
      };
    }

    return { blocked: false, remaining: Math.max(0, limit - bucket.count) };
  } catch (error) {
    logger.error("Fallo en rate limit persistente; se permite la petición.", {
      scope,
      err: error,
    });
    return { blocked: false, remaining: limit - 1 };
  }
}

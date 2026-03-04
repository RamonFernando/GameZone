type Bucket = {
  count: number;
  resetAt: number;
};

const inMemoryBuckets = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown-ip";
  }
  return request.headers.get("x-real-ip") ?? "unknown-ip";
}

function getConfigForScope(scope: "register" | "verify" | "resend" | "login") {
  const configs = {
    register: { limit: 5, windowMs: 10 * 60 * 1000 },
    verify: { limit: 12, windowMs: 10 * 60 * 1000 },
    resend: { limit: 4, windowMs: 10 * 60 * 1000 },
    login: { limit: 8, windowMs: 10 * 60 * 1000 },
  } as const;

  return configs[scope];
}

export function enforceRateLimit(
  request: Request,
  scope: "register" | "verify" | "resend" | "login"
) {
  const ip = getClientIp(request);
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const { limit, windowMs } = getConfigForScope(scope);
  const previousBucket = inMemoryBuckets.get(key);

  if (!previousBucket || previousBucket.resetAt <= now) {
    inMemoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false as const, remaining: limit - 1 };
  }

  if (previousBucket.count >= limit) {
    return {
      blocked: true as const,
      retryAfterSeconds: Math.ceil((previousBucket.resetAt - now) / 1000),
    };
  }

  previousBucket.count += 1;
  inMemoryBuckets.set(key, previousBucket);

  return {
    blocked: false as const,
    remaining: limit - previousBucket.count,
  };
}

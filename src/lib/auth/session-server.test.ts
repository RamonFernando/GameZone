import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { rotateSessionToken } from "@/lib/auth/session-server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((arg: unknown) => {
      if (typeof arg === "function") return (arg as (tx: unknown) => unknown)({});
      return Promise.all(arg as Promise<unknown>[]);
    }),
  },
}));

import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeSessionRecord(token: string, userId: string, email: string, overrides?: object) {
  return {
    id: "session-jti-placeholder", // se sobreescribe en cada test con el jti real
    userId,
    tokenHash: hashToken(token),
    revokedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastSeenAt: new Date(), // reciente → no dispara el debounce de lastSeenAt
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    user: { id: userId, email, isVerified: true, role: "USER" },
    ...overrides,
  };
}

describe("rotateSessionToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SESSION_SECRET = "test-session-secret-long-enough-for-vitest";
  });

  it("devuelve null cuando la sesión no existe en la base de datos", async () => {
    const token = await createSessionToken({ userId: "u1", email: "u@test.com" });
    vi.mocked(prisma.session.findUnique).mockResolvedValueOnce(null);

    const result = await rotateSessionToken(token);

    expect(result).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("devuelve null para una sesión revocada", async () => {
    const token = await createSessionToken({ userId: "u1", email: "u@test.com" });
    const payload = await verifySessionToken(token);

    const revokedRecord = makeSessionRecord(token, "u1", "u@test.com", {
      id: payload!.jti,
      revokedAt: new Date(), // revocada
    });

    vi.mocked(prisma.session.findUnique).mockResolvedValueOnce(revokedRecord as never);

    const result = await rotateSessionToken(token);

    expect(result).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("revoca la sesión anterior y devuelve un token nuevo válido", async () => {
    const token = await createSessionToken({ userId: "u1", email: "u@test.com" });
    const payload = await verifySessionToken(token);

    const sessionRecord = makeSessionRecord(token, "u1", "u@test.com", {
      id: payload!.jti,
    });

    // Primera llamada: getActiveSessionFromToken → session con user incluido
    // Segunda llamada: obtener ipAddress/userAgent para la nueva sesión
    vi.mocked(prisma.session.findUnique)
      .mockResolvedValueOnce(sessionRecord as never)
      .mockResolvedValueOnce({ ipAddress: "127.0.0.1", userAgent: "vitest" } as never);

    const newToken = await rotateSessionToken(token);

    // El token resultante es diferente al original
    expect(newToken).not.toBeNull();
    expect(newToken).not.toBe(token);

    // El nuevo token es criptográficamente válido
    const newPayload = await verifySessionToken(newToken!);
    expect(newPayload).not.toBeNull();
    expect(newPayload!.sub).toBe("u1");

    // La transacción se ejecutó una vez (revocación + creación)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

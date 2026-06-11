import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue({ blocked: false, remaining: 4 }),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionCookieOptions: vi.fn(() => ({
    name: "gamezone_session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })),
}));

vi.mock("@/lib/auth/session-server", () => ({
  createPersistedSession: vi.fn().mockResolvedValue("session-token"),
}));

vi.mock("@/lib/auth/email", () => ({
  sendTwoFactorCodeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/store", () => {
  class AccountNotVerifiedError extends Error {}
  class InvalidCredentialsError extends Error {}

  return {
    AccountNotVerifiedError,
    InvalidCredentialsError,
    authenticateUser: vi.fn(),
    hashToken: vi.fn((token: string) => `hashed:${token}`),
    hashTwoFactorCode: vi.fn((code: string) => `hashed-code:${code}`),
    verifyTwoFactorCode: vi.fn().mockReturnValue(true),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    loginChallenge: {
      create: vi.fn(),
    },
  },
}));

import { sendTwoFactorCodeEmail } from "@/lib/auth/email";
import { createPersistedSession } from "@/lib/auth/session-server";
import { authenticateUser, verifyTwoFactorCode } from "@/lib/auth/store";
import { prisma } from "@/lib/prisma";
import { POST as loginPost } from "./login/route";
import { POST as verifyEmail2faPost } from "./2fa/verify/route";

const TWO_FACTOR_USER = {
  id: "user-1",
  email: "gamer@example.com",
  name: "Gamer",
  role: "USER",
  pushAuthEnabled: false,
  totpEnabled: false,
  twoFactorEnabled: true,
  twoFactorChannel: "email",
};

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("login + email 2FA route flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pide segundo factor tras credenciales válidas y crea sesión al verificar el código", async () => {
    vi.mocked(authenticateUser).mockResolvedValueOnce(TWO_FACTOR_USER as never);
    vi.mocked(prisma.user.update)
      .mockResolvedValueOnce({
        id: "user-1",
        email: "gamer@example.com",
        name: "Gamer",
      } as never)
      .mockResolvedValueOnce({} as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      ...TWO_FACTOR_USER,
      twoFactorCodeHash: "stored-hash",
      twoFactorCodeExpiresAt: new Date(Date.now() + 60_000),
    } as never);

    const loginResponse = await loginPost(
      jsonRequest("https://gamezone.test/api/auth/login", {
        identifier: "gamer@example.com",
        password: "correct-password",
      })
    );
    const loginPayload = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginPayload).toMatchObject({
      code: "TWO_FACTOR_REQUIRED",
      challengeId: "user-1",
    });
    expect(sendTwoFactorCodeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "gamer@example.com",
        username: "Gamer",
      })
    );
    expect(createPersistedSession).not.toHaveBeenCalled();

    const verifyResponse = await verifyEmail2faPost(
      jsonRequest("https://gamezone.test/api/auth/2fa/verify", {
        challengeId: "user-1",
        code: "123456",
      })
    );
    const verifyPayload = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(verifyPayload).toMatchObject({
      code: "LOGIN_OK",
      role: "USER",
    });
    expect(verifyTwoFactorCode).toHaveBeenCalledWith("123456", "stored-hash");
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: {
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
      },
    });
    expect(createPersistedSession).toHaveBeenCalledWith(
      { userId: "user-1", email: "gamer@example.com" },
      expect.any(Request)
    );
    expect(verifyResponse.headers.get("set-cookie")).toContain("gamezone_session=session-token");
  });

  it("rechaza un código 2FA incorrecto sin crear sesión", async () => {
    vi.mocked(verifyTwoFactorCode).mockReturnValueOnce(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      ...TWO_FACTOR_USER,
      twoFactorCodeHash: "stored-hash",
      twoFactorCodeExpiresAt: new Date(Date.now() + 60_000),
    } as never);

    const response = await verifyEmail2faPost(
      jsonRequest("https://gamezone.test/api/auth/2fa/verify", {
        challengeId: "user-1",
        code: "000000",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "TWO_FACTOR_CODE_INVALID" });
    expect(createPersistedSession).not.toHaveBeenCalled();
  });
});

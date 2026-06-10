import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { decryptSecret } from "@/lib/crypto/totp-secret";
import { createPersistedSession } from "@/lib/auth/session-server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const verifyTotpSchema = z.object({
  challengeId: z.string().optional(),
  code: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, verifyTotpSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const rl = await enforceRateLimit(request, "2fa-verify");
  if (rl.blocked) {
    return NextResponse.json(
      { message: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfterSeconds}s.`, code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const challengeId = (payload.challengeId ?? "").trim();
  const code = (payload.code ?? "").trim();

  if (!challengeId || !code) {
    return NextResponse.json(
      { message: "Código y usuario son obligatorios.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: challengeId },
  });

  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json(
      { message: "2FA con app no está configurado para este usuario.", code: "TOTP_NOT_ENABLED" },
      { status: 400 }
    );
  }

  const { valid: isValid } = await verify({
    secret: decryptSecret(user.totpSecret),
    token: code,
    epochTolerance: 1,
  });
  if (!isValid) {
    return NextResponse.json(
      { message: "Código incorrecto o caducado.", code: "TOTP_CODE_INVALID" },
      { status: 400 }
    );
  }

  const sessionToken = await createPersistedSession(
    {
      userId: user.id,
      email: user.email,
    },
    request
  );

  const response = NextResponse.json(
    {
      message: `Bienvenido de nuevo, ${user.name}.`,
      code: "LOGIN_OK",
      role: user.role,
    },
    { status: 200 }
  );

  response.cookies.set({
    ...getSessionCookieOptions(),
    value: sessionToken,
  });

  return response;
}

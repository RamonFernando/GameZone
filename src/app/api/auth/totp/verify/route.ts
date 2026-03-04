import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";
import { createPersistedSession } from "@/lib/auth/session-server";
import { getSessionCookieOptions } from "@/lib/auth/session";

type VerifyTotpPayload = {
  challengeId?: string;
  code?: string;
};

export async function POST(request: Request) {
  let payload: VerifyTotpPayload;
  try {
    payload = (await request.json()) as VerifyTotpPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
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

  const isValid = authenticator.check(code, user.totpSecret);
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


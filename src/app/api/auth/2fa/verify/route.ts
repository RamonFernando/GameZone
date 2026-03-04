import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/store";
import { createPersistedSession } from "@/lib/auth/session-server";
import { getSessionCookieOptions } from "@/lib/auth/session";

type VerifyPayload = {
  challengeId?: string;
  code?: string;
};

export async function POST(request: Request) {
  let payload: VerifyPayload;
  try {
    payload = (await request.json()) as VerifyPayload;
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

  if (!user || !user.twoFactorEnabled || !user.twoFactorCodeHash) {
    return NextResponse.json(
      { message: "Desafío 2FA no encontrado o expirado.", code: "TWO_FACTOR_INVALID" },
      { status: 400 }
    );
  }

  if (!user.twoFactorCodeExpiresAt || user.twoFactorCodeExpiresAt.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCodeHash: null,
        twoFactorCodeExpiresAt: null,
      },
    });
    return NextResponse.json(
      { message: "El código ha expirado. Solicita uno nuevo.", code: "TWO_FACTOR_EXPIRED" },
      { status: 400 }
    );
  }

  const submittedHash = hashToken(code);
  if (submittedHash !== user.twoFactorCodeHash) {
    return NextResponse.json(
      { message: "Código incorrecto.", code: "TWO_FACTOR_CODE_INVALID" },
      { status: 400 }
    );
  }

  // Código correcto: limpiamos el reto y creamos sesión
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
    },
  });

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


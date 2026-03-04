import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPersistedSession } from "@/lib/auth/session-server";
import { getSessionCookieOptions } from "@/lib/auth/session";

type CheckPayload = {
  challengeId?: string;
};

export async function POST(request: Request) {
  let payload: CheckPayload;
  try {
    payload = (await request.json()) as CheckPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const challengeId = (payload.challengeId ?? "").trim();
  if (!challengeId) {
    return NextResponse.json(
      { message: "Falta el identificador de desafío.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const challenge = await prisma.loginChallenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return NextResponse.json(
      { message: "Desafío no encontrado.", code: "PUSH_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: { status: "expired", resolvedAt: new Date() },
    });
    return NextResponse.json(
      { message: "El desafío ha expirado. Vuelve a iniciar sesión.", code: "PUSH_EXPIRED" },
      { status: 400 }
    );
  }

  if (challenge.status === "pending") {
    return NextResponse.json(
      { message: "Esperando tu aprobación desde el email o dispositivo.", code: "PUSH_PENDING" },
      { status: 200 }
    );
  }

  if (challenge.status === "denied") {
    return NextResponse.json(
      { message: "Has rechazado este inicio de sesión.", code: "PUSH_DENIED" },
      { status: 400 }
    );
  }

  // approved -> creamos sesión
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Usuario no encontrado para este desafío.", code: "PUSH_USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  const sessionToken = await createPersistedSession(
    {
      userId: user.id,
      email: user.email,
    },
    request
  );

  // Limpiamos el desafío para que no se reutilice
  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: {
      status: "approved",
      resolvedAt: new Date(),
    },
  });

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


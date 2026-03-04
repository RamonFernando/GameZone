import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challengeId = (url.searchParams.get("challengeId") ?? "").trim();
  const token = (url.searchParams.get("token") ?? "").trim();
  const decision = (url.searchParams.get("decision") ?? "approve").trim();

  if (!challengeId || !token) {
    return new NextResponse("Solicitud inválida.", { status: 400 });
  }

  const tokenHash = hashToken(token);

  const challenge = await prisma.loginChallenge.findUnique({
    where: { tokenHash },
  });

  if (!challenge || challenge.id !== challengeId) {
    return new NextResponse("Enlace no válido o ya utilizado.", { status: 400 });
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    await prisma.loginChallenge.update({
      where: { id: challenge.id },
      data: {
        status: "expired",
        resolvedAt: new Date(),
      },
    });
    return new NextResponse("El enlace ha expirado. Vuelve a iniciar sesión.", { status: 400 });
  }

  const nextStatus = decision === "deny" ? "denied" : "approved";

  await prisma.loginChallenge.update({
    where: { id: challenge.id },
    data: {
      status: nextStatus,
      resolvedAt: new Date(),
    },
  });

  const message =
    nextStatus === "approved"
      ? "Has aprobado el inicio de sesión. Vuelve a la pestaña donde estabas iniciando sesión y continúa."
      : "Has rechazado el inicio de sesión. Si no eras tú, tu cuenta está protegida.";

  return new NextResponse(message, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}


import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { authenticator } from "otplib";

type EnableTotpPayload = {
  secret?: string;
  code?: string;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: EnableTotpPayload;
  try {
    payload = (await request.json()) as EnableTotpPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const secret = (payload.secret ?? "").trim();
  const code = (payload.code ?? "").trim();

  if (!secret || !code) {
    return NextResponse.json(
      { message: "Se requieren secreto y código de verificación.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const isValid = authenticator.check(code, secret);
  if (!isValid) {
    return NextResponse.json(
      { message: "El código de la app no es válido. Revisa que el reloj del dispositivo esté ajustado.", code: "TOTP_CODE_INVALID" },
      { status: 400 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: authResult.auth.userId },
    data: {
      totpEnabled: true,
      totpSecret: secret,
      // opcional: desactivar otros factores automáticos si quieres que solo quede TOTP
      // twoFactorEnabled: false,
      // pushAuthEnabled: false,
    },
    select: {
      id: true,
      email: true,
      totpEnabled: true,
    },
  });

  return NextResponse.json(
    {
      message: "2FA con app (Google Authenticator, Authy, etc.) activado correctamente.",
      totpEnabled: updatedUser.totpEnabled,
    },
    { status: 200 }
  );
}


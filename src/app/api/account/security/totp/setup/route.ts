import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getUserById } from "@/lib/auth/store";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const user = await getUserById(authResult.auth.userId);
  if (!user) {
    return NextResponse.json(
      { message: "No se encontró el usuario.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (user.totpEnabled && user.totpSecret) {
    return NextResponse.json(
      {
        message:
          "Ya tienes configurado 2FA con app. Si quieres cambiarlo, primero desactívalo y vuelve a activarlo.",
        code: "TOTP_ALREADY_ENABLED",
      },
      { status: 400 }
    );
  }

  const secret = generateSecret();
  const label = user.email || user.name || "usuario";
  const issuer = "GameZone";
  const otpauthUrl = generateURI({
    issuer,
    label,
    secret,
  });

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json(
    {
      message:
        "Escanea el código QR con tu app de autenticación y luego introduce el código para activarlo.",
      secret,
      otpauthUrl,
      qrDataUrl,
    },
    { status: 200 }
  );
}


import { NextResponse } from "next/server";
import {
  InvalidPasswordResetTokenError,
  PasswordResetTokenExpiredError,
  resetPasswordWithToken,
} from "@/lib/auth/store";

import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const resetPasswordSchema = z.object({
  token: z.string().optional(),
  password: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const token = String(payload.token ?? "").trim();
  const password = String(payload.password ?? "");

  if (!token) {
    return NextResponse.json(
      { message: "Falta el token de recuperación.", code: "MISSING_TOKEN" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "La contraseña debe tener al menos 8 caracteres.", code: "WEAK_PASSWORD" },
      { status: 400 }
    );
  }

  try {
    await resetPasswordWithToken({ token, password });
    return NextResponse.json(
      { message: "Contraseña actualizada. Ya puedes iniciar sesión." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PasswordResetTokenExpiredError) {
      return NextResponse.json(
        { message: "El enlace ha caducado. Solicita uno nuevo.", code: "TOKEN_EXPIRED" },
        { status: 400 }
      );
    }

    if (error instanceof InvalidPasswordResetTokenError) {
      return NextResponse.json(
        { message: "El enlace no es válido o ya fue usado.", code: "TOKEN_INVALID" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo restablecer la contraseña.", code: "RESET_FAILED" },
      { status: 500 }
    );
  }
}

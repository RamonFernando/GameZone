import { NextResponse } from "next/server";

export const maxDuration = 30;

import { sendVerificationEmail } from "@/lib/auth/email";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  createRawVerificationToken,
  createUserWithVerificationToken,
  deleteUserByEmail,
  DuplicateEmailError,
} from "@/lib/auth/store";

import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rateLimit = await enforceRateLimit(request, "register");
  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        message: `Demasiados intentos de registro. Intenta de nuevo en ${rateLimit.retryAfterSeconds}s.`,
      },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, registerSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { message: "Solicitud inválida. Verifica los datos enviados." },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Todos los campos son obligatorios." },
      { status: 400 }
    );
  }

  if (name.length < 3) {
    return NextResponse.json(
      { message: "El nombre de usuario debe tener al menos 3 caracteres." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { message: "El email no tiene un formato válido." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  const verificationToken = createRawVerificationToken();
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const verificationUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(
    verificationToken
  )}`;

  try {
    await createUserWithVerificationToken({
      name,
      email,
      password,
      verificationToken,
      verificationTokenExpiresAt,
    });
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json(
        { message: "Este email ya está registrado." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo crear la cuenta en este momento." },
      { status: 500 }
    );
  }

  try {
    await sendVerificationEmail({
      to: email,
      username: name,
      verificationUrl,
    });
  } catch {
    await deleteUserByEmail(email);
    return NextResponse.json(
      { message: "No se pudo enviar el correo de verificación. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Cuenta creada. Revisa tu email para verificarla." },
    { status: 201 }
  );
}

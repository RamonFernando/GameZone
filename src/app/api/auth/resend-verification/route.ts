import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/auth/email";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  AccountAlreadyVerifiedError,
  createRawVerificationToken,
  getUserByEmail,
  InvalidCredentialsError,
  refreshVerificationTokenForEmail,
} from "@/lib/auth/store";

type ResendPayload = {
  email?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "resend");
  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        message: `Demasiados intentos. Intenta de nuevo en ${rateLimit.retryAfterSeconds}s.`,
        code: "RATE_LIMIT",
      },
      { status: 429 }
    );
  }

  let payload: ResendPayload;
  try {
    payload = (await request.json()) as ResendPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { message: "Ingresa un email válido.", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  const existingUser = await getUserByEmail(email);
  if (!existingUser) {
    return NextResponse.json(
      {
        message: "Si tu email existe, recibirás un nuevo enlace de verificación.",
        code: "RESEND_ACCEPTED",
      },
      { status: 200 }
    );
  }

  if (existingUser.isVerified) {
    return NextResponse.json(
      { message: "La cuenta ya está verificada.", code: "ALREADY_VERIFIED" },
      { status: 409 }
    );
  }

  const verificationToken = createRawVerificationToken();
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const verificationUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(
    verificationToken
  )}`;

  try {
    await refreshVerificationTokenForEmail({
      email,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await sendVerificationEmail({
      to: email,
      username: existingUser.name,
      verificationUrl,
    });
  } catch (error) {
    if (error instanceof AccountAlreadyVerifiedError) {
      return NextResponse.json(
        { message: "La cuenta ya está verificada.", code: "ALREADY_VERIFIED" },
        { status: 409 }
      );
    }

    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { message: "No se pudo procesar la solicitud.", code: "RESEND_FAILED" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo reenviar el correo.", code: "RESEND_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "Te enviamos un nuevo enlace de verificación.",
      code: "RESEND_SENT",
    },
    { status: 200 }
  );
}

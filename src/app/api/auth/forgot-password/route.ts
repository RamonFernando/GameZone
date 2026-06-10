import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import {
  createRawPasswordResetToken,
  getUserByEmail,
  setPasswordResetToken,
} from "@/lib/auth/store";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const forgotPasswordSchema = z.object({
  email: z.string().optional(),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { message: "Ingresa un email válido.", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  const genericMessage =
    "Si el email existe, recibirás un enlace para restablecer la contraseña.";
  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ message: genericMessage }, { status: 200 });
  }

  const resetToken = createRawPasswordResetToken();
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await setPasswordResetToken({
    email,
    resetToken,
    resetTokenExpiresAt,
  });

  const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      username: user.name || user.email,
      resetUrl,
    });
  } catch (error) {
    const isLocalRequest = new URL(request.url).hostname === "localhost";
    if (!isLocalRequest) {
      logger.error("No se pudo enviar email de recuperación.", { err: error });
      return NextResponse.json(
        { message: "No se pudo enviar el email de recuperación.", code: "EMAIL_SEND_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: genericMessage,
        resetUrl,
        warning: "Email no enviado en local; usa este enlace para probar.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ message: genericMessage }, { status: 200 });
}

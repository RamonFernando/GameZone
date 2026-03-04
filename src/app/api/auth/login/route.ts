import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { createPersistedSession } from "@/lib/auth/session-server";
import {
  authenticateUser,
  AccountNotVerifiedError,
  ensureMasterAdminUser,
  InvalidCredentialsError,
  hashToken,
} from "@/lib/auth/store";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorCodeEmail } from "@/lib/auth/email";

type LoginPayload = {
  identifier?: string;
  password?: string;
};

export async function POST(request: Request) {
  const rateLimit = enforceRateLimit(request, "login");
  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        message: `Demasiados intentos de acceso. Intenta de nuevo en ${rateLimit.retryAfterSeconds}s.`,
        code: "RATE_LIMIT",
      },
      { status: 429 }
    );
  }

  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const identifier = (payload.identifier ?? "").trim();
  const password = payload.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { message: "Usuario/email y contraseña son obligatorios.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    await ensureMasterAdminUser();
    const user = await authenticateUser({ identifier, password });

    // 1) Si el usuario tiene push-style MFA activado, creamos un desafío y pedimos aprobación
    if (user.pushAuthEnabled) {
      const rawToken = crypto.randomUUID().replaceAll("-", "");
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      const ipAddress =
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        null;
      const userAgent = request.headers.get("user-agent") ?? null;

      const challenge = await prisma.loginChallenge.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Email con enlaces "Sí, soy yo" / "No, no soy yo"
      if (user.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
        const approveUrl = `${baseUrl}/api/auth/push/approve?challengeId=${encodeURIComponent(
          challenge.id
        )}&token=${encodeURIComponent(rawToken)}&decision=approve`;
        const denyUrl = `${baseUrl}/api/auth/push/approve?challengeId=${encodeURIComponent(
          challenge.id
        )}&token=${encodeURIComponent(rawToken)}&decision=deny`;

        // Reutilizamos el sistema de email simple de 2FA para no duplicar lógica HTML,
        // pero podrías crear una plantilla específica más adelante.
        await sendTwoFactorCodeEmail({
          to: user.email,
          username: user.name || user.email,
          code: `Aprueba o rechaza el acceso desde estos enlaces:\n\n${approveUrl}\n\n${denyUrl}`,
        });
      }

      return NextResponse.json(
        {
          message:
            "Hemos enviado un email para que apruebes este inicio de sesión. Abre tu correo y pulsa en 'Sí, soy yo'.",
          code: "PUSH_APPROVAL_REQUIRED",
          challengeId: challenge.id,
        },
        { status: 200 }
      );
    }

    // 2) Si no tiene push pero sí 2FA con app (TOTP), pedimos el código de la app
    if (user.totpEnabled) {
      return NextResponse.json(
        {
          message:
            "Introduce el código de 6 dígitos de tu app de autenticación (Google Authenticator, Authy, etc.).",
          code: "TOTP_REQUIRED",
          challengeId: user.id,
        },
        { status: 200 }
      );
    }

    // 3) Si no tiene push ni TOTP pero sí 2FA por código por email, generamos un código y pedimos verificación
    if (user.twoFactorEnabled) {
      const rawCode = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
      const codeHash = hashToken(rawCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      const challenge = await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCodeHash: codeHash,
          twoFactorCodeExpiresAt: expiresAt,
          twoFactorChannel: user.twoFactorChannel ?? "email",
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!challenge.email) {
        return NextResponse.json(
          {
            message: "No se pudo enviar el código 2FA: falta email.",
            code: "TWO_FACTOR_SETUP_INCOMPLETE",
          },
          { status: 500 }
        );
      }

      await sendTwoFactorCodeEmail({
        to: challenge.email,
        username: challenge.name || challenge.email,
        code: rawCode,
      });

      return NextResponse.json(
        {
          message: "Hemos enviado un código de verificación a tu email.",
          code: "TWO_FACTOR_REQUIRED",
          challengeId: challenge.id,
        },
        { status: 200 }
      );
    }

    // Si no tiene 2FA, flujo normal de login
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
  } catch (error) {
    if (error instanceof AccountNotVerifiedError) {
      return NextResponse.json(
        {
          message: "Tu cuenta no está verificada. Revisa tu email o reenvía la verificación.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { message: "Credenciales inválidas.", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo iniciar sesión.", code: "LOGIN_FAILED" },
      { status: 500 }
    );
  }
}

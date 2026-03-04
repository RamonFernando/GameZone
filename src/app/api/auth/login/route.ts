import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { createPersistedSession } from "@/lib/auth/session-server";
import {
  authenticateUser,
  AccountNotVerifiedError,
  ensureMasterAdminUser,
  InvalidCredentialsError,
} from "@/lib/auth/store";

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
    const sessionToken = await createPersistedSession({
      userId: user.id,
      email: user.email,
    }, request);

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

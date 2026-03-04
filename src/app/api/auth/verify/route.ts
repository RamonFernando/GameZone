import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  verifyUserFromToken,
  VerificationTokenExpiredError,
  VerificationTokenNotFoundError,
} from "@/lib/auth/store";

export async function GET(request: Request) {
  const rateLimit = enforceRateLimit(request, "verify");
  if (rateLimit.blocked) {
    return NextResponse.json(
      {
        message: `Demasiados intentos de verificación. Intenta de nuevo en ${rateLimit.retryAfterSeconds}s.`,
      },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.json(
      { message: "El enlace de verificación no es válido." },
      { status: 400 }
    );
  }

  try {
    await verifyUserFromToken(token);
    return NextResponse.json(
      { message: "Cuenta verificada correctamente. Ya puedes iniciar sesión." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof VerificationTokenExpiredError) {
      return NextResponse.json(
        { message: "El enlace de verificación expiró. Solicita uno nuevo." },
        { status: 410 }
      );
    }

    if (error instanceof VerificationTokenNotFoundError) {
      return NextResponse.json(
        { message: "El enlace de verificación no es válido o ya fue usado." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo verificar la cuenta. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}

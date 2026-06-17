import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/services/auth/session";
import { PERMISSIONS } from "@/services/auth/permissions";
import { requirePermission } from "@/services/auth/require-auth";
import { listUserSessions } from "@/services/auth/session-server";

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_SESSIONS_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const sessions = await listUserSessions({
    userId: authResult.auth.userId,
    currentSessionId: authResult.auth.sessionId,
  });

  const response = NextResponse.json(
    {
      message: "Sesiones activas cargadas.",
      sessions,
    },
    { status: 200 }
  );

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

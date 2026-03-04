import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { listUserSessions } from "@/lib/auth/session-server";

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

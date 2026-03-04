import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { revokeAllUserSessions } from "@/lib/auth/session-server";

export async function POST(request: Request) {
  const authResult = await requirePermission(
    request,
    PERMISSIONS.ACCOUNT_SESSIONS_REVOKE_ALL
  );
  if (!authResult.ok) {
    return authResult.response;
  }

  await revokeAllUserSessions(authResult.auth.userId);

  const response = NextResponse.json(
    { message: "Se cerraron todas tus sesiones." },
    { status: 200 }
  );

  response.cookies.set({
    ...getSessionCookieOptions(),
    value: "",
    maxAge: 0,
  });

  return response;
}

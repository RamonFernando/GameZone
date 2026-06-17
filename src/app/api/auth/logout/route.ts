import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/services/auth/session";
import { getSessionTokenFromRequest, revokeSessionByToken, getActiveSessionFromToken } from "@/services/auth/session-server";
import { logAudit } from "@/lib/audit-log";


export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    const session = await getActiveSessionFromToken(token);
    await revokeSessionByToken(token);
    await logAudit({ userId: session?.userId ?? null, action: "LOGOUT", request });
  }

  const response = NextResponse.json(
    { message: "Sesión cerrada correctamente." },
    { status: 200 }
  );

  const cookieOptions = getSessionCookieOptions();
  response.cookies.set({
    ...cookieOptions,
    value: "",
    maxAge: 0,
  });

  return response;
}

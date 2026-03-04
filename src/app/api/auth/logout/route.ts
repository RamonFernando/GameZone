import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { getSessionTokenFromRequest, revokeSessionByToken } from "@/lib/auth/session-server";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) {
    await revokeSessionByToken(token);
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

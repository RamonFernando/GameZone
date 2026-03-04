import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import {
  getActiveSessionFromToken,
  getSessionTokenFromRequest,
  rotateSessionToken,
} from "@/lib/auth/session-server";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { message: "No hay sesión activa.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const activeSession = await getActiveSessionFromToken(token);
  if (!activeSession) {
    const response = NextResponse.json(
      { message: "Sesión inválida o expirada.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
    response.cookies.set({ ...getSessionCookieOptions(), value: "", maxAge: 0 });
    return response;
  }

  if (!activeSession.shouldRotate) {
    return NextResponse.json(
      { message: "Sesión válida.", code: "SESSION_OK" },
      { status: 200 }
    );
  }

  const nextToken = await rotateSessionToken(token, request);
  if (!nextToken) {
    const response = NextResponse.json(
      { message: "No se pudo refrescar la sesión.", code: "SESSION_REFRESH_FAILED" },
      { status: 401 }
    );
    response.cookies.set({ ...getSessionCookieOptions(), value: "", maxAge: 0 });
    return response;
  }

  const response = NextResponse.json(
    { message: "Sesión renovada correctamente.", code: "SESSION_REFRESHED" },
    { status: 200 }
  );
  response.cookies.set({
    ...getSessionCookieOptions(),
    value: nextToken,
  });
  return response;
}

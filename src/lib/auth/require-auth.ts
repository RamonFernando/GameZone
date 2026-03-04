import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import {
  type PermissionKey,
  ensurePermissionSystemInitialized,
  userHasPermission,
} from "@/lib/auth/permissions";
import {
  getActiveSessionFromToken,
  getSessionTokenFromRequest,
  rotateSessionToken,
} from "@/lib/auth/session-server";

export type AuthContext = {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  rotatedToken: string | null;
};

export async function requireAuth(request: Request): Promise<
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse<{ message: string; code: string }> }
> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Debes iniciar sesión.", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const activeSession = await getActiveSessionFromToken(token);
  if (!activeSession) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Sesión inválida o expirada.", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  let rotatedToken: string | null = null;
  if (activeSession.shouldRotate) {
    rotatedToken = await rotateSessionToken(token, request);
  }

  return {
    ok: true,
    auth: {
      userId: activeSession.userId,
      email: activeSession.email,
      role: activeSession.role,
      sessionId: activeSession.sessionId,
      rotatedToken,
    },
  };
}

export async function requirePermission(
  request: Request,
  permission: PermissionKey
): Promise<
  | { ok: true; auth: AuthContext }
  | { ok: false; response: NextResponse<{ message: string; code: string }> }
> {
  const authResult = await requireAuth(request);
  if (!authResult.ok) {
    return authResult;
  }

  await ensurePermissionSystemInitialized();
  const allowed = await userHasPermission(authResult.auth.userId, permission);

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "No tienes permisos para esta acción.", code: "FORBIDDEN" },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

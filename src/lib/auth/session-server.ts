import type { UserRole } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";

const ROTATION_WINDOW_SECONDS = 60 * 60 * 24; // 24h
const MAX_ACTIVE_SESSIONS_PER_USER = 3;

export type ActiveSession = {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  shouldRotate: boolean;
};

export type SessionAuditRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getCookieFromHeader(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const target = parts.find((part) => part.startsWith(`${cookieName}=`));
  if (!target) {
    return null;
  }

  const [, ...valueParts] = target.split("=");
  return decodeURIComponent(valueParts.join("="));
}

export function getSessionTokenFromRequest(request: Request) {
  return getCookieFromHeader(request.headers.get("cookie"), SESSION_COOKIE_NAME);
}

function extractClientMetadata(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  return { ipAddress, userAgent };
}

export async function createPersistedSession(
  input: { userId: string; email: string },
  request: Request
) {
  const token = await createSessionToken({
    userId: input.userId,
    email: input.email,
  });

  const payload = await verifySessionToken(token);
  if (!payload) {
    throw new Error("No se pudo crear una sesión válida.");
  }

  const now = new Date();
  const { ipAddress, userAgent } = extractClientMetadata(request);

  const oldestActiveSessions = await prisma.session.findMany({
    where: {
      userId: input.userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "asc" },
  });

  if (oldestActiveSessions.length >= MAX_ACTIVE_SESSIONS_PER_USER) {
    const sessionsToRevoke = oldestActiveSessions.slice(
      0,
      oldestActiveSessions.length - MAX_ACTIVE_SESSIONS_PER_USER + 1
    );

    if (sessionsToRevoke.length > 0) {
      await prisma.session.updateMany({
        where: {
          id: { in: sessionsToRevoke.map((session) => session.id) },
        },
        data: {
          revokedAt: now,
        },
      });
    }
  }

  await prisma.session.create({
    data: {
      id: payload.jti,
      userId: input.userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(payload.exp * 1000),
      lastSeenAt: now,
      ipAddress,
      userAgent,
    },
  });

  return token;
}

export async function getActiveSessionFromToken(token: string): Promise<ActiveSession | null> {
  const payload = await verifySessionToken(token);
  if (!payload) {
    return null;
  }

  const now = new Date();
  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { id: payload.jti },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.tokenHash !== tokenHash || session.revokedAt || session.expiresAt <= now) {
    return null;
  }

  if (!session.user || !session.user.isVerified) {
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  const secondsLeft = Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);

  return {
    sessionId: session.id,
    userId: session.userId,
    email: session.user.email,
    role: session.user.role,
    expiresAt: session.expiresAt,
    shouldRotate: secondsLeft <= ROTATION_WINDOW_SECONDS,
  };
}

export async function rotateSessionToken(oldToken: string, request?: Request) {
  const activeSession = await getActiveSessionFromToken(oldToken);
  if (!activeSession) {
    return null;
  }

  const nextToken = await createSessionToken({
    userId: activeSession.userId,
    email: activeSession.email,
  });
  const nextPayload = await verifySessionToken(nextToken);

  if (!nextPayload) {
    return null;
  }

  const now = new Date();
  const fallbackMetadata = await prisma.session.findUnique({
    where: { id: activeSession.sessionId },
    select: { ipAddress: true, userAgent: true },
  });
  const requestMetadata = request ? extractClientMetadata(request) : null;

  await prisma.$transaction([
    prisma.session.update({
      where: { id: activeSession.sessionId },
      data: {
        revokedAt: now,
      },
    }),
    prisma.session.create({
      data: {
        id: nextPayload.jti,
        userId: activeSession.userId,
        tokenHash: hashSessionToken(nextToken),
        expiresAt: new Date(nextPayload.exp * 1000),
        lastSeenAt: now,
        ipAddress: requestMetadata?.ipAddress ?? fallbackMetadata?.ipAddress ?? null,
        userAgent: requestMetadata?.userAgent ?? fallbackMetadata?.userAgent ?? null,
      },
    }),
  ]);

  return nextToken;
}

export async function revokeSessionByToken(token: string) {
  const payload = await verifySessionToken(token);
  if (!payload) {
    return;
  }

  await prisma.session.updateMany({
    where: {
      id: payload.jti,
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeAllUserSessions(userId: string) {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function listUserSessions(input: { userId: string; currentSessionId?: string }) {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: {
      userId: input.userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: {
      lastSeenAt: "desc",
    },
    take: 10,
  });

  return sessions.map<SessionAuditRow>((session) => ({
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    isCurrent: session.id === input.currentSessionId,
  }));
}

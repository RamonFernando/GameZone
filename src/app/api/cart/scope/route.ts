import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionTokenFromRequest, getActiveSessionFromToken } from "@/lib/auth/session-server";

const CART_COOKIE_NAME = "gamezone_cart_session";
const CART_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

function createCartStorageKey(scope: string) {
  const scopeHash = createHash("sha256").update(scope).digest("hex").slice(0, 32);
  return `next-gaming-cart-v1:${scopeHash}`;
}

export async function GET(request: Request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const activeSession = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (activeSession) {
    return NextResponse.json({
      authenticated: true,
      cartStorageKey: createCartStorageKey(`user:${activeSession.userId}`),
    });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const anonymousCartSession = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CART_COOKIE_NAME}=`))
    ?.slice(CART_COOKIE_NAME.length + 1);

  const cartSessionId = anonymousCartSession
    ? decodeURIComponent(anonymousCartSession)
    : randomUUID();

  const response = NextResponse.json({
    authenticated: false,
    cartStorageKey: createCartStorageKey(`anonymous:${cartSessionId}`),
  });

  if (!anonymousCartSession) {
    response.cookies.set({
      name: CART_COOKIE_NAME,
      value: cartSessionId,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_TTL_SECONDS,
    });
  }

  return response;
}

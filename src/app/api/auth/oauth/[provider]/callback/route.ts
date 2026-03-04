import { NextResponse } from "next/server";
import {
  type OAuthProvider,
  fetchOAuthUserProfile,
  getCookieValueFromRequest,
  getOAuthPkceCookieName,
  getOAuthPkceCookieOptions,
  getOAuthStateCookieName,
  getOAuthStateCookieOptions,
  verifyOAuthPkceCookie,
  verifyOAuthStateCookie,
} from "@/lib/auth/oauth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { createPersistedSession } from "@/lib/auth/session-server";
import { ensureMasterAdminUser, upsertOAuthUser } from "@/lib/auth/store";

function resolveProvider(rawProvider: string): OAuthProvider | null {
  if (rawProvider === "google" || rawProvider === "facebook" || rawProvider === "twitter") {
    return rawProvider;
  }
  return null;
}

function redirectWithError(request: Request, reason: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("oauthError", reason);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: { params: { provider: string } }
) {
  const provider = resolveProvider(context.params.provider);
  if (!provider) {
    return redirectWithError(request, "provider");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectWithError(request, "missing_code");
  }

  const stateCookieValue = getCookieValueFromRequest(request, getOAuthStateCookieName());

  const verifiedState = verifyOAuthStateCookie({
    expectedProvider: provider,
    expectedState: state,
    cookieValue: stateCookieValue,
  });

  if (!verifiedState.ok) {
    return redirectWithError(request, "state");
  }

  const pkceCookieValue = getCookieValueFromRequest(request, getOAuthPkceCookieName());
  const verifiedPkce =
    provider === "twitter"
      ? verifyOAuthPkceCookie({
          expectedProvider: provider,
          expectedState: state,
          cookieValue: pkceCookieValue,
        })
      : { ok: true as const, codeVerifier: undefined };

  if (!verifiedPkce.ok) {
    return redirectWithError(request, "state");
  }

  try {
    await ensureMasterAdminUser();
    const profile = await fetchOAuthUserProfile({
      provider,
      requestUrl: request.url,
      code,
      codeVerifier: verifiedPkce.codeVerifier,
    });
    const user = await upsertOAuthUser({
      email: profile.email,
      name: profile.name,
    });
    const sessionToken = await createPersistedSession(
      {
        userId: user.id,
        email: user.email,
      },
      request
    );

    const target = verifiedState.nextPath || "/account";
    const redirectUrl = new URL(target, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: sessionToken,
    });
    response.cookies.set({
      ...getOAuthStateCookieOptions(),
      value: "",
      maxAge: 0,
    });
    response.cookies.set({
      ...getOAuthPkceCookieOptions(),
      value: "",
      maxAge: 0,
    });
    return response;
  } catch {
    const response = redirectWithError(request, "provider_failed");
    response.cookies.set({
      ...getOAuthStateCookieOptions(),
      value: "",
      maxAge: 0,
    });
    response.cookies.set({
      ...getOAuthPkceCookieOptions(),
      value: "",
      maxAge: 0,
    });
    return response;
  }
}

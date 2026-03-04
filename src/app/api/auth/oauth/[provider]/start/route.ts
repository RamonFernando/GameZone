import { NextResponse } from "next/server";
import {
  type OAuthProvider,
  buildOAuthAuthorizationUrl,
  createOAuthPkceCookieValue,
  createOAuthStateCookieValue,
  getOAuthPkceCookieOptions,
  getOAuthStateCookieOptions,
} from "@/lib/auth/oauth";

function resolveProvider(rawProvider: string): OAuthProvider | null {
  if (rawProvider === "google" || rawProvider === "facebook" || rawProvider === "twitter") {
    return rawProvider;
  }
  return null;
}

export async function GET(
  request: Request,
  context: { params: { provider: string } }
) {
  const provider = resolveProvider(context.params.provider);
  if (!provider) {
    return NextResponse.json(
      { message: "Proveedor OAuth no soportado.", code: "INVALID_OAUTH_PROVIDER" },
      { status: 404 }
    );
  }

  const requestUrl = new URL(request.url);
  const nextPath = requestUrl.searchParams.get("next");

  try {
    const { state, cookieValue } = createOAuthStateCookieValue({
      provider,
      nextPath,
    });

    const pkce =
      provider === "twitter"
        ? createOAuthPkceCookieValue({ provider, state })
        : null;

    const authUrl = buildOAuthAuthorizationUrl({
      provider,
      requestUrl: request.url,
      state,
      codeChallenge: pkce?.codeChallenge,
    });

    const response = NextResponse.redirect(authUrl);
    response.cookies.set({
      ...getOAuthStateCookieOptions(),
      value: cookieValue,
    });

    if (pkce) {
      response.cookies.set({
        ...getOAuthPkceCookieOptions(),
        value: pkce.cookieValue,
      });
    }

    return response;
  } catch {
    const fallback = new URL("/auth", request.url);
    fallback.searchParams.set("oauthError", "config");
    return NextResponse.redirect(fallback);
  }
}

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

export type OAuthProvider = "google" | "facebook" | "twitter";

type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type OAuthCookiePayload = {
  provider: OAuthProvider;
  state: string;
  nextPath: string;
};

type OAuthPkceCookiePayload = {
  provider: OAuthProvider;
  state: string;
  codeVerifier: string;
};

const OAUTH_STATE_COOKIE_NAME = "gamezone_oauth_state";
const OAUTH_PKCE_COOKIE_NAME = "gamezone_oauth_pkce";
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10; // 10 minutos

function getOAuthSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 24) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET no configurado para OAuth.");
  }

  return "dev-only-session-secret-change-me-please";
}

function getBaseUrl(requestUrl: string) {
  return process.env.APP_BASE_URL ?? new URL(requestUrl).origin;
}

function safeNextPath(nextPath: string | null) {
  if (nextPath && nextPath.startsWith("/")) {
    return nextPath;
  }
  return "/account";
}

function sign(value: string) {
  return createHmac("sha256", getOAuthSecret()).update(value).digest("hex");
}

function encodeSignedPayload(payload: OAuthCookiePayload | OAuthPkceCookiePayload) {
  const raw = JSON.stringify(payload);
  const encoded = Buffer.from(raw).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function decodeSignedPayload(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }

  if (sign(encoded) !== signature) {
    return null;
  }

  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<OAuthCookiePayload & OAuthPkceCookiePayload>;
    if (!parsed.provider || !parsed.state) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getOAuthStateCookieName() {
  return OAUTH_STATE_COOKIE_NAME;
}

export function getOAuthPkceCookieName() {
  return OAUTH_PKCE_COOKIE_NAME;
}

export function getOAuthStateCookieOptions() {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  };
}

export function getOAuthPkceCookieOptions() {
  return {
    name: OAUTH_PKCE_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  };
}

export function getCookieValueFromRequest(request: Request, cookieName: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return undefined;
  }

  const rawCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!rawCookie) {
    return undefined;
  }

  return rawCookie.slice(cookieName.length + 1);
}

export function createOAuthStateCookieValue(input: {
  provider: OAuthProvider;
  nextPath: string | null;
}) {
  const state = randomUUID().replaceAll("-", "");
  const payload: OAuthCookiePayload = {
    provider: input.provider,
    state,
    nextPath: safeNextPath(input.nextPath),
  };
  return {
    state,
    cookieValue: encodeSignedPayload(payload),
  };
}

function createCodeVerifier() {
  return randomBytes(32).toString("base64url");
}

function createCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

export function createOAuthPkceCookieValue(input: {
  provider: OAuthProvider;
  state: string;
}) {
  const codeVerifier = createCodeVerifier();
  const payload: OAuthPkceCookiePayload = {
    provider: input.provider,
    state: input.state,
    codeVerifier,
  };
  return {
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
    cookieValue: encodeSignedPayload(payload),
  };
}

export function verifyOAuthStateCookie(input: {
  expectedProvider: OAuthProvider;
  expectedState: string;
  cookieValue: string | undefined;
}) {
  const payload = decodeSignedPayload(input.cookieValue) as
    | Partial<OAuthCookiePayload>
    | null;
  if (!payload) {
    return { ok: false as const };
  }

  if (
    payload.provider !== input.expectedProvider ||
    payload.state !== input.expectedState ||
    !payload.nextPath
  ) {
    return { ok: false as const };
  }

  return { ok: true as const, nextPath: payload.nextPath };
}

export function verifyOAuthPkceCookie(input: {
  expectedProvider: OAuthProvider;
  expectedState: string;
  cookieValue: string | undefined;
}) {
  const payload = decodeSignedPayload(input.cookieValue) as
    | Partial<OAuthPkceCookiePayload>
    | null;
  if (!payload) {
    return { ok: false as const };
  }

  if (
    payload.provider !== input.expectedProvider ||
    payload.state !== input.expectedState ||
    !payload.codeVerifier
  ) {
    return { ok: false as const };
  }

  return { ok: true as const, codeVerifier: payload.codeVerifier };
}

function getGoogleConfig(requestUrl: string): OAuthProviderConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${getBaseUrl(requestUrl)}/api/auth/oauth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

function getFacebookConfig(requestUrl: string): OAuthProviderConfig {
  const clientId = process.env.FACEBOOK_CLIENT_ID ?? "";
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI ??
    `${getBaseUrl(requestUrl)}/api/auth/oauth/facebook/callback`;
  return { clientId, clientSecret, redirectUri };
}

function getTwitterConfig(requestUrl: string): OAuthProviderConfig {
  const clientId = process.env.TWITTER_CLIENT_ID ?? "";
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.TWITTER_REDIRECT_URI ??
    `${getBaseUrl(requestUrl)}/api/auth/oauth/twitter/callback`;
  return { clientId, clientSecret, redirectUri };
}

export function getOAuthProviderConfig(provider: OAuthProvider, requestUrl: string) {
  if (provider === "google") {
    return getGoogleConfig(requestUrl);
  }
  if (provider === "facebook") {
    return getFacebookConfig(requestUrl);
  }
  return getTwitterConfig(requestUrl);
}

export function buildOAuthAuthorizationUrl(input: {
  provider: OAuthProvider;
  requestUrl: string;
  state: string;
  codeChallenge?: string;
}) {
  const config = getOAuthProviderConfig(input.provider, input.requestUrl);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Falta configurar credenciales OAuth para ${input.provider}.`);
  }

  if (input.provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", input.state);
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  if (input.provider === "facebook") {
    const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "email,public_profile");
    url.searchParams.set("state", input.state);
    return url.toString();
  }

  if (!input.codeChallenge) {
    throw new Error("Twitter OAuth requiere PKCE.");
  }

  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "tweet.read users.read");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function fetchOAuthUserProfile(input: {
  provider: OAuthProvider;
  requestUrl: string;
  code: string;
  codeVerifier?: string;
}): Promise<{ email: string; name: string }> {
  const config = getOAuthProviderConfig(input.provider, input.requestUrl);
  if (!config.clientId || !config.clientSecret) {
    throw new Error(`Falta configurar credenciales OAuth para ${input.provider}.`);
  }

  if (input.provider === "google") {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("No se pudo obtener token de Google.");
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      throw new Error("Google no devolvió access_token.");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) {
      throw new Error("No se pudo obtener perfil de Google.");
    }

    const profile = (await profileResponse.json()) as {
      email?: string;
      name?: string;
      email_verified?: boolean;
    };

    if (!profile.email) {
      throw new Error("Google no devolvió email.");
    }

    if (profile.email_verified === false) {
      throw new Error("La cuenta de Google no tiene email verificado.");
    }

    return {
      email: profile.email.toLowerCase(),
      name: profile.name?.trim() || profile.email.split("@")[0] || "gamer",
    };
  }

  if (input.provider === "facebook") {
    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", config.clientId);
    tokenUrl.searchParams.set("client_secret", config.clientSecret);
    tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
    tokenUrl.searchParams.set("code", input.code);

    const tokenResponse = await fetch(tokenUrl);
    if (!tokenResponse.ok) {
      throw new Error("No se pudo obtener token de Facebook.");
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      throw new Error("Facebook no devolvió access_token.");
    }

    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.searchParams.set("fields", "id,name,email");
    profileUrl.searchParams.set("access_token", accessToken);

    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) {
      throw new Error("No se pudo obtener perfil de Facebook.");
    }

    const profile = (await profileResponse.json()) as { email?: string; name?: string };
    if (!profile.email) {
      throw new Error("Facebook no devolvió email.");
    }

    return {
      email: profile.email.toLowerCase(),
      name: profile.name?.trim() || profile.email.split("@")[0] || "gamer",
    };
  }

  if (!input.codeVerifier) {
    throw new Error("Falta code_verifier para Twitter OAuth.");
  }

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code: input.code,
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: input.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("No se pudo obtener token de Twitter/X.");
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = tokenPayload.access_token;
  if (!accessToken) {
    throw new Error("Twitter/X no devolvió access_token.");
  }

  const profileUrl = new URL("https://api.twitter.com/2/users/me");
  profileUrl.searchParams.set("user.fields", "id,name,username");
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileResponse.ok) {
    throw new Error("No se pudo obtener perfil de Twitter/X.");
  }

  const profile = (await profileResponse.json()) as {
    data?: { id?: string; name?: string; username?: string };
  };
  const twitterId = profile.data?.id;
  const username = profile.data?.username;
  if (!twitterId) {
    throw new Error("Twitter/X no devolvió id de usuario.");
  }

  return {
    email: `twitter_${twitterId}@oauth.local`,
    name: profile.data?.name?.trim() || username?.trim() || `twitter_${twitterId}`,
  };
}

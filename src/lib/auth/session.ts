const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE_NAME = "gamezone_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export type SessionPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  jti: string;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 24) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET no configurado o demasiado corto.");
  }

  return "dev-only-session-secret-change-me-please";
}

function toBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function signValue(value: string, secret: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string, secret: string) {
  const expected = await signValue(value, secret);
  if (expected.length !== signature.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

function randomJti() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toBase64Url(bytes);
}

export async function createSessionToken(input: { userId: string; email: string }) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: input.userId,
    email: input.email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: randomJti(),
  };

  const payloadEncoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signValue(payloadEncoded, getSessionSecret());
  return `${payloadEncoded}.${signature}`;
}

export async function verifySessionToken(token: string) {
  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return null;
  }

  const isValid = await verifySignature(payloadEncoded, signature, getSessionSecret());
  if (!isValid) {
    return null;
  }

  try {
    const payloadRaw = decoder.decode(fromBase64Url(payloadEncoded));
    const payload = JSON.parse(payloadRaw) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const IDENTIFIER = process.env.E2E_IDENTIFIER ?? "admin@local.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "admin";

const ITEMS = [{ slug: "forspoken", quantity: 1 }];

function fail(message, details) {
  console.error(`\n[E2E STRIPE] ERROR: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function extractSessionCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const rawCookies = setCookieHeader.split(", ");
  const sessionCookie = rawCookies.find((chunk) => chunk.startsWith("gamezone_session="));
  return sessionCookie ? sessionCookie.split(";")[0] : null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { response, payload };
}

async function run() {
  console.log(`[E2E STRIPE] Base URL: ${BASE_URL}`);
  console.log(`[E2E STRIPE] Login con: ${IDENTIFIER}`);

  const loginResult = await requestJson(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: IDENTIFIER,
      password: PASSWORD,
    }),
  });

  if (!loginResult.response.ok) {
    fail("Login fallido.", loginResult.payload);
  }

  const sessionCookie = extractSessionCookie(loginResult.response.headers.get("set-cookie"));
  if (!sessionCookie) {
    fail("No se obtuvo cookie de sesion.");
  }

  const checkoutResult = await requestJson(`${BASE_URL}/api/payments/stripe/create-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ items: ITEMS }),
  });

  if (!checkoutResult.response.ok) {
    fail("No se pudo crear sesion de Stripe.", checkoutResult.payload);
  }

  const checkoutUrl = String(checkoutResult.payload?.checkoutUrl ?? "");
  if (!checkoutUrl || !checkoutUrl.includes("stripe")) {
    fail("Respuesta sin checkoutUrl valido.", checkoutResult.payload);
  }

  console.log("[E2E STRIPE] Sesion creada correctamente.");
  console.log(`[E2E STRIPE] URL: ${checkoutUrl}`);
  console.log("[E2E STRIPE] OK.");
}

run().catch((error) => {
  fail("Excepcion no controlada.", error instanceof Error ? error.stack : String(error));
});

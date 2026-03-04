const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const IDENTIFIER = process.env.E2E_IDENTIFIER ?? "admin";
const PASSWORD = process.env.E2E_PASSWORD ?? "admin";

const ITEMS = [
  { slug: "forspoken", quantity: 1 },
  { slug: "sonic-frontiers", quantity: 1 },
];

function fail(message, details) {
  console.error(`\n[E2E CHECKOUT] ERROR: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function extractSessionCookie(setCookieHeader) {
  if (!setCookieHeader) {
    return null;
  }

  const rawCookies = setCookieHeader.split(", ");
  const sessionCookie = rawCookies.find((chunk) => chunk.startsWith("gamezone_session="));
  if (!sessionCookie) {
    return null;
  }

  return sessionCookie.split(";")[0];
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
  console.log(`[E2E CHECKOUT] Base URL: ${BASE_URL}`);
  console.log(`[E2E CHECKOUT] Login con: ${IDENTIFIER}`);

  const loginUrl = `${BASE_URL}/api/auth/login`;
  const loginResult = await requestJson(loginUrl, {
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

  const setCookieHeader = loginResult.response.headers.get("set-cookie");
  const sessionCookie = extractSessionCookie(setCookieHeader);
  if (!sessionCookie) {
    fail("No se obtuvo cookie de sesion en login.");
  }

  console.log("[E2E CHECKOUT] Login OK.");
  console.log("[E2E CHECKOUT] Creando pedido de prueba...");

  const checkoutUrl = `${BASE_URL}/api/checkout`;
  const checkoutResult = await requestJson(checkoutUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ items: ITEMS }),
  });

  if (!checkoutResult.response.ok) {
    fail("Checkout fallido.", checkoutResult.payload);
  }

  const orderId = checkoutResult.payload?.order?.id;
  if (!orderId) {
    fail("Checkout completo pero no devolvio order.id.", checkoutResult.payload);
  }

  console.log(`[E2E CHECKOUT] Checkout OK. Order ID: ${orderId}`);
  console.log("[E2E CHECKOUT] Verificando pedido en admin...");

  const adminOrdersUrl = `${BASE_URL}/api/admin/orders?status=paid&provider=manual`;
  const adminResult = await requestJson(adminOrdersUrl, {
    method: "GET",
    headers: { Cookie: sessionCookie },
  });

  if (!adminResult.response.ok) {
    fail("No se pudo consultar /api/admin/orders.", adminResult.payload);
  }

  const orders = Array.isArray(adminResult.payload?.orders) ? adminResult.payload.orders : [];
  const exists = orders.some((order) => order.id === orderId);

  if (!exists) {
    fail("El pedido no aparece en el panel admin filtrado.", {
      orderId,
      totalOrders: orders.length,
    });
  }

  console.log("[E2E CHECKOUT] Verificacion admin OK.");
  console.log("[E2E CHECKOUT] Flujo end-to-end completado.");
}

run().catch((error) => {
  fail("Excepcion no controlada.", error instanceof Error ? error.stack : String(error));
});

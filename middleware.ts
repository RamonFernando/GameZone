import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const CART_COOKIE_NAME = "gamezone_cart_session";
const CART_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;

const PROTECTED_ROUTES = ["/account", "/checkout", "/admin"];

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: "USD", GB: "GBP", JP: "JPY", CA: "CAD", AU: "AUD",
  CH: "CHF", MX: "MXN", BR: "BRL", IN: "INR", CN: "CNY",
};

const LOCALE_BY_COUNTRY: Record<string, string> = {
  US: "en-US", GB: "en-GB", CA: "en-US", AU: "en-US",
  FR: "fr-FR", DE: "de-DE", PT: "pt-PT", BR: "pt-PT",
  MX: "es-ES", AR: "es-ES", CO: "es-ES",
};

function applyGeoCookies(request: NextRequest, response: NextResponse) {
  const hasGeoCountry = request.cookies.has("geoCountry");
  const hasGeoCurrency = request.cookies.has("geoCurrency");
  const hasGeoLocale = request.cookies.has("geoLocale");

  if (hasGeoCountry && hasGeoCurrency && hasGeoLocale) {
    return response;
  }

  // Netlify inyecta la cabecera x-nf-geo (cero latencia, sin fetch externo).
  // En desarrollo local no existe, se usa fallback ES/EUR/es-ES.
  const nfCountry = request.headers.get("x-nf-geo-country") ?? "ES";
  const country = nfCountry.toUpperCase();
  const currency = CURRENCY_BY_COUNTRY[country] ?? "EUR";
  const locale = LOCALE_BY_COUNTRY[country] ?? "es-ES";

  const cookieOpts = { path: "/", maxAge: 60 * 60 * 24 * 7 } as const;
  response.cookies.set("geoCountry", country, cookieOpts);
  response.cookies.set("geoCurrency", currency, cookieOpts);
  response.cookies.set("geoLocale", locale, cookieOpts);

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
  const isAuthenticated = Boolean(session);

  const isProtectedPath = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  if (isProtectedPath && !isAuthenticated) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.next();

  // Pre-seed anonymous cart cookie so all tabs share the same key from the first page load.
  if (!request.cookies.has(CART_COOKIE_NAME)) {
    response.cookies.set({
      name: CART_COOKIE_NAME,
      value: crypto.randomUUID(),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_TTL_SECONDS,
    });
  }

  // Aplicar cookies de geolocalización para páginas públicas y protegidas
  return applyGeoCookies(request, response);
}

export const config = {
  // Ejecutar el middleware en todas las rutas de páginas,
  // excluyendo estáticos, imágenes Next y API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

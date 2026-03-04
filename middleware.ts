import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PROTECTED_ROUTES = ["/account", "/checkout", "/admin"];

async function applyGeoCookies(request: NextRequest, response: NextResponse) {
  const hasGeoCountry = request.cookies.has("geoCountry");
  const hasGeoCurrency = request.cookies.has("geoCurrency");
  const hasGeoLocale = request.cookies.has("geoLocale");

  if (hasGeoCountry && hasGeoCurrency && hasGeoLocale) {
    return response;
  }

  try {
    // Usamos un servicio público sencillo de geolocalización por IP.
    // En producción puedes cambiarlo por un proveedor con API key.
    const geoRes = await fetch("https://ipapi.co/json/", {
      // No queremos cache muy agresiva; pero dejamos que el edge maneje lo básico.
      next: { revalidate: 60 * 60 }, // 1 hora
    });

    if (!geoRes.ok) {
      return response;
    }

    const data = (await geoRes.json()) as {
      country_code?: string;
      currency?: string;
      languages?: string;
    };

    const country = (data.country_code ?? "ES").toUpperCase();
    const currency = data.currency ?? "EUR";

    // Tomamos el primer idioma devuelto, por ejemplo "es", "en", "fr"
    const languageRaw = (data.languages ?? "es").split(",")[0]?.trim() || "es";
    let locale = "es-ES";
    if (languageRaw.startsWith("en")) {
      locale = "en-US";
    } else if (languageRaw.startsWith("fr")) {
      locale = "fr-FR";
    } else if (languageRaw.startsWith("de")) {
      locale = "de-DE";
    } else if (languageRaw.startsWith("pt")) {
      locale = "pt-PT";
    } else if (languageRaw.startsWith("es")) {
      locale = "es-ES";
    }

    response.cookies.set("geoCountry", country, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
    response.cookies.set("geoCurrency", currency, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set("geoLocale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Si falla la geolocalización, simplemente no tocamos nada
  }

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
  // Aplicar cookies de geolocalización para páginas públicas y protegidas
  return applyGeoCookies(request, response);
}

export const config = {
  // Ejecutar el middleware en todas las rutas de páginas,
  // excluyendo estáticos, imágenes Next y API.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

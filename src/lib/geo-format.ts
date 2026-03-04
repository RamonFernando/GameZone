// Helpers para formatear precios según las cookies de geolocalización.
// No rompe nada si las cookies no existen: por defecto usa EUR y es-ES.

export type GeoPrefs = {
  country: string;
  currency: string;
  locale: string;
};

// Moneda base en la que están guardados los precios del catálogo.
// En este proyecto asumimos que los precios están en EUR.
const BASE_CURRENCY = "EUR";

// Tabla muy sencilla de tipos de cambio aproximados desde EUR -> otra moneda.
// En un proyecto real lo ideal sería actualizar estos valores de forma periódica
// desde una API de tipos de cambio.
const FX_FROM_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.08, // 1 EUR ≈ 1.08 USD (aprox)
};

function convertFromBase(amountInBase: number, targetCurrency: string): number {
  if (!Number.isFinite(amountInBase)) return amountInBase;
  const rate = FX_FROM_EUR[targetCurrency] ?? 1;
  const converted = amountInBase * rate;
  return Number(converted.toFixed(2));
}

export function readGeoPrefsFromDocument(): GeoPrefs {
  if (typeof document === "undefined") {
    return {
      country: "ES",
      currency: "EUR",
      locale: "es-ES",
    };
  }

  const cookieMap = new Map(
    document.cookie.split(";").map((entry) => {
      const [key, ...rest] = entry.trim().split("=");
      return [key, decodeURIComponent(rest.join("=") || "")] as const;
    })
  );

  const uiCurrency = cookieMap.get("uiCurrency");
  const uiLocale = cookieMap.get("uiLocale");
  const country = (cookieMap.get("geoCountry") ?? "ES").toUpperCase();
  const currency = uiCurrency ?? cookieMap.get("geoCurrency") ?? "EUR";
  const locale = uiLocale ?? cookieMap.get("geoLocale") ?? "es-ES";

  return { country, currency, locale };
}

export function formatMoneyWithGeo(amount: number, fallbackCurrency = "EUR") {
  const { currency, locale } = readGeoPrefsFromDocument();
  const safeCurrency = currency || fallbackCurrency || "EUR";
  const safeLocale = locale || "es-ES";

  try {
    // Convertimos desde la moneda base (EUR) a la moneda de interfaz.
    const amountForDisplay =
      BASE_CURRENCY === safeCurrency ? amount : convertFromBase(amount, safeCurrency);

    return amountForDisplay.toLocaleString(safeLocale, {
      style: "currency",
      currency: safeCurrency,
    });
  } catch {
    return amount.toLocaleString("es-ES", {
      style: "currency",
      currency: fallbackCurrency,
    });
  }
}

// Devuelve el locale de interfaz preferido (uiLocale > geoLocale > es-ES),
// pensado para elegir idioma de textos (es/en).
export function getActiveLocaleFromDocument(defaultLocale = "es-ES"): string {
  const prefs = readGeoPrefsFromDocument();
  return prefs.locale || defaultLocale;
}


/**
 * Validación de variables de entorno al arrancar.
 *
 * - REQUIRED: imprescindibles para que la app funcione. Si falta alguna en
 *   producción se lanza un error (el arranque falla, que es lo que queremos:
 *   detectar el problema en el deploy y no cuando un usuario intenta pagar).
 * - RECOMMENDED: necesarias para funcionalidades concretas (pagos, email,
 *   OAuth...). Si faltan solo se avisa por log; la app arranca igual.
 */

const REQUIRED_VARS = ["DATABASE_URL", "SESSION_SECRET"] as const;

const RECOMMENDED_VARS = [
  "APP_BASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "RAWG_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ENCRYPTION_KEY",
] as const;

function isMissing(name: string): boolean {
  const value = process.env[name];
  return value === undefined || value.trim().length === 0;
}

/**
 * Valida las variables de entorno. Devuelve la lista de avisos generados.
 * Lanza un error si falta una variable REQUIRED en producción.
 */
export function validateEnv(): { missingRequired: string[]; missingRecommended: string[] } {
  const isProduction = process.env.NODE_ENV === "production";

  const missingRequired = REQUIRED_VARS.filter(isMissing);
  const missingRecommended = RECOMMENDED_VARS.filter(isMissing);

  if (missingRequired.length > 0) {
    const message = `Faltan variables de entorno obligatorias: ${missingRequired.join(", ")}.`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`[env] ${message} (permitido en desarrollo)`);
  }

  if (missingRecommended.length > 0) {
    console.warn(
      `[env] Variables recomendadas ausentes (funcionalidades limitadas): ${missingRecommended.join(", ")}.`
    );
  }

  return { missingRequired, missingRecommended };
}

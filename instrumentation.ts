/**
 * Hook de instrumentación de Next.js: register() se ejecuta una sola vez
 * cuando arranca el servidor. Lo usamos para validar las variables de
 * entorno antes de servir tráfico.
 */
export async function register() {
  // Solo en el runtime de Node (no en Edge), donde viven las claves de servidor.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/lib/env");
    validateEnv();
  }
}

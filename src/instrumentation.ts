import * as Sentry from "@sentry/nextjs";

export async function register() {
  // En edge siempre cargamos la config de edge.
  // En nodejs (o cuando NEXT_RUNTIME no está definido, p.ej. en dev) cargamos la de servidor.
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  } else {
    await import("../sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

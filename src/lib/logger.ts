/**
 * Logger estructurado mínimo y sin dependencias.
 *
 * Emite una línea JSON por evento (level, time, message + contexto), fácil de
 * parsear por agregadores de logs (Datadog, Logtail, CloudWatch...). En
 * desarrollo imprime un formato más legible.
 *
 * Uso:
 *   logger.error("No se pudo enviar email", { orderId, err: error });
 *   logger.info("Pedido pagado", { orderId, provider });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isProduction = process.env.NODE_ENV === "production";
// En producción ocultamos debug por defecto; configurable con LOG_LEVEL.
const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ?? (isProduction ? "info" : "debug");

/** Normaliza un Error a un objeto serializable (los Error no se serializan con JSON.stringify). */
function serializeContext(context: LogContext): LogContext {
  const output: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      output[key] = {
        name: value.name,
        message: value.message,
        stack: isProduction ? undefined : value.stack,
      };
    } else {
      output[key] = value;
    }
  }
  return output;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...serializeContext(context),
  };

  const line = isProduction ? JSON.stringify(entry) : prettyLine(level, message, entry);

  // Mantiene los streams correctos (stderr para warn/error).
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function prettyLine(level: LogLevel, message: string, entry: Record<string, unknown>) {
  const rest = { ...entry };
  delete rest.level;
  delete rest.time;
  delete rest.message;
  const extras = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${level.toUpperCase()}] ${message}${extras}`;
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};

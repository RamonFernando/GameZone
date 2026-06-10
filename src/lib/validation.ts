import { NextResponse } from "next/server";
import type { ZodType, infer as ZodInfer } from "zod";

/**
 * Parsea y valida el body JSON de una petición contra un esquema Zod.
 *
 * Centraliza el patrón repetido en las rutas de API: leer JSON, validar y
 * devolver un 400 estructurado si algo falla, en lugar de castear con `as Tipo`
 * sin validación en runtime.
 *
 * Uso:
 *   const parsed = await parseJsonBody(request, miEsquema);
 *   if (!parsed.ok) return parsed.response;
 *   const data = parsed.data; // tipado e validado
 */
export async function parseJsonBody<S extends ZodType>(
  request: Request,
  schema: S
): Promise<
  | { ok: true; data: ZodInfer<S> }
  | { ok: false; response: NextResponse<{ message: string; code: string; errors?: unknown }> }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Solicitud inválida.", code: "BAD_REQUEST" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Datos de la solicitud no válidos.", code: "VALIDATION_ERROR", errors },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}

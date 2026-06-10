import { prisma } from "@/lib/prisma";

/**
 * Sirve el avatar de un usuario almacenado en la BD.
 *
 * Es público a propósito: el navegador lo carga como imagen de fondo (CSS
 * background-image), que no puede enviar cabeceras de autenticación. Los
 * avatares no son datos sensibles. Solo devuelve bytes de imagen ya procesados.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const avatar = await prisma.userAvatar.findUnique({
    where: { userId },
    select: { data: true, contentType: true },
  });

  if (!avatar) {
    return new Response("Avatar no encontrado.", { status: 404 });
  }

  const body = new Uint8Array(avatar.data);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": avatar.contentType,
      // La URL lleva cache-busting (?v=timestamp), así que podemos cachear fuerte.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(body.byteLength),
    },
  });
}

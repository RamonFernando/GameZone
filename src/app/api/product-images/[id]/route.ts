import { prisma } from "@/lib/prisma";

/**
 * Sirve una imagen de producto almacenada en la BD.
 *
 * Es pública a propósito: el navegador la carga como <img>/next-image, que no
 * envía cabeceras de autenticación. Solo devuelve bytes de imagen ya procesados.
 * El id es único por subida (contenido inmutable), por eso se cachea fuerte.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const image = await prisma.productImage.findUnique({
    where: { id },
    select: { data: true, contentType: true },
  });

  if (!image) {
    return new Response("Imagen no encontrada.", { status: 404 });
  }

  const body = new Uint8Array(image.data);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(body.byteLength),
    },
  });
}

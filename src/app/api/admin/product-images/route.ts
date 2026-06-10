import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Las portadas son mayores que un avatar; 5 MB es un límite holgado.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Valida los "magic bytes" reales del archivo (no file.type, que lo controla el
 * cliente y se puede falsear). Acepta JPEG, PNG y WebP. Mismo criterio que el
 * de avatares.
 */
function detectImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

// Sube una imagen de producto: la valida, la normaliza a WebP y guarda los bytes
// en la BD. Devuelve la URL de mismo origen para usarla en coverImage.
export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "Debes seleccionar una imagen.", code: "NO_FILE" },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: "La imagen no puede superar los 5 MB.", code: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (!detectImageType(bytes)) {
    return NextResponse.json(
      { message: "El archivo debe ser una imagen JPEG, PNG o WebP válida.", code: "INVALID_TYPE" },
      { status: 400 }
    );
  }

  // Normalizamos a WebP dentro de un marco máximo (mantiene proporción, no
  // amplía imágenes pequeñas). Descarta cualquier payload embebido.
  let processed: Buffer;
  try {
    processed = await sharp(bytes)
      .rotate() // respeta orientación EXIF
      .resize(1000, 1400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { message: "No se pudo procesar la imagen.", code: "PROCESSING_FAILED" },
      { status: 400 }
    );
  }

  const created = await prisma.productImage.create({
    data: { data: processed, contentType: "image/webp" },
    select: { id: true },
  });

  const url = `/api/product-images/${created.id}`;

  const response = NextResponse.json(
    { message: "Imagen subida correctamente.", url },
    { status: 201 }
  );

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

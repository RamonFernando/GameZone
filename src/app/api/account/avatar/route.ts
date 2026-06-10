import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";

// Tamaño máximo del archivo subido (antes de procesar). 2 MB es de sobra para
// un avatar; rechazamos por encima para no procesar archivos enormes.
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * Valida los "magic bytes" reales del archivo en lugar de fiarnos de file.type
 * (que lo controla el cliente y se puede falsear). Acepta JPEG, PNG y WebP.
 */
function detectImageType(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
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
  // WebP: "RIFF" .... "WEBP"
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

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const formData = await request.formData();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { message: "Debes seleccionar una imagen.", code: "NO_FILE" },
      { status: 400 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: "La imagen no puede superar los 2 MB.", code: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validación por contenido real, no por la cabecera que envía el cliente.
  const detected = detectImageType(bytes);
  if (!detected) {
    return NextResponse.json(
      { message: "El archivo debe ser una imagen JPEG, PNG o WebP válida.", code: "INVALID_TYPE" },
      { status: 400 }
    );
  }

  // Normalizamos: recortamos a 256x256 y convertimos a WebP. Esto descarta
  // cualquier payload malicioso embebido y deja el avatar en pocos KB.
  let processed: Buffer;
  try {
    processed = await sharp(bytes)
      .rotate() // respeta orientación EXIF
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { message: "No se pudo procesar la imagen.", code: "PROCESSING_FAILED" },
      { status: 400 }
    );
  }

  const userId = authResult.auth.userId;

  await prisma.userAvatar.upsert({
    where: { userId },
    create: { userId, data: processed, contentType: "image/webp" },
    update: { data: processed, contentType: "image/webp" },
  });

  // URL de mismo origen con cache-busting para que el navegador recargue la nueva imagen.
  const avatarUrl = `/api/account/avatar/${userId}?v=${Date.now()}`;

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  const response = NextResponse.json(
    {
      message: "Avatar actualizado correctamente.",
      avatarUrl,
    },
    { status: 200 }
  );

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";

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

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { message: "El archivo debe ser una imagen.", code: "INVALID_TYPE" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let ext = "jpg";
  if (file.type === "image/png") ext = "png";
  else if (file.type === "image/webp") ext = "webp";

  const fileName = `${authResult.auth.userId}.${ext}`;
  const publicDir = path.join(process.cwd(), "public", "avatars");
  const filePath = path.join(publicDir, fileName);

  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const avatarUrl = `/avatars/${fileName}`;

  const updatedUser = await prisma.user.update({
    where: { id: authResult.auth.userId },
    data: { avatarUrl },
  });

  const response = NextResponse.json(
    {
      message: "Avatar actualizado correctamente.",
      avatarUrl,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
      },
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


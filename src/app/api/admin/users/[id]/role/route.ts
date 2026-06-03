import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";

type UpdateRolePayload = {
  role?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_USERS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  if (authResult.auth.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Solo el super admin puede cambiar roles.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let payload: UpdateRolePayload;
  try {
    payload = (await request.json()) as UpdateRolePayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const nextRole = payload.role;
  if (nextRole !== "ADMIN" && nextRole !== "USER") {
    return NextResponse.json(
      { message: "Rol invalido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const { id } = await context.params;
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { message: "Usuario no encontrado.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (targetUser.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "No se puede modificar un super admin.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: nextRole,
      isVerified: nextRole === "ADMIN" ? true : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  });

  const response = NextResponse.json(
    {
      message: nextRole === "ADMIN" ? "Usuario promovido a ADMIN." : "Permisos de admin retirados.",
      user: updated,
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

import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

type UpdateTwoFactorPayload = {
  enabled?: boolean;
};

export async function PATCH(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: UpdateTwoFactorPayload;
  try {
    payload = (await request.json()) as UpdateTwoFactorPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const enabled = Boolean(payload.enabled);

  const updatedUser = await prisma.user.update({
    where: { id: authResult.auth.userId },
    data: {
      twoFactorEnabled: enabled,
      twoFactorChannel: enabled ? "email" : null,
      // Si desactivamos 2FA, limpiar cualquier reto pendiente
      twoFactorCodeHash: enabled ? undefined : null,
      twoFactorCodeExpiresAt: enabled ? undefined : null,
    },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      twoFactorChannel: true,
    },
  });

  return NextResponse.json(
    {
      message: enabled
        ? "2FA por código de email activado correctamente."
        : "2FA desactivado. Ahora iniciarás sesión solo con email y contraseña.",
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      twoFactorChannel: updatedUser.twoFactorChannel,
    },
    { status: 200 }
  );
}


import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const updateTwoFactorSchema = z.object({
  enabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = await parseJsonBody(request, updateTwoFactorSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const enabled = Boolean(payload.enabled);

  if (enabled) {
    const user = await prisma.user.findUnique({
      where: { id: authResult.auth.userId },
      select: { totpEnabled: true },
    });

    if (user?.totpEnabled) {
      return NextResponse.json(
        {
          message:
            "Ya tienes 2FA con app activado. Para usar 2FA por email, primero desactiva 2FA con app.",
          code: "TOTP_ALREADY_ENABLED",
        },
        { status: 409 }
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: authResult.auth.userId },
    data: {
      twoFactorEnabled: enabled,
      twoFactorChannel: enabled ? "email" : null,
      twoFactorCodeHash: null,
      twoFactorCodeExpiresAt: null,
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

import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/services/auth/permissions";
import { requirePermission } from "@/services/auth/require-auth";
import { logAudit } from "@/lib/audit-log";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const updatedUser = await prisma.user.update({
    where: { id: authResult.auth.userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
    },
    select: {
      id: true,
      email: true,
      totpEnabled: true,
    },
  });

  await logAudit({ userId: authResult.auth.userId, action: "TOTP_DISABLED", request });

  return NextResponse.json(
    {
      message: "2FA con app desactivado. Ahora puedes iniciar sesión sin código de autenticador.",
      totpEnabled: updatedUser.totpEnabled,
    },
    { status: 200 }
  );
}


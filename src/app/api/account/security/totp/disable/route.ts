import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
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

  return NextResponse.json(
    {
      message: "2FA con app desactivado. Ahora puedes iniciar sesión sin código de autenticador.",
      totpEnabled: updatedUser.totpEnabled,
    },
    { status: 200 }
  );
}


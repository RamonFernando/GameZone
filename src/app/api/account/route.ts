import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit-log";
import { parseJsonBody } from "@/lib/validation";
import { getSessionCookieOptions } from "@/services/auth/session";
import { PERMISSIONS } from "@/services/auth/permissions";
import { requirePermission } from "@/services/auth/require-auth";
import { getUserById, verifyPassword } from "@/services/auth/store";

const deleteAccountSchema = z.object({
  password: z.string().min(1, "La contraseña es obligatoria."),
});

// DELETE /api/account: borrado definitivo de la cuenta del usuario autenticado.
// Requiere confirmación por contraseña. Las relaciones (sesiones, pedidos, carrito,
// wishlist, permisos) están definidas en el esquema con onDelete: Cascade, por lo que
// prisma.user.delete() limpia todo lo asociado automáticamente.
export async function DELETE(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = await parseJsonBody(request, deleteAccountSchema);
  if (!parsed.ok) return parsed.response;
  const { password } = parsed.data;

  const user = await getUserById(authResult.auth.userId);
  if (!user) {
    return NextResponse.json(
      { message: "No se encontró el usuario.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return NextResponse.json(
      { message: "Contraseña incorrecta.", code: "INVALID_PASSWORD" },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id: user.id } });

  await logAudit({
    userId: null,
    action: "ACCOUNT_DELETED",
    request,
    meta: { deletedUserId: user.id, email: user.email },
  });

  const response = NextResponse.json(
    { message: "Tu cuenta se ha eliminado correctamente.", code: "ACCOUNT_DELETED" },
    { status: 200 }
  );

  response.cookies.set({
    ...getSessionCookieOptions(),
    value: "",
    maxAge: 0,
  });

  return response;
}

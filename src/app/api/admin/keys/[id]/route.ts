import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/services/auth/require-auth";
import { PERMISSIONS } from "@/services/auth/permissions";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_PRODUCTS_WRITE);
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  const key = await prisma.gameKey.findUnique({ where: { id } });
  if (!key) {
    return NextResponse.json({ message: "Clave no encontrada." }, { status: 404 });
  }

  if (key.assignedOrderId !== null) {
    return NextResponse.json(
      { message: "No se puede eliminar una clave ya asignada a un pedido." },
      { status: 409 }
    );
  }

  await prisma.gameKey.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

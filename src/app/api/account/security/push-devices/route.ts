import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const createDeviceSchema = z.object({
  name: z.string().optional(),
});

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const devices = await prisma.pushDevice.findMany({
    where: { userId: authResult.auth.userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json(
    {
      message: "Dispositivos de seguridad cargados correctamente.",
      devices,
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = await parseJsonBody(request, createDeviceSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const name = (payload.name ?? "").trim() || "Dispositivo móvil";
  const userAgent = request.headers.get("user-agent") ?? null;

  const device = await prisma.pushDevice.create({
    data: {
      userId: authResult.auth.userId,
      name,
      userAgent,
    },
    select: {
      id: true,
      name: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json(
    {
      message: "Dispositivo de seguridad registrado correctamente.",
      device,
    },
    { status: 201 }
  );
}


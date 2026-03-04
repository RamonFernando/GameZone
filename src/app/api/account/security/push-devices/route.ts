import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

type CreateDevicePayload = {
  name?: string;
};

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

  let payload: CreateDevicePayload;
  try {
    payload = (await request.json()) as CreateDevicePayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

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


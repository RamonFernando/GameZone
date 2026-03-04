import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { hashPassword } from "@/lib/auth/store";

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_USERS_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const response = NextResponse.json(
    {
      message: "Usuarios cargados.",
      users,
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

type CreateAdminPayload = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_USERS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  if (authResult.auth.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { message: "Solo el super admin puede crear administradores.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let payload: CreateAdminPayload;
  try {
    payload = (await request.json()) as CreateAdminPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const password = String(payload.password ?? "");
  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      {
        message: "Nombre, email y contraseña (mínimo 8 caracteres) son obligatorios.",
        code: "BAD_REQUEST",
      },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "No se puede modificar un super admin existente.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "ADMIN",
        isVerified: true,
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
      { message: "Usuario existente promovido a ADMIN.", user: updated },
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

  const created = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      isVerified: true,
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
    { message: "Administrador creado correctamente.", user: created },
    { status: 201 }
  );
  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }
  return response;
}

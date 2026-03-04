import { NextResponse } from "next/server";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { DuplicateEmailError, getUserById, updateUserProfile } from "@/lib/auth/store";

type UpdateProfilePayload = {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  province?: string | null;
};

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const user = await getUserById(authResult.auth.userId);
  if (!user) {
    return NextResponse.json(
      { message: "No se encontró el usuario.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const response = NextResponse.json(
    {
      message: "Perfil cargado correctamente.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          addressLine1: user.addressLine1,
          city: user.city,
          postalCode: user.postalCode,
          country: user.country,
          province: user.province,
      },
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

export async function PATCH(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ACCOUNT_UPDATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: UpdateProfilePayload;
  try {
    payload = (await request.json()) as UpdateProfilePayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 3) {
    return NextResponse.json(
      { message: "El nombre debe tener al menos 3 caracteres.", code: "INVALID_NAME" },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { message: "Email inválido.", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await updateUserProfile({
      userId: authResult.auth.userId,
      name,
      email,
      avatarUrl: (payload.avatarUrl ?? null) || null,
      phone: (payload.phone ?? null) || null,
      addressLine1: (payload.addressLine1 ?? null) || null,
      city: (payload.city ?? null) || null,
      postalCode: (payload.postalCode ?? null) || null,
      country: (payload.country ?? null) || null,
      province: (payload.province ?? null) || null,
    });

    const response = NextResponse.json(
      {
        message: "Perfil actualizado correctamente.",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatarUrl,
          phone: updatedUser.phone,
          addressLine1: updatedUser.addressLine1,
          city: updatedUser.city,
          postalCode: updatedUser.postalCode,
          country: updatedUser.country,
          province: updatedUser.province,
        },
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
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return NextResponse.json(
        { message: "Ese email ya está en uso.", code: "EMAIL_ALREADY_USED" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "No se pudo actualizar el perfil.", code: "UPDATE_FAILED" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";
import {
  clearUserCartItems,
  getUserCartItems,
  replaceUserCartItems,
} from "@/lib/cart/persistent-cart";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().optional(),
        quantity: z.number().optional(),
      })
    )
    .optional(),
});

async function getActiveUserId(request: Request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const activeSession = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;
  return activeSession?.userId ?? null;
}

function unauthenticatedResponse() {
  return NextResponse.json(
    { message: "Inicia sesion para sincronizar el carrito.", code: "UNAUTHENTICATED" },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  const items = await getUserCartItems(userId);
  return NextResponse.json({ items }, { status: 200 });
}

export async function PUT(request: Request) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  const parsed = await parseJsonBody(request, cartSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { message: "Solicitud de carrito invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  const payload = parsed.data;

  const items = await replaceUserCartItems(userId, Array.isArray(payload.items) ? payload.items : []);
  return NextResponse.json({ items }, { status: 200 });
}

export async function DELETE(request: Request) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  await clearUserCartItems(userId);
  return NextResponse.json({ items: [] }, { status: 200 });
}

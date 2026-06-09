import { NextResponse } from "next/server";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";
import { addUserCartItemDelta, deleteUserCartItem } from "@/lib/cart/persistent-cart";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  const { slug } = await params;
  const items = await addUserCartItemDelta(userId, slug, -1);
  return NextResponse.json({ items }, { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  const { slug } = await params;
  const items = await deleteUserCartItem(userId, slug);
  return NextResponse.json({ items }, { status: 200 });
}

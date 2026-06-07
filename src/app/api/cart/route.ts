import { NextResponse } from "next/server";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";
import {
  clearUserCartItems,
  getUserCartItems,
  replaceUserCartItems,
  type PersistedCartInputItem,
} from "@/lib/cart/persistent-cart";

type CartPayload = {
  items?: PersistedCartInputItem[];
};

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

  let payload: CartPayload;
  try {
    payload = (await request.json()) as CartPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud de carrito invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const items = await replaceUserCartItems(userId, Array.isArray(payload.items) ? payload.items : []);
  return NextResponse.json({ items }, { status: 200 });
}

export async function DELETE(request: Request) {
  const userId = await getActiveUserId(request);
  if (!userId) return unauthenticatedResponse();

  await clearUserCartItems(userId);
  return NextResponse.json({ items: [] }, { status: 200 });
}

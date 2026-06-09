import { NextResponse } from "next/server";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";
import { addUserCartItemDelta } from "@/lib/cart/persistent-cart";

function unauthenticatedResponse() {
  return NextResponse.json(
    { message: "Inicia sesion para sincronizar el carrito.", code: "UNAUTHENTICATED" },
    { status: 401 }
  );
}

export async function POST(request: Request) {
  const sessionToken = getSessionTokenFromRequest(request);
  const activeSession = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;
  if (!activeSession) return unauthenticatedResponse();

  let slug: string;
  try {
    const body = (await request.json()) as { slug?: string };
    if (!body.slug?.trim()) throw new Error("missing slug");
    slug = body.slug.trim();
  } catch {
    return NextResponse.json(
      { message: "Solicitud invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const items = await addUserCartItemDelta(activeSession.userId, slug, 1);
  return NextResponse.json({ items }, { status: 200 });
}

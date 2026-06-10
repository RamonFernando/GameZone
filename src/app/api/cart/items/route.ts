import { NextResponse } from "next/server";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";
import { addUserCartItemDelta } from "@/lib/cart/persistent-cart";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const addItemSchema = z.object({
  slug: z.string().optional(),
});

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

  const parsed = await parseJsonBody(request, addItemSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { message: "Solicitud invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }
  const slug = parsed.data.slug?.trim();
  if (!slug) {
    return NextResponse.json(
      { message: "Solicitud invalida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const items = await addUserCartItemDelta(activeSession.userId, slug, 1);
  return NextResponse.json({ items }, { status: 200 });
}

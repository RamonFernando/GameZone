// Endpoint ligero para hidratar los likes del usuario en la home cacheada:
// el catálogo se sirve cacheado (igual para todos) y el estado personal
// (likedByCurrentUser) se resuelve aparte con esta llamada.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionFromToken, getSessionTokenFromRequest } from "@/lib/auth/session-server";

export async function GET(request: Request) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ likedIds: [] }, { status: 200 });
    }

    const activeSession = await getActiveSessionFromToken(token);
    if (!activeSession) {
      return NextResponse.json({ likedIds: [] }, { status: 200 });
    }

    const likes = await prisma.productLike.findMany({
      where: { userId: activeSession.userId },
      select: { productId: true },
    });

    return NextResponse.json(
      { likedIds: likes.map((item) => item.productId) },
      { status: 200 }
    );
  } catch {
    // Si falla la resolución de sesión, la home simplemente no marca likes.
    return NextResponse.json({ likedIds: [] }, { status: 200 });
  }
}

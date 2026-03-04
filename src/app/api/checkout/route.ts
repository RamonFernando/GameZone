import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import {
  CheckoutValidationError,
  completePaidOrder,
  createPendingOrder,
} from "@/lib/checkout/order-service";

type CheckoutPayload = {
  items?: Array<{ slug?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.CHECKOUT_CREATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  try {
    const pendingOrder = await createPendingOrder({
      userId: authResult.auth.userId,
      items: payload.items ?? [],
      paymentProvider: "manual",
    });

    const result = await completePaidOrder({
      orderId: pendingOrder.id,
      userId: authResult.auth.userId,
      paymentProvider: "manual",
      paymentReference: `manual-${pendingOrder.id}`,
      requestUrl: request.url,
      fallbackEmail: authResult.auth.email,
      fallbackUsername: authResult.auth.email.split("@")[0] || "gamer",
    });

    const response = NextResponse.json(
      {
        message: "Compra completada correctamente.",
        order: {
          id: result.order.id,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
          createdAt: result.order.createdAt,
          items: result.order.items,
        },
      },
      { status: 201 }
    );

    if (authResult.auth.rotatedToken) {
      response.cookies.set({
        ...getSessionCookieOptions(),
        value: authResult.auth.rotatedToken,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { message: "No se pudo completar la compra.", code: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}

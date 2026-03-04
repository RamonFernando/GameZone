import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { getStripeClient } from "@/lib/payments/stripe";

type FinalizeStripePayload = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.CHECKOUT_CREATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: FinalizeStripePayload;
  try {
    payload = (await request.json()) as FinalizeStripePayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const sessionId = String(payload.sessionId ?? "").trim();
  if (!sessionId) {
    return NextResponse.json(
      { message: "Falta sessionId de Stripe.", code: "MISSING_SESSION_ID" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { message: "El pago no fue completado todavía.", code: "PAYMENT_NOT_COMPLETED" },
        { status: 409 }
      );
    }

    const orderId = String(session.metadata?.orderId ?? "").trim();
    const userId = String(session.metadata?.userId ?? "").trim();
    if (!orderId || !userId || userId !== authResult.auth.userId) {
      return NextResponse.json(
        { message: "No pudimos validar el pedido de Stripe.", code: "INVALID_PROVIDER_METADATA" },
        { status: 403 }
      );
    }

    const result = await completePaidOrder({
      orderId,
      userId,
      paymentProvider: "stripe",
      paymentReference: session.payment_intent
        ? String(session.payment_intent)
        : session.id,
      requestUrl: request.url,
      fallbackEmail: authResult.auth.email,
      fallbackUsername: authResult.auth.email.split("@")[0] || "gamer",
    });

    const response = NextResponse.json(
      {
        message: "Pago confirmado con Stripe.",
        order: {
          id: result.order.id,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
          createdAt: result.order.createdAt,
          items: result.order.items,
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
  } catch {
    return NextResponse.json(
      { message: "Error confirmando pago con Stripe.", code: "STRIPE_FINALIZE_ERROR" },
      { status: 502 }
    );
  }
}

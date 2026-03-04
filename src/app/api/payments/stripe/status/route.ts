import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { getStripeClient } from "@/lib/payments/stripe";

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ORDER_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const url = new URL(request.url);
  const sessionId = String(url.searchParams.get("session_id") ?? "").trim();
  if (!sessionId) {
    return NextResponse.json(
      { message: "Falta session_id de Stripe.", code: "MISSING_SESSION_ID" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = String(session.metadata?.orderId ?? "").trim();
    const userId = String(session.metadata?.userId ?? "").trim();

    if (!orderId || !userId || userId !== authResult.auth.userId) {
      return NextResponse.json(
        { message: "No pudimos validar la sesión de Stripe.", code: "INVALID_PROVIDER_METADATA" },
        { status: 403 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: authResult.auth.userId,
      },
      select: {
        id: true,
        status: true,
        paidAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Pedido no encontrado.", code: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    let effectiveOrder = order;

    // Fallback idempotente: si Stripe ya confirma pago, cerramos el pedido aquí
    // aunque el webhook llegue tarde o falle temporalmente.
    if (
      effectiveOrder.status !== "paid" &&
      session.status === "complete" &&
      session.payment_status === "paid"
    ) {
      try {
        const finalized = await completePaidOrder({
          orderId: orderId,
          userId: authResult.auth.userId,
          paymentProvider: "stripe",
          paymentReference: session.payment_intent ? String(session.payment_intent) : session.id,
          requestUrl: request.url,
          fallbackEmail: authResult.auth.email,
          fallbackUsername: authResult.auth.email.split("@")[0] || "gamer",
        });

        effectiveOrder = {
          id: finalized.order.id,
          status: finalized.order.status,
          paidAt: finalized.order.paidAt,
        };
      } catch {
        // Si falla el fallback, mantenemos el polling normal de estado.
      }
    }

    const isFailedSession =
      session.status === "expired" ||
      (session.status === "complete" && session.payment_status !== "paid");

    const response =
      effectiveOrder.status === "paid"
        ? NextResponse.json(
            {
              message: "Pago confirmado con Stripe.",
              status: "paid",
              order: {
                id: effectiveOrder.id,
                paidAt: effectiveOrder.paidAt,
              },
            },
            { status: 200 }
          )
        : isFailedSession
          ? NextResponse.json(
              {
                message: "El pago no se completó.",
                status: "failed",
                order: {
                  id: effectiveOrder.id,
                },
              },
              { status: 200 }
            )
          : NextResponse.json(
              {
                message: "Pago recibido, esperando confirmación segura...",
                status: "processing",
                order: {
                  id: effectiveOrder.id,
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
      { message: "No se pudo validar el estado de Stripe.", code: "STRIPE_STATUS_ERROR" },
      { status: 502 }
    );
  }
}

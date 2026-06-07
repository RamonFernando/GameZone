import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { getStripeClient } from "@/lib/payments/stripe";
import { prisma } from "@/lib/prisma";

const PENDING_PAYMENT_LOOKBACK_HOURS = 24;

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ORDER_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const recentThreshold = new Date(
    Date.now() - PENDING_PAYMENT_LOOKBACK_HOURS * 60 * 60 * 1000
  );

  let pendingOrder = await prisma.order.findFirst({
    where: {
      userId: authResult.auth.userId,
      status: "pending",
      paymentProvider: {
        in: ["stripe", "paypal"],
      },
      createdAt: {
        gte: recentThreshold,
      },
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (
    pendingOrder?.paymentProvider === "stripe" &&
    pendingOrder.paymentReference
  ) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(
        pendingOrder.paymentReference
      );

      if (session.status === "complete" && session.payment_status === "paid") {
        await completePaidOrder({
          orderId: pendingOrder.id,
          userId: authResult.auth.userId,
          paymentProvider: "stripe",
          paymentReference: session.payment_intent
            ? String(session.payment_intent)
            : session.id,
          requestUrl: request.url,
          fallbackEmail: authResult.auth.email,
          fallbackUsername: authResult.auth.email.split("@")[0] || "gamer",
        });

        pendingOrder = null;
      }
    } catch {
      // If Stripe is temporarily unavailable, keep showing the pending panel.
    }
  }

  const response = NextResponse.json({
    pendingPayment: pendingOrder
      ? {
          id: pendingOrder.id,
          status: pendingOrder.status,
          paymentProvider: pendingOrder.paymentProvider,
          totalAmount: pendingOrder.totalAmount,
          currency: pendingOrder.currency,
          createdAt: pendingOrder.createdAt,
          items: pendingOrder.items,
        }
      : null,
  });

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

import { NextResponse } from "next/server";
import type { Order, OrderItem } from "@prisma/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { getStripeClient } from "@/lib/payments/stripe";
import { prisma } from "@/lib/prisma";

const PENDING_PAYMENT_LOOKBACK_HOURS = 24;
type PendingPaymentValidationStatus = "processing" | "error" | "failed";
type PaymentOrder = Order & { items: OrderItem[] };

function serializePaymentOrder(
  order: PaymentOrder,
  extra?: {
    validationStatus?: PendingPaymentValidationStatus;
    validationMessage?: string;
    stripeSessionStatus?: string | null;
    stripePaymentStatus?: string | null;
  }
) {
  return {
    id: order.id,
    status: order.status,
    paymentProvider: order.paymentProvider,
    totalAmount: order.totalAmount,
    currency: order.currency,
    createdAt: order.createdAt,
    items: order.items,
    validationStatus: extra?.validationStatus,
    validationMessage: extra?.validationMessage,
    stripeSessionStatus: extra?.stripeSessionStatus,
    stripePaymentStatus: extra?.stripePaymentStatus,
  };
}

export async function GET(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.ORDER_READ);
  if (!authResult.ok) {
    return authResult.response;
  }

  const recentThreshold = new Date(
    Date.now() - PENDING_PAYMENT_LOOKBACK_HOURS * 60 * 60 * 1000
  );

  const latestPaymentOrder = await prisma.order.findFirst({
    where: {
      userId: authResult.auth.userId,
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
  let pendingOrder = latestPaymentOrder?.status === "pending" ? latestPaymentOrder : null;
  let paymentResult = latestPaymentOrder && latestPaymentOrder.status !== "pending" ? latestPaymentOrder : null;

  let validationStatus: PendingPaymentValidationStatus = "processing";
  let validationMessage = "";
  let stripeSessionStatus: string | null = null;
  let stripePaymentStatus: string | null = null;

  if (
    pendingOrder?.paymentProvider === "stripe" &&
    pendingOrder.paymentReference
  ) {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(
        pendingOrder.paymentReference
      );
      stripeSessionStatus = session.status ?? null;
      stripePaymentStatus = session.payment_status ?? null;

      if (session.status === "complete" && session.payment_status === "paid") {
        try {
          const finalized = await completePaidOrder({
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

          paymentResult = finalized.order;
          pendingOrder = null;
        } catch (error) {
          console.error("Stripe confirmó el pago pendiente, pero no se pudo cerrar el pedido.", error);
          validationStatus = "error";
          validationMessage =
            "Stripe confirmó el pago, pero no pudimos registrar el pedido. Revisa el servidor antes de repetir la compra.";
        }
      } else if (
        session.status === "expired" ||
        (session.status === "complete" && session.payment_status !== "paid")
      ) {
        validationStatus = "failed";
        validationMessage = "Stripe no confirmó el pago de este pedido.";
        await prisma.order.updateMany({
          where: {
            id: pendingOrder.id,
            userId: authResult.auth.userId,
            status: "pending",
          },
          data: {
            status: session.status === "expired" ? "canceled" : "failed",
          },
        });
      } else {
        validationMessage = "Stripe todavía está procesando la confirmación del pago.";
      }
    } catch (error) {
      console.error("No se pudo consultar el pago pendiente en Stripe.", error);
      validationStatus = "error";
      validationMessage =
        "No pudimos consultar Stripe. Revisa la conexión o las claves de Stripe antes de repetir la compra.";
    }
  }

  const response = NextResponse.json({
    pendingPayment: pendingOrder
      ? serializePaymentOrder(pendingOrder, {
          validationStatus,
          validationMessage,
          stripeSessionStatus,
          stripePaymentStatus,
        })
      : null,
    paymentResult: paymentResult ? serializePaymentOrder(paymentResult) : null,
  });

  if (authResult.auth.rotatedToken) {
    response.cookies.set({
      ...getSessionCookieOptions(),
      value: authResult.auth.rotatedToken,
    });
  }

  return response;
}

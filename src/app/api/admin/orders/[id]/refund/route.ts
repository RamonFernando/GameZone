import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { getStripeClient } from "@/lib/payments/stripe";
import { sendRefundConfirmationEmail } from "@/lib/auth/email";

function resolvePaymentIntentReference(reference: string) {
  if (reference.startsWith("pi_")) {
    return { type: "payment_intent" as const, id: reference };
  }
  if (reference.startsWith("cs_")) {
    return { type: "checkout_session" as const, id: reference };
  }
  return { type: "unknown" as const, id: reference };
}

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const authResult = await requirePermission(request, PERMISSIONS.ADMIN_ORDERS_WRITE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let body: { reason?: string } = {};
  try {
    body = (await request.json()) as { reason?: string };
  } catch {
    // Permitimos body vacío para mantener compatibilidad, pero validamos razón luego.
  }

  const refundReason = String(body.reason ?? "").trim();
  if (refundReason.length < 5) {
    return NextResponse.json(
      { message: "Debes indicar un motivo de reembolso (mínimo 5 caracteres).", code: "INVALID_REFUND_REASON" },
      { status: 400 }
    );
  }

  const orderId = String(context.params.id ?? "").trim();
  if (!orderId) {
    return NextResponse.json(
      { message: "Pedido inválido.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      items: {
        select: {
          id: true,
          title: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { message: "Pedido no encontrado.", code: "ORDER_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (order.status === "refunded") {
    return NextResponse.json(
      { message: "El pedido ya está reembolsado.", code: "ORDER_ALREADY_REFUNDED" },
      { status: 409 }
    );
  }

  if (order.status !== "paid") {
    return NextResponse.json(
      { message: "Solo se pueden reembolsar pedidos pagados.", code: "ORDER_NOT_PAID" },
      { status: 409 }
    );
  }

  if (order.paymentProvider !== "stripe") {
    return NextResponse.json(
      {
        message: "Por ahora solo está habilitado el reembolso automático para Stripe.",
        code: "REFUND_PROVIDER_NOT_SUPPORTED",
      },
      { status: 400 }
    );
  }

  if (!order.paymentReference) {
    return NextResponse.json(
      { message: "El pedido no tiene referencia de pago.", code: "MISSING_PAYMENT_REFERENCE" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const parsedReference = resolvePaymentIntentReference(order.paymentReference);
    let paymentIntentId = "";

    if (parsedReference.type === "payment_intent") {
      paymentIntentId = parsedReference.id;
    } else if (parsedReference.type === "checkout_session") {
      const session = await stripe.checkout.sessions.retrieve(parsedReference.id);
      paymentIntentId = session.payment_intent ? String(session.payment_intent) : "";
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        {
          message:
            "No se pudo resolver el identificador de pago para ejecutar el reembolso.",
          code: "INVALID_PAYMENT_REFERENCE",
        },
        { status: 400 }
      );
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        orderId: order.id,
        adminUserId: authResult.auth.userId,
        refundReason,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        refundedAt: new Date(),
        refundedByUserId: authResult.auth.userId,
        refundReason,
        refundReference: refund.id,
      },
    });

    try {
      const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
      await sendRefundConfirmationEmail({
        to: order.user.email,
        username: order.user.name,
        orderId: order.id,
        orderUrl: `${baseUrl}/account?order=${order.id}`,
        currency: order.currency,
        totalAmount: order.totalAmount,
        reason: refundReason,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: {
          refundEmailSentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("No se pudo enviar email de reembolso.", error);
    }

    const response = NextResponse.json(
      {
        message: "Reembolso procesado correctamente en Stripe.",
        refund: {
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
        },
        order: {
          id: order.id,
          status: "refunded",
          refundedAt: new Date(),
          refundedByUserId: authResult.auth.userId,
          refundReason,
          refundReference: refund.id,
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
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo procesar el reembolso en Stripe.",
        code: "REFUND_FAILED",
      },
      { status: 502 }
    );
  }
}

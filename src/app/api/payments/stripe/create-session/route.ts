import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { createPendingOrder } from "@/lib/checkout/order-service";
import { getStripeClient } from "@/lib/payments/stripe";
import { z } from "zod";
import { parseJsonBody } from "@/lib/validation";

const createStripeCheckoutSchema = z.object({
  items: z
    .array(z.object({ slug: z.string().optional(), quantity: z.number().optional() }))
    .optional(),
});

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.CHECKOUT_CREATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = await parseJsonBody(request, createStripeCheckoutSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const pendingOrder = await createPendingOrder({
      userId: authResult.auth.userId,
      items: payload.items ?? [],
      paymentProvider: "stripe",
    });

    const stripe = getStripeClient();
    const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      client_reference_id: pendingOrder.id,
      line_items: pendingOrder.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: pendingOrder.currency.toLowerCase(),
          unit_amount: Math.round(item.unitPrice * 100),
          product_data: {
            name: item.title,
          },
        },
      })),
      metadata: {
        orderId: pendingOrder.id,
        userId: authResult.auth.userId,
        userEmail: authResult.auth.email,
      },
      success_url: `${baseUrl}/checkout/success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?canceled=1`,
    });

    await prisma.order.update({
      where: { id: pendingOrder.id },
      data: {
        paymentReference: session.id,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { message: "No se pudo iniciar Stripe Checkout.", code: "STRIPE_SESSION_ERROR" },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        message: "Redirigiendo a Stripe Checkout...",
        checkoutUrl: session.url,
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
            : "No se pudo inicializar el pago con Stripe.",
        code: "CHECKOUT_PROVIDER_ERROR",
      },
      { status: 400 }
    );
  }
}

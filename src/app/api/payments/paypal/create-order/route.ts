import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { createPendingOrder } from "@/lib/checkout/order-service";
import { createPaypalOrder, getPaypalAccessToken } from "@/lib/payments/paypal";

type CreatePaypalOrderPayload = {
  items?: Array<{ slug?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.CHECKOUT_CREATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: CreatePaypalOrderPayload;
  try {
    payload = (await request.json()) as CreatePaypalOrderPayload;
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
      paymentProvider: "paypal",
    });

    const baseUrl = process.env.APP_BASE_URL ?? new URL(request.url).origin;
    const accessToken = await getPaypalAccessToken();
    const paypalOrder = await createPaypalOrder({
      accessToken,
      orderId: pendingOrder.id,
      amount: {
        currency_code: pendingOrder.currency,
        value: pendingOrder.totalAmount.toFixed(2),
        breakdown: {
          item_total: {
            currency_code: pendingOrder.currency,
            value: pendingOrder.totalAmount.toFixed(2),
          },
        },
      },
      items: pendingOrder.items.map((item) => ({
        name: item.title.slice(0, 120),
        quantity: String(item.quantity),
        unit_amount: {
          currency_code: pendingOrder.currency,
          value: item.unitPrice.toFixed(2),
        },
      })),
      returnUrl: `${baseUrl}/checkout/success?provider=paypal`,
      cancelUrl: `${baseUrl}/checkout?canceled=1`,
    });

    await prisma.order.update({
      where: { id: pendingOrder.id },
      data: {
        paymentReference: paypalOrder.id,
      },
    });

    const approveLink = paypalOrder.links.find((link) => link.rel === "approve")?.href;
    if (!approveLink) {
      return NextResponse.json(
        { message: "No se recibió URL de aprobación de PayPal.", code: "PAYPAL_APPROVAL_MISSING" },
        { status: 502 }
      );
    }

    const response = NextResponse.json(
      {
        message: "Redirigiendo a PayPal...",
        checkoutUrl: approveLink,
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
          error instanceof Error ? error.message : "No se pudo iniciar el pago con PayPal.",
        code: "CHECKOUT_PROVIDER_ERROR",
      },
      { status: 400 }
    );
  }
}

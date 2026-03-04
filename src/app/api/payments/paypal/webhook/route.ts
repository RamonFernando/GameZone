import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  capturePaypalOrder,
  getPaypalAccessToken,
  verifyPaypalWebhookSignature,
} from "@/lib/payments/paypal";
import { completePaidOrder } from "@/lib/checkout/order-service";

function headerValue(headers: Headers, key: string) {
  return headers.get(key) ?? "";
}

export async function POST(request: Request) {
  const rawPayload = await request.text();
  let eventPayload: unknown;
  try {
    eventPayload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
  }

  const isValid = await verifyPaypalWebhookSignature({
    headers: {
      transmissionId: headerValue(request.headers, "paypal-transmission-id"),
      transmissionTime: headerValue(request.headers, "paypal-transmission-time"),
      transmissionSig: headerValue(request.headers, "paypal-transmission-sig"),
      certUrl: headerValue(request.headers, "paypal-cert-url"),
      authAlgo: headerValue(request.headers, "paypal-auth-algo"),
    },
    webhookEvent: eventPayload,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ message: "Webhook de PayPal no verificado." }, { status: 400 });
  }

  const event = eventPayload as {
    event_type?: string;
    resource?: {
      id?: string;
      supplementary_data?: {
        related_ids?: {
          order_id?: string;
        };
      };
    };
  };

  if (event.event_type === "CHECKOUT.ORDER.APPROVED" && event.resource?.id) {
    // Capturamos automáticamente si el usuario no volvió al return_url.
    const accessToken = await getPaypalAccessToken();
    const capture = await capturePaypalOrder({
      accessToken,
      paypalOrderId: event.resource.id,
    }).catch(() => null);

    if (capture?.status === "COMPLETED") {
      const order = await prisma.order.findFirst({
        where: {
          paymentReference: event.resource.id,
        },
      });

      if (order) {
        await completePaidOrder({
          orderId: order.id,
          userId: order.userId,
          paymentProvider: "paypal",
          paymentReference: capture.id,
          requestUrl: request.url,
          fallbackEmail: "no-reply@gamezone.local",
          fallbackUsername: "gamer",
        });
      }
    }
  }

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
    const captureId = event.resource?.id;
    if (paypalOrderId && captureId) {
      const order = await prisma.order.findFirst({
        where: {
          paymentReference: paypalOrderId,
        },
      });

      if (order) {
        await completePaidOrder({
          orderId: order.id,
          userId: order.userId,
          paymentProvider: "paypal",
          paymentReference: captureId,
          requestUrl: request.url,
          fallbackEmail: "no-reply@gamezone.local",
          fallbackUsername: "gamer",
        });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

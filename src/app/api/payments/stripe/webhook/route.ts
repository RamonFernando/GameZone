import Stripe from "stripe";
import { NextResponse } from "next/server";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    return NextResponse.json(
      { message: "STRIPE_WEBHOOK_SECRET no configurado." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { message: "Firma de Stripe ausente." },
      { status: 400 }
    );
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch {
    return NextResponse.json(
      { message: "Firma de Stripe inválida." },
      { status: 400 }
    );
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = String(session.metadata?.orderId ?? "").trim();
  const userId = String(session.metadata?.userId ?? "").trim();
  const userEmail = String(session.metadata?.userEmail ?? "").trim();

  if (
    (event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded") &&
    orderId &&
    userId
  ) {
    await completePaidOrder({
      orderId,
      userId,
      paymentProvider: "stripe",
      paymentReference: session.payment_intent ? String(session.payment_intent) : session.id,
      requestUrl: request.url,
      fallbackEmail: userEmail || "no-reply@gamezone.local",
      fallbackUsername: userEmail.includes("@") ? userEmail.split("@")[0] : "gamer",
    });
  }

  if (event.type === "checkout.session.expired" && orderId && userId) {
    await prisma.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: "pending",
      },
      data: {
        status: "canceled",
      },
    });
  }

  if (event.type === "checkout.session.async_payment_failed" && orderId && userId) {
    await prisma.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: "pending",
      },
      data: {
        status: "failed",
      },
    });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/payments/stripe", () => ({
  getStripeClient: () => ({
    webhooks: {
      constructEvent,
    },
  }),
}));

vi.mock("@/lib/checkout/order-service", () => ({
  completePaidOrder: vi.fn().mockResolvedValue({ order: { id: "order-1" }, emailSent: true }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

import { completePaidOrder } from "@/lib/checkout/order-service";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function stripeRequest(body = "{}") {
  return new Request("https://gamezone.test/api/payments/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body,
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("rechaza la petición si falta el secreto del webhook", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(stripeRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({ message: "STRIPE_WEBHOOK_SECRET no configurado." });
  });

  it("rechaza la petición si falta la firma de Stripe", async () => {
    const response = await POST(
      new Request("https://gamezone.test/api/payments/stripe/webhook", {
        method: "POST",
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Firma de Stripe ausente." });
  });

  it("rechaza la petición si Stripe no puede validar la firma", async () => {
    constructEvent.mockImplementationOnce(() => {
      throw new Error("bad signature");
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Firma de Stripe inválida." });
  });

  it("ignora eventos no manejados sin tocar pedidos", async () => {
    constructEvent.mockReturnValueOnce({
      type: "customer.created",
      data: { object: {} },
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true });
    expect(completePaidOrder).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("completa el pedido para checkout.session.completed con metadatos válidos", async () => {
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          payment_intent: "pi_test",
          metadata: {
            orderId: "order-1",
            userId: "user-1",
            userEmail: "gamer@example.com",
          },
        },
      },
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(completePaidOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        userId: "user-1",
        paymentProvider: "stripe",
        paymentReference: "pi_test",
        fallbackEmail: "gamer@example.com",
        fallbackUsername: "gamer",
      })
    );
  });

  it("marca como canceled un checkout.session.expired pendiente", async () => {
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.expired",
      data: {
        object: {
          metadata: { orderId: "order-1", userId: "user-1" },
        },
      },
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", userId: "user-1", status: "pending" },
      data: { status: "canceled" },
    });
  });

  it("marca como failed un checkout.session.async_payment_failed pendiente", async () => {
    constructEvent.mockReturnValueOnce({
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          metadata: { orderId: "order-1", userId: "user-1" },
        },
      },
    });

    const response = await POST(stripeRequest());

    expect(response.status).toBe(200);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order-1", userId: "user-1", status: "pending" },
      data: { status: "failed" },
    });
  });
});

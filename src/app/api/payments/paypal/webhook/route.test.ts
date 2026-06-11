import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/payments/paypal", () => ({
  verifyPaypalWebhookSignature: vi.fn().mockResolvedValue(true),
  getPaypalAccessToken: vi.fn().mockResolvedValue("access-token"),
  capturePaypalOrder: vi.fn().mockResolvedValue({ id: "capture-1", status: "COMPLETED" }),
}));

vi.mock("@/lib/checkout/order-service", () => ({
  completePaidOrder: vi.fn().mockResolvedValue({ order: { id: "order-1" }, emailSent: true }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findFirst: vi.fn().mockResolvedValue({
        id: "order-1",
        userId: "user-1",
      }),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { completePaidOrder } from "@/lib/checkout/order-service";
import { logger } from "@/lib/logger";
import {
  capturePaypalOrder,
  getPaypalAccessToken,
  verifyPaypalWebhookSignature,
} from "@/lib/payments/paypal";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

function paypalRequest(payload: unknown) {
  return new Request("https://gamezone.test/api/payments/paypal/webhook", {
    method: "POST",
    headers: {
      "paypal-transmission-id": "transmission-id",
      "paypal-transmission-time": "2026-06-11T10:00:00Z",
      "paypal-transmission-sig": "sig",
      "paypal-cert-url": "https://paypal.test/cert",
      "paypal-auth-algo": "SHA256withRSA",
    },
    body: JSON.stringify(payload),
  });
}

describe("PayPal webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza JSON inválido", async () => {
    const response = await POST(
      new Request("https://gamezone.test/api/payments/paypal/webhook", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Payload inválido." });
  });

  it("rechaza webhooks no verificados", async () => {
    vi.mocked(verifyPaypalWebhookSignature).mockResolvedValueOnce(false);

    const response = await POST(paypalRequest({ event_type: "CHECKOUT.ORDER.APPROVED" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Webhook de PayPal no verificado." });
  });

  it("registra errores de verificación y devuelve 400", async () => {
    const err = new Error("verification failed");
    vi.mocked(verifyPaypalWebhookSignature).mockRejectedValueOnce(err);

    const response = await POST(paypalRequest({ event_type: "CHECKOUT.ORDER.APPROVED" }));

    expect(response.status).toBe(400);
    expect(logger.error).toHaveBeenCalledWith("Error verificando firma del webhook de PayPal.", {
      err,
    });
  });

  it("ignora eventos no manejados sin completar pedidos", async () => {
    const response = await POST(paypalRequest({ event_type: "BILLING.SUBSCRIPTION.CREATED" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true });
    expect(completePaidOrder).not.toHaveBeenCalled();
  });

  it("captura y completa el pedido para CHECKOUT.ORDER.APPROVED", async () => {
    const response = await POST(
      paypalRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "paypal-order-1" },
      })
    );

    expect(response.status).toBe(200);
    expect(getPaypalAccessToken).toHaveBeenCalledTimes(1);
    expect(capturePaypalOrder).toHaveBeenCalledWith({
      accessToken: "access-token",
      paypalOrderId: "paypal-order-1",
    });
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { paymentReference: "paypal-order-1" },
    });
    expect(completePaidOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        userId: "user-1",
        paymentProvider: "paypal",
        paymentReference: "capture-1",
      })
    );
  });

  it("registra error de captura y no completa el pedido", async () => {
    const err = new Error("capture failed");
    vi.mocked(capturePaypalOrder).mockRejectedValueOnce(err);

    const response = await POST(
      paypalRequest({
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "paypal-order-1" },
      })
    );

    expect(response.status).toBe(200);
    expect(logger.error).toHaveBeenCalledWith("Error capturando orden de PayPal en webhook.", {
      err,
      paypalOrderId: "paypal-order-1",
    });
    expect(completePaidOrder).not.toHaveBeenCalled();
  });

  it("completa el pedido para PAYMENT.CAPTURE.COMPLETED usando el order_id relacionado", async () => {
    const response = await POST(
      paypalRequest({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "capture-1",
          supplementary_data: {
            related_ids: {
              order_id: "paypal-order-1",
            },
          },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { paymentReference: "paypal-order-1" },
    });
    expect(completePaidOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        userId: "user-1",
        paymentProvider: "paypal",
        paymentReference: "capture-1",
      })
    );
  });
});

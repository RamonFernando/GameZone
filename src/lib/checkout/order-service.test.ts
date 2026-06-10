import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeTotalAmount, completePaidOrder, CheckoutValidationError } from "./order-service";

// Hoisted so the reference is available inside the vi.mock factory below
const mockTx = vi.hoisted(() => ({
  order: {
    updateMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: unknown) => unknown)(mockTx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  },
}));

vi.mock("@/lib/auth/email", () => ({
  sendPurchaseConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cart/persistent-cart", () => ({
  clearUserCartItems: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { sendPurchaseConfirmationEmail } from "@/lib/auth/email";

const MOCK_ORDER_ITEMS = [
  {
    id: "item-1",
    orderId: "order-abc",
    gameSlug: "cyberpunk-2077",
    title: "Cyberpunk 2077",
    unitPrice: 29.99,
    quantity: 1,
    subtotal: 29.99,
  },
];

const MOCK_ORDER = {
  id: "order-abc",
  userId: "user-xyz",
  status: "pending",
  totalAmount: 29.99,
  currency: "EUR",
  paymentProvider: "stripe",
  paymentReference: null,
  confirmationEmailSentAt: null,
  paidAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: MOCK_ORDER_ITEMS,
};

const MOCK_PAID_ORDER = {
  ...MOCK_ORDER,
  status: "paid",
  paidAt: new Date(),
};

const MOCK_USER = { name: "Gamer", email: "gamer@test.com" };
const MOCK_PRODUCT = { id: "prod-1", stock: 5 };

const COMPLETE_INPUT = {
  orderId: "order-abc",
  userId: "user-xyz",
  paymentProvider: "stripe" as const,
  paymentReference: "pi_test_123",
  requestUrl: "https://gamezone.app/api/payments/stripe/webhook",
  fallbackEmail: "no-reply@gamezone.local",
  fallbackUsername: "gamer",
};

// ---------------------------------------------------------------------------
// computeTotalAmount — función pura, sin dependencias
// ---------------------------------------------------------------------------
describe("computeTotalAmount", () => {
  it("suma correctamente los subtotales", () => {
    const items = [
      { gameSlug: "a", title: "A", unitPrice: 10, quantity: 2, subtotal: 20 },
      { gameSlug: "b", title: "B", unitPrice: 5.5, quantity: 3, subtotal: 16.5 },
    ];
    expect(computeTotalAmount(items)).toBe(36.5);
  });

  it("devuelve 0 para una lista vacía", () => {
    expect(computeTotalAmount([])).toBe(0);
  });

  it("redondea a 2 decimales evitando errores de coma flotante", () => {
    // 0.1 * 3 = 0.30000000000000004 sin toFixed
    const items = [
      { gameSlug: "a", title: "A", unitPrice: 0.1, quantity: 3, subtotal: 0.30000000000000004 },
      { gameSlug: "b", title: "B", unitPrice: 0.2, quantity: 1, subtotal: 0.2 },
    ];
    expect(computeTotalAmount(items)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// completePaidOrder — idempotencia del estado y del email
// ---------------------------------------------------------------------------
describe("completePaidOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza CheckoutValidationError ORDER_NOT_FOUND si el pedido no existe", async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(null);

    await expect(completePaidOrder(COMPLETE_INPUT)).rejects.toThrow(CheckoutValidationError);
    await expect(completePaidOrder(COMPLETE_INPUT)).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
  });

  it("no repite descuento de stock ni envío de email ante llamadas duplicadas (idempotencia)", async () => {
    // --- Primera llamada: webhook llega, el pedido estaba pending ---
    vi.mocked(prisma.order.findFirst)
      .mockResolvedValueOnce(MOCK_ORDER as never)       // 1ª: pending
      .mockResolvedValueOnce(MOCK_PAID_ORDER as never); // 2ª: ya paid

    // Status claim dentro de $transaction
    mockTx.order.updateMany
      .mockResolvedValueOnce({ count: 1 }) // 1ª: gana la transición pending→paid
      .mockResolvedValueOnce({ count: 0 }); // 2ª: ya pagado, no hace nada

    mockTx.order.findFirstOrThrow
      .mockResolvedValueOnce(MOCK_PAID_ORDER as never)
      .mockResolvedValueOnce(MOCK_PAID_ORDER as never);

    // Stock: solo se descuenta cuando count > 0 (primera llamada)
    mockTx.product.findUnique.mockResolvedValueOnce(MOCK_PRODUCT as never);
    mockTx.product.update.mockResolvedValueOnce({} as never);

    // Email claim fuera de $transaction
    vi.mocked(prisma.order.updateMany)
      .mockResolvedValueOnce({ count: 1 }) // 1ª: gana el claim de email
      .mockResolvedValueOnce({ count: 0 }); // 2ª: email ya enviado

    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(MOCK_USER as never);

    // --- Ejecutar ambas llamadas (simula webhook duplicado) ---
    const result1 = await completePaidOrder(COMPLETE_INPUT);
    const result2 = await completePaidOrder(COMPLETE_INPUT);

    // El email se envía exactamente una vez
    expect(sendPurchaseConfirmationEmail).toHaveBeenCalledTimes(1);

    // El stock solo se descuenta una vez
    expect(mockTx.product.update).toHaveBeenCalledTimes(1);

    // La primera llamada marca emailSent como true (envió el email)
    expect(result1.emailSent).toBe(true);

    // La segunda llamada también devuelve emailSent: true porque el email
    // ya estaba enviado (count === 0 significa que otro lo hizo antes)
    expect(result2.emailSent).toBe(true);
  });
});

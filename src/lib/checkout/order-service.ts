import { prisma } from "@/lib/prisma";
import { sendPurchaseConfirmationEmail } from "@/lib/auth/email";
import { clearUserCartItems } from "@/lib/cart/persistent-cart";
import { computeDiscountedPrice, ensureProductsSeeded } from "@/lib/products";
import { logger } from "@/lib/logger";

type CheckoutItemInput = {
  slug?: string;
  quantity?: number;
};

type NormalizedOrderItem = {
  gameSlug: string;
  title: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export const MAX_ITEMS_PER_ORDER = 20;
export const MAX_QUANTITY_PER_ITEM = 5;
export const ORDER_CURRENCY = "EUR";

export class CheckoutValidationError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function normalizeOrderItemsFromDb(
  rawItems: CheckoutItemInput[]
): Promise<NormalizedOrderItem[]> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new CheckoutValidationError("Tu carrito está vacío.", "EMPTY_CART");
  }

  if (rawItems.length > MAX_ITEMS_PER_ORDER) {
    throw new CheckoutValidationError(
      `Demasiados ítems. Máximo ${MAX_ITEMS_PER_ORDER} por pedido.`,
      "TOO_MANY_ITEMS"
    );
  }

  await ensureProductsSeeded();
  const products = await prisma.product.findMany({
    where: { isActive: true },
  });
  const catalogMap = new Map(products.map((product) => [product.slug, product]));
  const normalizedItems = rawItems.map((item) => ({
    slug: String(item.slug ?? "").trim(),
    quantity: Number(item.quantity ?? 0),
  }));

  for (const item of normalizedItems) {
    if (!item.slug || !catalogMap.has(item.slug)) {
      throw new CheckoutValidationError(
        "Uno de los productos ya no está disponible.",
        "INVALID_ITEM"
      );
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY_PER_ITEM
    ) {
      throw new CheckoutValidationError(
        `Cantidad inválida para ${item.slug}. Máximo ${MAX_QUANTITY_PER_ITEM}.`,
        "INVALID_QUANTITY"
      );
    }
  }

  const consolidated = new Map<string, number>();
  for (const item of normalizedItems) {
    consolidated.set(item.slug, (consolidated.get(item.slug) ?? 0) + item.quantity);
  }

  for (const [slug, quantity] of consolidated.entries()) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new CheckoutValidationError(
        `Cantidad total inválida para ${slug}. Máximo ${MAX_QUANTITY_PER_ITEM}.`,
        "INVALID_QUANTITY"
      );
    }

    const product = catalogMap.get(slug)!;
    if (product.stock < quantity) {
      throw new CheckoutValidationError(
        product.stock <= 0
          ? `${product.name} está agotado.`
          : `No hay stock suficiente para ${product.name}. Disponibles: ${product.stock}.`,
        "OUT_OF_STOCK",
        409
      );
    }
  }

  return Array.from(consolidated.entries()).map(([slug, quantity]) => {
    const product = catalogMap.get(slug)!;
    const currentUnitPrice = computeDiscountedPrice(
      product.priceOriginal,
      product.discountPercent
    );
    const subtotal = Number((currentUnitPrice * quantity).toFixed(2));
    return {
      gameSlug: slug,
      title: product.name,
      unitPrice: currentUnitPrice,
      quantity,
      subtotal,
    };
  });
}

export function computeTotalAmount(items: NormalizedOrderItem[]): number {
  return Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
}

export async function createPendingOrder(input: {
  userId: string;
  items: CheckoutItemInput[];
  paymentProvider: "stripe" | "paypal" | "manual";
}) {
  const orderItems = await normalizeOrderItemsFromDb(input.items);
  const totalAmount = computeTotalAmount(orderItems);

  return prisma.order.create({
    data: {
      userId: input.userId,
      totalAmount,
      currency: ORDER_CURRENCY,
      status: "pending",
      paymentProvider: input.paymentProvider,
      items: {
        create: orderItems,
      },
    },
    include: {
      items: true,
    },
  });
}

export async function completePaidOrder(input: {
  orderId: string;
  userId: string;
  paymentProvider: "stripe" | "paypal" | "manual";
  paymentReference: string;
  requestUrl: string;
  fallbackEmail: string;
  fallbackUsername: string;
}) {
  const existing = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      userId: input.userId,
    },
    include: {
      items: true,
    },
  });

  if (!existing) {
    throw new CheckoutValidationError("Pedido no encontrado.", "ORDER_NOT_FOUND", 404);
  }

  // Claim atómico: solo el primer webhook/llamada que gane la transición
  // pending -> paid descuenta stock. Los duplicados (PayPal envía 2 eventos)
  // ven count === 0 y no repiten el descuento.
  const paidOrder = await prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: {
        id: existing.id,
        userId: input.userId,
        status: { not: "paid" },
      },
      data: {
        status: "paid",
        paidAt: new Date(),
        paymentProvider: input.paymentProvider,
        paymentReference: input.paymentReference,
      },
    });

    const order = await tx.order.findFirstOrThrow({
      where: { id: existing.id, userId: input.userId },
      include: { items: true },
    });

    // Solo descontamos stock si esta llamada ganó la transición.
    if (claim.count > 0) {
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { slug: item.gameSlug },
          select: { id: true, stock: true },
        });
        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: Math.max(0, product.stock - item.quantity) },
          });
        }
      }
    }

    return order;
  });

  await clearUserCartItems(input.userId);

  // Claim atómico del email: solo gana quien pasa confirmationEmailSentAt de null
  // a una fecha. Evita correos duplicados ante webhooks concurrentes.
  const emailClaim = await prisma.order.updateMany({
    where: { id: paidOrder.id, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: new Date() },
  });

  if (emailClaim.count === 0) {
    return {
      order: paidOrder,
      emailSent: true,
    };
  }

  const baseUrl = process.env.APP_BASE_URL ?? new URL(input.requestUrl).origin;
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true },
  });

  const recipientEmail = user?.email ?? input.fallbackEmail;
  const recipientName = user?.name ?? input.fallbackUsername;
  let emailSent = false;

  try {
    await sendPurchaseConfirmationEmail({
      to: recipientEmail,
      username: recipientName,
      orderId: paidOrder.id,
      orderUrl: `${baseUrl}/account?order=${paidOrder.id}`,
      currency: paidOrder.currency,
      totalAmount: paidOrder.totalAmount,
      items: paidOrder.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
    });
    emailSent = true;
  } catch (error) {
    // Liberamos el claim para permitir un reintento posterior y no bloqueamos
    // la confirmación de pago si falla el email.
    await prisma.order.update({
      where: { id: paidOrder.id },
      data: { confirmationEmailSentAt: null },
    });
    logger.error("No se pudo enviar el email de confirmación de compra.", {
      orderId: paidOrder.id,
      err: error,
    });
  }

  return {
    order: paidOrder,
    emailSent,
  };
}

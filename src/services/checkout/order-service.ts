import { prisma } from "@/lib/prisma";
import { sendPurchaseConfirmationEmail, sendLowKeyStockAlert } from "@/services/auth/email";
import { clearUserCartItems } from "@/services/cart/persistent-cart";
import { computeDiscountedPrice, ensureProductsSeeded } from "@/lib/products";
import { logger } from "@/lib/logger";

// Umbral de claves disponibles por debajo del cual se avisa al admin (14.6).
export const LOW_KEY_STOCK_THRESHOLD = 3;

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
  if (input.items.length === 0) {
    throw new CheckoutValidationError("El carrito no puede estar vacío.", "EMPTY_CART", 400);
  }

  const orderItems = await normalizeOrderItemsFromDb(input.items);
  const totalAmount = computeTotalAmount(orderItems);

  if (totalAmount <= 0) {
    throw new CheckoutValidationError("El importe total debe ser mayor que cero.", "INVALID_AMOUNT", 400);
  }

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
  const txResult = await prisma.$transaction(async (tx) => {
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

    // Solo descontamos stock y asignamos claves si esta llamada ganó la transición.
    let hasMissingKey = false;
    // Mapa itemId → keyCode para reflejar las claves asignadas en la respuesta sin releer.
    const assignedKeys = new Map<string, string>();
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

        // Asignación atómica de clave: updateMany con condición IS NULL garantiza que
        // solo un pedido puede tomar cada clave incluso con webhooks concurrentes.
        const keyAssign = await tx.gameKey.updateMany({
          where: { productSlug: item.gameSlug, assignedOrderId: null },
          data: { assignedOrderId: order.id, assignedItemId: item.id, assignedAt: new Date() },
        });

        if (keyAssign.count > 0) {
          const assignedKey = await tx.gameKey.findFirst({
            where: { productSlug: item.gameSlug, assignedOrderId: order.id, assignedItemId: item.id },
            select: { keyCode: true },
          });
          if (assignedKey) {
            await tx.orderItem.update({ where: { id: item.id }, data: { gameKey: assignedKey.keyCode } });
            assignedKeys.set(item.id, assignedKey.keyCode);
          } else {
            hasMissingKey = true;
          }
        } else {
          hasMissingKey = true;
        }
      }

      if (hasMissingKey) {
        await tx.order.update({ where: { id: order.id }, data: { status: "paid_pending_key" } });
        logger.warn("Pedido pagado sin clave disponible — requiere atención manual.", { orderId: order.id });
      }
    }

    // Construir el pedido enriquecido con claves sin releer la BD.
    const enrichedOrder = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        gameKey: assignedKeys.get(item.id) ?? (item as { gameKey?: string | null }).gameKey ?? null,
      })),
    };
    // Slugs únicos del pedido, solo si esta llamada ganó la transición (para no duplicar alertas).
    const claimedSlugs =
      claim.count > 0 ? Array.from(new Set(order.items.map((item) => item.gameSlug))) : [];
    return { order: enrichedOrder, hasMissingKey, claimedSlugs };
  });

  const { order: paidOrder, hasMissingKey: txHasMissingKey, claimedSlugs } = txResult;

  await clearUserCartItems(input.userId);

  // Alerta de stock bajo de claves al admin (14.6). Best-effort: nunca bloquea el pago.
  // Solo en la llamada que ganó el claim (claimedSlugs no vacío) → no duplica con webhooks repetidos.
  if (claimedSlugs.length > 0) {
    try {
      const adminEmail =
        process.env.MASTER_ADMIN_EMAIL ??
        (await prisma.user.findFirst({
          where: { role: "SUPER_ADMIN" },
          select: { email: true },
        }))?.email;
      if (adminEmail) {
        for (const slug of claimedSlugs) {
          const remaining = await prisma.gameKey.count({
            where: { productSlug: slug, assignedOrderId: null },
          });
          if (remaining <= LOW_KEY_STOCK_THRESHOLD) {
            const product = await prisma.product.findUnique({
              where: { slug },
              select: { name: true },
            });
            await sendLowKeyStockAlert({
              to: adminEmail,
              productName: product?.name ?? slug,
              productSlug: slug,
              remaining,
            });
          }
        }
      }
    } catch (error) {
      logger.error("No se pudo enviar la alerta de stock bajo de claves.", { err: error });
    }
  }

  // Claim atómico del email: solo gana quien pasa confirmationEmailSentAt de null
  // a una fecha. Evita correos duplicados ante webhooks concurrentes.
  const emailClaim = await prisma.order.updateMany({
    where: { id: paidOrder.id, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: new Date() },
  });

  if (emailClaim.count === 0) {
    return { order: paidOrder, emailSent: true };
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
      baseUrl,
      currency: paidOrder.currency,
      totalAmount: paidOrder.totalAmount,
      items: paidOrder.items.map((item) => ({
        title: item.title,
        slug: item.gameSlug,
        gameKey: item.gameKey ?? null,
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

  return { order: paidOrder, emailSent, hasMissingKey: txHasMissingKey };
}

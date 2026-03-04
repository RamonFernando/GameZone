import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-auth";
import { getSessionCookieOptions } from "@/lib/auth/session";
import { completePaidOrder } from "@/lib/checkout/order-service";
import { capturePaypalOrder, getPaypalAccessToken } from "@/lib/payments/paypal";

type FinalizePaypalPayload = {
  paypalOrderId?: string;
};

export async function POST(request: Request) {
  const authResult = await requirePermission(request, PERMISSIONS.CHECKOUT_CREATE);
  if (!authResult.ok) {
    return authResult.response;
  }

  let payload: FinalizePaypalPayload;
  try {
    payload = (await request.json()) as FinalizePaypalPayload;
  } catch {
    return NextResponse.json(
      { message: "Solicitud inválida.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const paypalOrderId = String(payload.paypalOrderId ?? "").trim();
  if (!paypalOrderId) {
    return NextResponse.json(
      { message: "Falta paypalOrderId.", code: "MISSING_PAYPAL_ORDER_ID" },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getPaypalAccessToken();
    const captured = await capturePaypalOrder({ accessToken, paypalOrderId });

    if (captured.status !== "COMPLETED") {
      return NextResponse.json(
        { message: "PayPal no reporta la orden como completada.", code: "PAYMENT_NOT_COMPLETED" },
        { status: 409 }
      );
    }

    const purchaseUnit = captured.purchase_units?.[0];
    const orderId = String(purchaseUnit?.custom_id ?? "").trim();
    if (!orderId) {
      return NextResponse.json(
        { message: "No se encontró orderId interno en PayPal.", code: "MISSING_ORDER_REFERENCE" },
        { status: 400 }
      );
    }

    const captureId = purchaseUnit?.payments?.captures?.[0]?.id ?? captured.id;
    const result = await completePaidOrder({
      orderId,
      userId: authResult.auth.userId,
      paymentProvider: "paypal",
      paymentReference: String(captureId),
      requestUrl: request.url,
      fallbackEmail: authResult.auth.email,
      fallbackUsername: authResult.auth.email.split("@")[0] || "gamer",
    });

    const response = NextResponse.json(
      {
        message: "Pago confirmado con PayPal.",
        order: {
          id: result.order.id,
          totalAmount: result.order.totalAmount,
          currency: result.order.currency,
          createdAt: result.order.createdAt,
          items: result.order.items,
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
  } catch {
    return NextResponse.json(
      { message: "Error confirmando pago con PayPal.", code: "PAYPAL_FINALIZE_ERROR" },
      { status: 502 }
    );
  }
}

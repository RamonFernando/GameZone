"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import "../../styles/auth.scss";

type PaymentMethod = "stripe" | "paypal" | "manual";

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.game.priceFinal * item.quantity, 0),
    [items]
  );

  const handleCheckout = async () => {
    if (items.length === 0) {
      setErrorMessage("Tu carrito está vacío.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSubmitting(true);

      const endpointByMethod: Record<PaymentMethod, string> = {
        stripe: "/api/payments/stripe/create-session",
        paypal: "/api/payments/paypal/create-order",
        manual: "/api/checkout",
      };

      const response = await fetch(endpointByMethod[paymentMethod], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            slug: item.slug,
            quantity: item.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        order?: { id?: string };
        checkoutUrl?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo completar la compra.");
        return;
      }

      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      setSuccessMessage(payload.message ?? "Compra completada.");
      const orderId = payload.order?.id;
      router.push(orderId ? `/account?order=${orderId}` : "/account");
    } catch {
      setErrorMessage("Error de red al procesar el checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <header className="auth-header">
              <p className="auth-kicker">GameZone Checkout</p>
              <h1 className="auth-title">Finalizar compra</h1>
              <p className="auth-subtitle">
                Revisa tu pedido y confirma el pago seguro de tu biblioteca digital.
              </p>
            </header>

            <div className="auth-form">
              {items.length === 0 ? (
                <p className="auth-alt">
                  No hay juegos en el carrito.{" "}
                  <Link href="/" className="auth-link">
                    Volver al catálogo
                  </Link>
                </p>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={item.slug} className="auth-field">
                      <span className="auth-label">{item.game.name}</span>
                      <span className="auth-alt">
                        {item.quantity} x{" "}
                        {item.game.priceFinal.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </div>
                  ))}

                  <p className="auth-alt">
                    Total:{" "}
                    <strong>
                      {totalAmount.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </strong>
                  </p>
                </>
              )}

              <button
                type="button"
                className="button-primary auth-submit btn-padding-site"
                onClick={handleCheckout}
                disabled={isSubmitting || items.length === 0}
              >
                {isSubmitting
                  ? "Procesando..."
                  : paymentMethod === "paypal"
                    ? "Pagar con PayPal"
                    : paymentMethod === "stripe"
                      ? "Pagar con tarjeta / Google Pay"
                      : "Confirmar compra"}
              </button>

              <div className="auth-field">
                <span className="auth-label">Método de pago</span>
                <select
                  className="auth-input"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  disabled={isSubmitting}
                >
                  <option value="stripe">Visa / Mastercard / Google Pay</option>
                  <option value="paypal">PayPal</option>
                  <option value="manual">Modo local (sin pasarela)</option>
                </select>
                <span className="auth-alt">
                  Soporta Visa, Mastercard y wallets desde Stripe Checkout, o PayPal.
                </span>
              </div>

              {errorMessage ? (
                <p className="auth-alt" role="alert" aria-live="assertive">
                  {errorMessage}
                </p>
              ) : null}

              {successMessage ? (
                <p className="auth-alt" role="status" aria-live="polite">
                  {successMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="auth-media-panel">
            <div className="auth-media-inner">
              <div className="auth-media-gradient" />
              <div className="auth-media-brand">
                <span className="auth-media-tag">SECURE PAYMENT</span>
                <span className="auth-media-text">
                  Tu compra se valida en servidor y se guarda en tu historial de pedidos.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

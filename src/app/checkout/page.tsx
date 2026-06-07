"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatMoneyWithGeo } from "@/lib/geo-format";
import "../../styles/auth.scss";

type PaymentMethod = "stripe" | "paypal" | "manual";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [lang, setLang] = useState<"es" | "en">("es");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieMap = new Map(
      document.cookie.split(";").map((entry) => {
        const [key, ...rest] = entry.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")] as const;
      })
    );
    const locale = cookieMap.get("uiLocale") ?? cookieMap.get("geoLocale") ?? "es-ES";
    setLang(locale.toLowerCase().startsWith("en") ? "en" : "es");
  }, []);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.game.priceFinal * item.quantity, 0),
    [items]
  );

  const showLoginRequiredPrompt = () => {
    const message =
      lang === "en"
        ? "You need to log in or create an account before you can buy games."
        : "Necesitas iniciar sesión o crear una cuenta para poder comprar juegos.";

    setRequiresLogin(true);
    setShowLoginPrompt(true);
    setErrorMessage(message);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      setErrorMessage(
        lang === "en" ? "Your cart is empty." : "Tu carrito está vacío."
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setRequiresLogin(false);
    setShowLoginPrompt(false);

    try {
      setIsSubmitting(true);

      const cartScopeResponse = await fetch("/api/cart/scope", { cache: "no-store" });
      const cartScope = cartScopeResponse.ok
        ? ((await cartScopeResponse.json()) as { authenticated?: boolean })
        : null;

      if (!cartScope?.authenticated) {
        showLoginRequiredPrompt();
        return;
      }

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
        code?: string;
        order?: { id?: string };
        checkoutUrl?: string;
      };

      if (!response.ok) {
        if (response.status === 401 || payload.code === "UNAUTHORIZED") {
          showLoginRequiredPrompt();
          return;
        }

        setErrorMessage(
          payload.message ??
            (lang === "en" ? "We couldn't complete your purchase." : "No se pudo completar la compra.")
        );
        return;
      }

      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      setSuccessMessage(
        payload.message ??
          (lang === "en" ? "Purchase completed." : "Compra completada.")
      );
      const orderId = payload.order?.id;
      clearCart();
      router.push(orderId ? `/account?order=${orderId}` : "/account");
    } catch {
      setErrorMessage(
        lang === "en"
          ? "Network error while processing checkout."
          : "Error de red al procesar el checkout."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell">
      {showLoginPrompt ? (
        <div className="checkout-login-backdrop" role="presentation">
          <div
            className="checkout-login-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="checkout-login-title"
            aria-describedby="checkout-login-description"
          >
            <button
              type="button"
              className="checkout-login-close"
              aria-label={lang === "en" ? "Close" : "Cerrar"}
              onClick={() => setShowLoginPrompt(false)}
            >
              x
            </button>
            <p className="auth-kicker">GameZone Checkout</p>
            <h2 id="checkout-login-title" className="checkout-login-title">
              {lang === "en" ? "Account required" : "Cuenta necesaria"}
            </h2>
            <p id="checkout-login-description" className="checkout-login-text">
              {lang === "en"
                ? "To protect your purchase and save the order history, log in or create an account before paying."
                : "Para proteger tu compra y guardar el historial del pedido, inicia sesión o crea una cuenta antes de pagar."}
            </p>
            <div className="checkout-login-actions">
              <Link href="/auth?next=/checkout" className="button-primary btn-padding-site">
                {lang === "en" ? "Log in" : "Iniciar sesión"}
              </Link>
              <Link href="/auth/register" className="button-ghost btn-padding-site">
                {lang === "en" ? "Create account" : "Crear cuenta"}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <div className="card card-hover auth-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <header className="auth-header">
              <p className="auth-kicker">GameZone Checkout</p>
              <h1 className="auth-title">
                {lang === "en" ? "Checkout" : "Finalizar compra"}
              </h1>
              <p className="auth-subtitle">
                {lang === "en"
                  ? "Review your order and confirm the secure payment of your digital library."
                  : "Revisa tu pedido y confirma el pago seguro de tu biblioteca digital."}
              </p>
            </header>

            <div className="auth-form">
              {items.length === 0 ? (
                <p className="auth-alt">
                  {lang === "en"
                    ? "There are no games in your cart. "
                    : "No hay juegos en el carrito. "}
                  <Link href="/" className="auth-link">
                    {lang === "en" ? "Back to catalog" : "Volver al catálogo"}
                  </Link>
                </p>
              ) : (
                <>
                  {items.map((item) => (
                    <div key={item.slug} className="auth-field">
                      <span className="auth-label">{item.game.name}</span>
                      <span className="auth-alt">
                        {item.quantity} x {formatMoneyWithGeo(item.game.priceFinal)}
                      </span>
                    </div>
                  ))}

                  <p className="auth-alt">
                    {lang === "en" ? "Total:" : "Total:"}{" "}
                    <strong>{formatMoneyWithGeo(totalAmount)}</strong>
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
                  ? lang === "en"
                    ? "Processing..."
                    : "Procesando..."
                  : paymentMethod === "paypal"
                    ? lang === "en"
                      ? "Pay with PayPal"
                      : "Pagar con PayPal"
                    : paymentMethod === "stripe"
                      ? lang === "en"
                        ? "Pay with card / Google Pay"
                        : "Pagar con tarjeta / Google Pay"
                      : lang === "en"
                        ? "Confirm purchase"
                        : "Confirmar compra"}
              </button>

              <div className="auth-field">
                <span className="auth-label">
                  {lang === "en" ? "Payment method" : "Método de pago"}
                </span>
                <select
                  className="auth-input"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  disabled={isSubmitting}
                >
                  <option value="stripe">
                    {lang === "en" ? "Visa / Mastercard / Google Pay" : "Visa / Mastercard / Google Pay"}
                  </option>
                  <option value="paypal">PayPal</option>
                  <option value="manual">
                    {lang === "en" ? "Local mode (no gateway)" : "Modo local (sin pasarela)"}
                  </option>
                </select>
                <span className="auth-alt">
                  {lang === "en"
                    ? "Supports Visa, Mastercard and wallets through Stripe Checkout, or PayPal."
                    : "Soporta Visa, Mastercard y wallets desde Stripe Checkout, o PayPal."}
                </span>
              </div>

              {errorMessage ? (
                <div className="auth-alt" role="alert" aria-live="assertive">
                  <span>{errorMessage}</span>
                  {requiresLogin ? (
                    <>
                      {" "}
                      <Link href="/auth?next=/checkout" className="auth-link">
                        {lang === "en" ? "Log in" : "Iniciar sesión"}
                      </Link>
                      {" · "}
                      <Link href="/auth/register" className="auth-link">
                        {lang === "en" ? "Create account" : "Crear cuenta"}
                      </Link>
                    </>
                  ) : null}
                </div>
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
                <span className="auth-media-tag">
                  {lang === "en" ? "SECURE PAYMENT" : "PAGO SEGURO"}
                </span>
                <span className="auth-media-text">
                  {lang === "en"
                    ? "Your purchase is validated on the server and stored in your order history."
                    : "Tu compra se valida en servidor y se guarda en tu historial de pedidos."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import {
  createPaymentProgressStorageKey,
  PAYMENT_PROGRESS_STEP_DELAY_MS,
} from "@/lib/checkout/payment-progress";
import "../../../styles/auth.scss";

type FinalizationState = "loading" | "success" | "error";
type StripeStatus = "processing" | "paid" | "failed" | "error";
type ValidationStep = "returned" | "checking" | "paymentConfirmed" | "orderSaved" | "cartCleared" | "complete";

const MAX_STATUS_POLLS = 30;
const POLL_INTERVAL_MS = 1500;
const REQUEST_TIMEOUT_MS = 8000;
const TOTAL_VALIDATION_TIMEOUT_MS = 70000;

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <section className="auth-shell">
          <p className="auth-alt">Cargando confirmación de pago...</p>
        </section>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [state, setState] = useState<FinalizationState>("loading");
  const [message, setMessage] = useState("Validando pago...");
  const [orderId, setOrderId] = useState("");
  const [validationStep, setValidationStep] = useState<ValidationStep>("returned");
  const [validationAttempt, setValidationAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    setValidationAttempt(0);
    setValidationStep("returned");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const finish = (nextState: FinalizationState, nextMessage: string, nextOrderId = "") => {
      if (cancelled || settled) {
        return;
      }
      settled = true;
      if (nextState === "success") {
        clearCart();
      }
      if (nextOrderId) {
        setOrderId(nextOrderId);
      }
      setState(nextState);
      setMessage(nextMessage);
    };

    const playSuccessSequence = async (successMessage: string, nextOrderId = "") => {
      if (cancelled || settled) return;
      settled = true;
      clearTimeout(overallTimeoutId);

      if (nextOrderId) {
        setOrderId(nextOrderId);
        window.sessionStorage.setItem(
          createPaymentProgressStorageKey(nextOrderId),
          String(Date.now())
        );
      }

      setValidationStep("paymentConfirmed");
      setMessage("Pago confirmado. Estamos guardando tu pedido...");
      await sleep(PAYMENT_PROGRESS_STEP_DELAY_MS);
      if (cancelled) return;

      setValidationStep("orderSaved");
      setMessage("Pedido guardado en tu cuenta. Estamos limpiando el carrito...");
      await sleep(PAYMENT_PROGRESS_STEP_DELAY_MS);
      if (cancelled) return;

      setValidationStep("cartCleared");
      setMessage("Carrito limpiado. Tu compra está lista.");
      clearCart();
      await sleep(PAYMENT_PROGRESS_STEP_DELAY_MS);
      if (cancelled) return;

      setState("success");
      setMessage(successMessage);
    };

    const fetchJsonWithTimeout = async (input: string, init?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          message?: string;
          status?: StripeStatus;
          order?: { id?: string };
        };
        return { response, payload };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const overallTimeoutId = setTimeout(() => {
      finish(
        "error",
        "La validación está tardando demasiado. Puedes ir a Mi cuenta y refrescar pedidos."
      );
    }, TOTAL_VALIDATION_TIMEOUT_MS);

    const finalizePayment = async () => {
      const provider = searchParams.get("provider");
      const sessionId = searchParams.get("session_id");
      const paypalToken = searchParams.get("token");

      try {
        if (provider === "stripe" && sessionId) {
          setValidationStep("checking");
          setMessage("Comprobando confirmación segura de Stripe...");

          for (let attempt = 1; attempt <= MAX_STATUS_POLLS; attempt += 1) {
            setValidationAttempt(attempt);
            const { response, payload } = await fetchJsonWithTimeout(
              `/api/payments/stripe/status?session_id=${encodeURIComponent(sessionId)}`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

            if (!response.ok) {
              finish("error", payload.message ?? "No se pudo validar el pago con Stripe.");
              return;
            }

            if (payload.status === "paid") {
              await playSuccessSequence(
                payload.message ?? "Pago con Stripe confirmado.",
                payload.order?.id ?? ""
              );
              return;
            }

            if (payload.status === "failed" || payload.status === "error") {
              finish("error", payload.message ?? "El pago con Stripe no se completó.");
              return;
            }

            if (!cancelled && !settled) {
              setMessage(
                payload.message ??
                  `Pago recibido. Stripe sigue confirmando la transacción (${attempt}/${MAX_STATUS_POLLS})...`
              );
            }

            if (attempt < MAX_STATUS_POLLS) {
              await sleep(POLL_INTERVAL_MS);
            }
          }

          finish(
            "error",
            "El pago se está procesando, pero aún no se pudo confirmar. Revisa tu cuenta en unos segundos."
          );
          return;
        }

        if (provider === "paypal" && paypalToken) {
          setValidationStep("checking");
          setMessage("Confirmando pago con PayPal...");
          const { response, payload } = await fetchJsonWithTimeout("/api/payments/paypal/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: paypalToken }),
          });

          if (!response.ok) {
            finish("error", payload.message ?? "No se pudo confirmar el pago con PayPal.");
            return;
          }

          await playSuccessSequence(
            payload.message ?? "Pago con PayPal confirmado.",
            payload.order?.id ?? ""
          );
          return;
        }

        finish("error", "No se recibieron datos válidos de la pasarela.");
      } catch {
        finish("error", "Error de red confirmando la compra.");
      } finally {
        clearTimeout(overallTimeoutId);
      }
    };

    void finalizePayment();

    return () => {
      cancelled = true;
      clearTimeout(overallTimeoutId);
    };
  }, [clearCart, searchParams]);

  const completedSteps = {
    checking: ["paymentConfirmed", "orderSaved", "cartCleared", "complete"].includes(validationStep),
    paymentConfirmed: ["paymentConfirmed", "orderSaved", "cartCleared", "complete"].includes(validationStep),
    orderSaved: ["orderSaved", "cartCleared", "complete"].includes(validationStep),
    cartCleared: ["cartCleared", "complete"].includes(validationStep),
  };

  const progressClass = (isDone: boolean, isActive: boolean) =>
    "checkout-progress-item" +
    (isDone ? " checkout-progress-item--done" : "") +
    (isActive ? " checkout-progress-item--active" : "");

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <header className="auth-header">
              <p className="auth-kicker">Checkout</p>
              <h1 className="auth-title">Resultado del pago</h1>
              <p className="auth-subtitle">{message}</p>
            </header>

            {state === "loading" ? (
              <>
                <div className="checkout-status-panel" role="status" aria-live="polite">
                  <div className="checkout-status-spinner" aria-hidden="true" />
                  <div className="checkout-status-copy">
                    <p className="checkout-status-title">Estamos confirmando tu compra</p>
                    <p className="auth-alt">
                      No cierres esta ventana. El carrito se limpiará cuando la pasarela confirme el pago.
                    </p>
                  </div>
                </div>

                <ol className="checkout-progress-list" aria-label="Estado de la compra">
                  <li className="checkout-progress-item checkout-progress-item--done">
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Pago recibido desde la pasarela</span>
                  </li>
                  <li
                    className={progressClass(
                      completedSteps.checking,
                      validationStep === "checking"
                    )}
                  >
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>
                      Validando confirmación segura
                      {validationAttempt > 0 ? ` (${validationAttempt}/${MAX_STATUS_POLLS})` : ""}
                    </span>
                  </li>
                  <li
                    className={progressClass(
                      completedSteps.paymentConfirmed,
                      validationStep === "paymentConfirmed"
                    )}
                  >
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Pago confirmado</span>
                  </li>
                  <li
                    className={progressClass(
                      completedSteps.orderSaved,
                      validationStep === "orderSaved"
                    )}
                  >
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Pedido guardado en tu cuenta</span>
                  </li>
                  <li
                    className={progressClass(
                      completedSteps.cartCleared,
                      validationStep === "cartCleared"
                    )}
                  >
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Carrito limpiado</span>
                  </li>
                </ol>

                <button
                  type="button"
                  className="button-primary auth-submit checkout-account-button btn-padding-site"
                  onClick={() => router.push("/account?tab=payment")}
                >
                  Ir a mi cuenta mientras valida
                </button>
              </>
            ) : null}

            {state === "success" ? (
              <>
                <ol className="checkout-progress-list checkout-progress-list--complete" aria-label="Compra confirmada">
                  <li className="checkout-progress-item checkout-progress-item--done">
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Pago confirmado</span>
                  </li>
                  <li className="checkout-progress-item checkout-progress-item--done">
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Pedido guardado en tu cuenta</span>
                  </li>
                  <li className="checkout-progress-item checkout-progress-item--done">
                    <span className="checkout-progress-marker" aria-hidden="true" />
                    <span>Carrito limpiado</span>
                  </li>
                </ol>
                <p className="auth-alt">Tu compra fue validada y el pedido quedó registrado.</p>
                <button
                  type="button"
                  className="button-primary auth-submit btn-padding-site"
                  onClick={() =>
                    router.push(orderId ? `/account?order=${orderId}` : "/account")
                  }
                >
                  Ir a mi cuenta
                </button>
              </>
            ) : null}

            {state === "error" ? (
              <>
                <p className="auth-alt" role="alert">
                  No se pudo cerrar la compra automáticamente.
                </p>
                <Link href="/checkout" className="button-primary auth-submit btn-padding-site">
                  Volver al checkout
                </Link>
              </>
            ) : null}
          </div>

          <div className="auth-media-panel">
            <div className="auth-media-inner">
              <div className="auth-media-gradient" />
              <div className="auth-media-brand">
                <span className="auth-media-tag">PAYMENT VERIFIED</span>
                <span className="auth-media-text">
                  Confirmamos con la pasarela en servidor antes de marcar el pedido como pagado.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

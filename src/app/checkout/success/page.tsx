"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import "../../../styles/auth.scss";

type FinalizationState = "loading" | "success" | "error";
type StripeStatus = "processing" | "paid" | "failed";

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
  const hasFinalizedRef = useRef(false);
  const { clearCart } = useCart();
  const [state, setState] = useState<FinalizationState>("loading");
  const [message, setMessage] = useState("Validando pago...");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    if (hasFinalizedRef.current) {
      return;
    }
    hasFinalizedRef.current = true;

    let cancelled = false;
    let settled = false;

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
          setMessage("Comprobando confirmación segura de Stripe...");

          for (let attempt = 1; attempt <= MAX_STATUS_POLLS; attempt += 1) {
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
              finish(
                "success",
                payload.message ?? "Pago con Stripe confirmado.",
                payload.order?.id ?? ""
              );
              return;
            }

            if (payload.status === "failed") {
              finish("error", payload.message ?? "El pago con Stripe no se completó.");
              return;
            }

            if (!cancelled && !settled) {
              setMessage(payload.message ?? "Esperando confirmación del pago...");
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
          const { response, payload } = await fetchJsonWithTimeout("/api/payments/paypal/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: paypalToken }),
          });

          if (!response.ok) {
            finish("error", payload.message ?? "No se pudo confirmar el pago con PayPal.");
            return;
          }

          finish(
            "success",
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
                <p className="auth-alt">Un momento, estamos validando la transacción...</p>
                <button
                  type="button"
                  className="button-primary auth-submit btn-padding-site"
                  onClick={() => router.push("/account")}
                >
                  Ir a mi cuenta mientras valida
                </button>
              </>
            ) : null}

            {state === "success" ? (
              <>
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

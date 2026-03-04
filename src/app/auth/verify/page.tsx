"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import "../../../styles/auth.scss";

type VerificationState = {
  status: "loading" | "success" | "error";
  message: string;
};

export default function VerifyAccountPage() {
  return (
    <Suspense fallback={<section className="auth-shell"><p className="auth-alt">Validando enlace...</p></section>}>
      <VerifyAccountContent />
    </Suspense>
  );
}

function VerifyAccountContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, setState] = useState<VerificationState>({
    status: "loading",
    message: "Verificando tu cuenta...",
  });

  useEffect(() => {
    if (!token) {
      setState({
        status: "error",
        message: "Falta el token de verificación en el enlace.",
      });
      return;
    }

    let cancelled = false;

    const runVerification = async () => {
      try {
        const response = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`);
        const payload = (await response.json()) as { message?: string };

        if (cancelled) {
          return;
        }

        if (response.ok) {
          setState({
            status: "success",
            message: payload.message ?? "Cuenta verificada correctamente.",
          });
          return;
        }

        setState({
          status: "error",
          message: payload.message ?? "No se pudo verificar tu cuenta.",
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Error de red al verificar la cuenta. Inténtalo de nuevo.",
          });
        }
      }
    };

    void runVerification();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <header className="auth-header">
              <p className="auth-kicker">GameZone Access</p>
              <h1 className="auth-title">Verificación de cuenta</h1>
              <p className="auth-subtitle">{state.message}</p>
            </header>

            <div className="auth-form">
              <Link
                href={state.status === "success" ? "/auth?verified=1" : "/auth"}
                className="button-primary auth-submit btn-padding-site"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </div>

          <div className="auth-media-panel">
            <div className="auth-media-inner">
              <div className="auth-media-gradient" />
              <div className="auth-media-brand">
                <span className="auth-media-tag">
                  {state.status === "success" ? "ACCOUNT VERIFIED" : "VERIFY EMAIL"}
                </span>
                <span className="auth-media-text">
                  {state.status === "success"
                    ? "Tu perfil está listo. Inicia sesión y empieza a jugar."
                    : "Tu seguridad es prioridad: confirma tu correo para activar la cuenta."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

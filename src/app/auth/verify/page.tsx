"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/layout/AuthShell";
import { AuthCard } from "@/components/auth/layout/AuthCard";
import { AuthFormPanel } from "@/components/auth/layout/AuthFormPanel";
import { AuthMediaPanel } from "@/components/auth/layout/AuthMediaPanel";
import "../../../styles/auth.scss";

type VerificationState = {
  status: "loading" | "success" | "error";
  message: string;
};

export default function VerifyAccountPage() {
  return (
    <Suspense fallback={<AuthShell><p className="auth-alt">Validando enlace...</p></AuthShell>}>
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
    <AuthShell>
      <AuthCard withGrid>
          <AuthFormPanel>
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
          </AuthFormPanel>

          <AuthMediaPanel
            tag={state.status === "success" ? "ACCOUNT VERIFIED" : "VERIFY EMAIL"}
            text={state.status === "success"
              ? "Tu perfil está listo. Inicia sesión y empieza a jugar."
              : "Tu seguridad es prioridad: confirma tu correo para activar la cuenta."}
          />
      </AuthCard>
    </AuthShell>
  );
}

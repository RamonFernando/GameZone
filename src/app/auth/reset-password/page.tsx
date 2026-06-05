"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "../../../styles/auth.scss";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<section className="auth-shell"><p className="auth-alt">Cargando...</p></section>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo cambiar la contraseña.");
        return;
      }

      setMessage(payload.message ?? "Contraseña actualizada.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage("Error de red. Inténtalo de nuevo en unos segundos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell auth-shell--center">
      <div className="card card-hover auth-card auth-card--single">
        <div className="auth-form-panel">
          <header className="auth-header">
            <p className="auth-kicker">GameZone Access</p>
            <h1 className="auth-title">Nueva contraseña</h1>
            <p className="auth-subtitle">
              Crea una contraseña nueva para recuperar el acceso a tu cuenta.
            </p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!token ? (
              <p className="auth-alt" role="alert">
                El enlace no incluye token de recuperación. Solicita uno nuevo.
              </p>
            ) : null}

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                className="auth-input"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="auth-input"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="button-primary auth-submit btn-padding-site"
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? "Guardando..." : "Guardar contraseña"}
            </button>

            {errorMessage ? (
              <p className="auth-alt" role="alert" aria-live="assertive">
                {errorMessage}
              </p>
            ) : null}

            {message ? (
              <p className="auth-alt" role="status" aria-live="polite">
                {message}{" "}
                <Link href="/auth" className="auth-link">
                  Ir al login
                </Link>
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

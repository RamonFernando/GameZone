"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import "../../../styles/auth.scss";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setResetUrl("");

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { message?: string; resetUrl?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo enviar el enlace.");
        return;
      }

      setMessage(payload.message ?? "Revisa tu correo para continuar.");
      if (payload.resetUrl) {
        setResetUrl(payload.resetUrl);
      }
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
            <h1 className="auth-title">Recuperar contraseña</h1>
            <p className="auth-subtitle">
              Introduce el email de tu cuenta y te enviaremos un enlace para crear una contraseña nueva.
            </p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="auth-input"
                placeholder="tucorreo@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="button-primary auth-submit btn-padding-site"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace"}
            </button>

            {errorMessage ? (
              <p className="auth-alt" role="alert" aria-live="assertive">
                {errorMessage}
              </p>
            ) : null}

            {message ? (
              <p className="auth-alt" role="status" aria-live="polite">
                {message}
              </p>
            ) : null}

            {resetUrl ? (
              <p className="auth-alt">
                Enlace local:{" "}
                <Link href={resetUrl} className="auth-link">
                  abrir recuperación
                </Link>
              </p>
            ) : null}

            <p className="auth-alt">
              <Link href="/auth" className="auth-link">
                Volver al login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

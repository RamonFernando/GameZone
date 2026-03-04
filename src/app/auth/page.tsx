"use client";

import { Suspense, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import "../../styles/auth.scss";



// Página de acceso principal: GameZone Access
export default function LoginPage() {
  return (
    <Suspense fallback={<section className="auth-shell"><p className="auth-alt">Cargando login...</p></section>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldVerifyEmail = searchParams.get("verifyEmail") === "1";
  const wasVerified = searchParams.get("verified") === "1";
  const nextUrl = searchParams.get("next");
  const oauthError = searchParams.get("oauthError");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResendEmail, setCanResendEmail] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setCanResendEmail(false);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setLoginIdentifier(identifier);

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const payload = (await response.json()) as { message?: string; code?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo iniciar sesión.");
        if (payload.code === "EMAIL_NOT_VERIFIED") {
          setCanResendEmail(true);
        }
        return;
      }

      setSuccessMessage(payload.message ?? "Inicio de sesión correcto.");
      const safeNextUrl = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/account";
      router.push(safeNextUrl);
      router.refresh();
    } catch {
      setErrorMessage("Error de red. Inténtalo de nuevo en unos segundos.");
    } finally {
      setIsSubmitting(false);
    }
};

const handleResendVerification = async () => {
    if (!loginIdentifier) {
      setErrorMessage("Ingresa tu email para reenviar la verificación.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsResending(true);
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: loginIdentifier }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo reenviar la verificación.");
        return;
      }

      setSuccessMessage(payload.message ?? "Correo de verificación reenviado.");
    } catch {
      setErrorMessage("Error de red al reenviar la verificación.");
    } finally {
      setIsResending(false);
    }
};

const handleOAuthStart = (provider: "google" | "facebook" | "twitter") => {
    const oauthUrl = new URL(`/api/auth/oauth/${provider}/start`, window.location.origin);
    if (nextUrl && nextUrl.startsWith("/")) {
      oauthUrl.searchParams.set("next", nextUrl);
    }
    window.location.href = oauthUrl.toString();
};

const oauthErrorMessage =
    oauthError === "config"
      ? "OAuth no configurado correctamente. Revisa variables de entorno."
      : oauthError === "state"
        ? "No se pudo validar la sesión OAuth. Inténtalo de nuevo."
        : oauthError === "provider_failed"
          ? "El proveedor social rechazó el acceso o no devolvió email."
          : oauthError === "provider"
            ? "Proveedor social no soportado."
            : oauthError === "missing_code"
              ? "Respuesta OAuth inválida."
              : "";

return (
    // ============================
    // SECCIÓN GENERAL DE LA PÁGINA DE LOGIN
    // ============================
    <section className="auth-shell">
        {/* ============================
            CARD PRINCIPAL (usa estilos .card del proyecto)
            ============================ */}
        <div className="card card-hover auth-card">
            <div className="auth-grid">
                {/* ============================
                    COLUMNA IZQUIERDA: FORMULARIO DE ACCESO
                    ============================ */}
                <div className="auth-form-panel">
                    {/* Encabezado del login */}
                    <header className="auth-header">
                        <p className="auth-kicker">GameZone Access</p>
                        <h1 className="auth-title">Inicia sesión</h1>
                        <p className="auth-subtitle">
                        Accede a tu cuenta para seguir ampliando tu biblioteca gaming
                        dentro de la Next Gaming Store.
                        </p>
                    </header>

                    {/* Formulario de login */}
                    <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Campo: nombre de usuario */}
                        <div className="auth-field">
                            <label htmlFor="name" className="auth-label">
                                Nombre de usuario
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="username"
                                className="auth-input"
                                placeholder="Tu nick gamer (opcional)"
                            />
                        </div>

                        {/* Campo: identificador (email o usuario) */}
                        <div className="auth-field">
                            <label htmlFor="identifier" className="auth-label">
                                Email o usuario
                            </label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                autoComplete="username"
                                className="auth-input"
                                placeholder="admin o tucorreo@ejemplo.com"
                                value={loginIdentifier}
                                onChange={(event) => setLoginIdentifier(event.target.value)}
                                required
                            />
                        </div>

                        {/* Campo: contraseña + enlace de recuperación */}
                        <div className="auth-field">
                            <label htmlFor="password" className="auth-label">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                className="auth-input"
                                placeholder="••••••••"
                                required
                            />
                            <div className="auth-field-helper">
                                <Link href="#" className="auth-link">
                                    ¿Olvidaste la contraseña?
                                </Link>
                            </div>
                    </div> {/* Fin campo contraseña */}

                    {/* Botón principal de acceso */}
                    <button
                      type="submit"
                      className="button-primary auth-submit btn-padding-site"
                      disabled={isSubmitting}
                    >
                        {isSubmitting ? "Entrando..." : "Entrar"}
                    </button>

                    {errorMessage ? (
                        <p className="auth-alt" role="alert" aria-live="assertive">
                            {errorMessage}
                        </p>
                    ) : null}

                    {oauthErrorMessage ? (
                      <p className="auth-alt" role="alert" aria-live="assertive">
                        {oauthErrorMessage}
                      </p>
                    ) : null}

                    {successMessage ? (
                        <p className="auth-alt" role="status" aria-live="polite">
                            {successMessage}
                        </p>
                    ) : null}

                    {canResendEmail ? (
                      <button
                        type="button"
                        className="auth-social-button"
                        onClick={handleResendVerification}
                        disabled={isResending}
                      >
                        {isResending ? "Reenviando..." : "Reenviar email de verificación"}
                      </button>
                    ) : null}

                    {/* Enlace alternativo para registro */}
                    <p className="auth-alt">
                        ¿Aún no tienes cuenta?{" "}
                        <Link href="/auth/register" className="auth-link">
                            Crear cuenta
                        </Link>
                    </p>

                    {shouldVerifyEmail ? (
                        <p className="auth-alt" role="status" aria-live="polite">
                            Cuenta creada. Revisa tu correo y verifica tu email antes de iniciar sesión.
                        </p>
                    ) : null}

                    {wasVerified ? (
                        <p className="auth-alt" role="status" aria-live="polite">
                            Cuenta verificada correctamente. Ahora ya puedes iniciar sesión.
                        </p>
                    ) : null}

                    {/* Separador visual "o continúa con" */}
                    <div className="auth-divider">
                        <span className="auth-divider-line" />
                        <span className="auth-divider-text">o continúa con</span>
                        <span className="auth-divider-line" />
                    </div>

                    {/* Botones de proveedores sociales */}
                    <div className="auth-social-row">
                        {/* Botón Google (texto simple, sin icono de tu proyecto) */}
                        <button
                          type="button"
                          className="auth-social-button"
                          onClick={() => handleOAuthStart("google")}
                        >
                            <span className="auth-social-icon">G</span>
                            <span>Google</span>
                        </button>

                        {/* Botón Facebook (usa iconos existentes del proyecto) */}
                        <button
                          type="button"
                          className="auth-social-button"
                          onClick={() => handleOAuthStart("facebook")}
                        >
                            <Image
                                src="/iconos_platforms/facebook5.svg"
                                alt="Facebook"
                                width={16}
                                height={16}
                                className="auth-social-icon-img"
                            />
                            <span>Facebook</span>
                        </button>

                        <button
                          type="button"
                          className="auth-social-button"
                          onClick={() => handleOAuthStart("twitter")}
                        >
                          <Image
                            src="/iconos_platforms/twiter.svg"
                            alt="Twitter"
                            width={16}
                            height={16}
                            className="auth-social-icon-img"
                          />
                          <span>Twitter</span>
                        </button>
                    </div>
                    </form> {/* Fin formulario de login */}
                </div> {/* Fin columna izquierda */}

                    {/* ============================
                        COLUMNA DERECHA: IMAGEN / BRANDING
                        ============================ */}
                    <div className="auth-media-panel">
                        <div className="auth-media-inner">
                        {/* Imagen reutilizando recursos del proyecto */}
                        <Image
                            src="/Recursos/sign-wallpaper.jpg"
                            alt="Arte promocional GameZone Access"
                            fill
                            priority
                            className="auth-media-image"
                            sizes="(min-width: 1024px) 480px, 100vw"
                        />

                        {/* Capa de degradado para integrar colores del proyecto */}
                        <div className="auth-media-gradient" />

                        {/* Bloque de texto sobre la imagen */}
                        <div className="auth-media-brand">
                            <span className="auth-media-tag">XP BOOST</span>
                            <span className="auth-media-text">
                            Disfruta de una experiencia premium y mantén tu biblioteca
                            digital sincronizada en todos tus dispositivos.
                            </span>
                        </div>
                    </div> {/* Fin auth-media-inner */}
                </div> {/* Fin auth-media-panel */}
            </div> {/* Fin auth-grid */}
        </div> {/* Fin card principal */}
    </section>
);
}

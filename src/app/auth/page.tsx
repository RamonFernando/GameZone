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
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isPushPending, setIsPushPending] = useState(false);
  const [pushChallengeId, setPushChallengeId] = useState<string | null>(null);
  const [twoFactorMode, setTwoFactorMode] = useState<"email" | "totp" | null>(null);

const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setCanResendEmail(false);
    setIsPushPending(false);
    setPushChallengeId(null);

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

      const payload = (await response.json()) as {
        message?: string;
        code?: string;
        challengeId?: string;
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo iniciar sesión.");
        if (payload.code === "EMAIL_NOT_VERIFIED") {
          setCanResendEmail(true);
        }
        return;
      }

      // Si el backend indica que hace falta 2FA por email, pasamos al segundo paso
      if (payload.code === "TWO_FACTOR_REQUIRED" && payload.challengeId) {
        setIsTwoFactorStep(true);
        setTwoFactorMode("email");
        setTwoFactorChallengeId(payload.challengeId);
        setSuccessMessage(
          payload.message ?? "Hemos enviado un código de verificación a tu email."
        );
        return;
      }

      // Si hace falta 2FA con app (TOTP), también usamos el segundo paso pero contra otro endpoint
      if (payload.code === "TOTP_REQUIRED" && payload.challengeId) {
        setIsTwoFactorStep(true);
        setTwoFactorMode("totp");
        setTwoFactorChallengeId(payload.challengeId);
        setSuccessMessage(
          payload.message ??
            "Abre tu app de autenticación (Google Authenticator, Authy...) e introduce el código de 6 dígitos."
        );
        return;
      }

      // Si el backend indica que hace falta aprobación tipo push, mostramos estado pendiente
      if (payload.code === "PUSH_APPROVAL_REQUIRED" && payload.challengeId) {
        setIsPushPending(true);
        setPushChallengeId(payload.challengeId);
        setSuccessMessage(
          payload.message ??
            "Hemos enviado un email para que apruebes este inicio de sesión desde otro dispositivo."
        );
        return;
      }

      // Flujo normal (sin 2FA)
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

const handleTwoFactorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!twoFactorChallengeId) {
      setErrorMessage("Falta el identificador de sesión. Intenta iniciar sesión de nuevo.");
      return;
    }

    try {
      setIsSubmitting(true);
      const endpoint =
        twoFactorMode === "totp" ? "/api/auth/totp/verify" : "/api/auth/2fa/verify";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeId: twoFactorChallengeId,
          code: twoFactorCode,
        }),
      });

      const payload = (await response.json()) as { message?: string; code?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "Código inválido.");
        return;
      }

      setSuccessMessage(payload.message ?? "Inicio de sesión correcto.");
      const safeNextUrl = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/account";
      router.push(safeNextUrl);
      router.refresh();
    } catch {
      setErrorMessage("Error de red al verificar el código. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckPushStatus = async () => {
    if (!pushChallengeId) {
      setErrorMessage("Falta el identificador de aprobación. Vuelve a iniciar sesión.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/push/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ challengeId: pushChallengeId }),
      });

      const payload = (await response.json()) as { message?: string; code?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo completar el acceso.");
        return;
      }

      if (payload.code === "PUSH_PENDING") {
        setSuccessMessage(
          payload.message ?? "Seguimos esperando a que apruebes el acceso desde el email."
        );
        return;
      }

      // LOGIN_OK
      setIsPushPending(false);
      setSuccessMessage(payload.message ?? "Inicio de sesión correcto.");
      const safeNextUrl = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/account";
      router.push(safeNextUrl);
      router.refresh();
    } catch {
      setErrorMessage("Error de red al comprobar el estado del acceso. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                        <h1 className="auth-title">
                          {isTwoFactorStep
                            ? twoFactorMode === "totp"
                              ? "Verifica con tu app"
                              : "Verifica tu acceso"
                            : isPushPending
                              ? "Confirma desde tu email"
                              : "Inicia sesión"}
                        </h1>
                        <p className="auth-subtitle">
                          {isTwoFactorStep
                            ? twoFactorMode === "totp"
                              ? "Abre tu app de autenticación (Google Authenticator, Authy...) e introduce el código de 6 dígitos para completar el acceso."
                              : "Hemos enviado un código de verificación a tu email. Introduce ese código para completar el acceso."
                            : isPushPending
                              ? "Revisa tu bandeja de entrada y aprueba o rechaza el acceso desde el email que te hemos enviado. Después pulsa en 'Comprobar estado'."
                              : "Accede a tu cuenta para seguir ampliando tu biblioteca gaming dentro de la Next Gaming Store."}
                        </p>
                    </header>

                    {/* Formulario de login (paso 1) */}
                    {!isTwoFactorStep && !isPushPending && (
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
                    </form>
                    )} {/* Fin formulario de login (paso 1) */}

                    {/* Paso alternativo: esperando aprobación tipo push */}
                    {isPushPending && (
                      <div className="auth-form">
                        <p className="auth-alt">
                          Hemos enviado un email con las opciones{" "}
                          <strong>&quot;Sí, soy yo&quot;</strong> y{" "}
                          <strong>&quot;No, no soy yo&quot;</strong>. Ábrelo en tu móvil u otro
                          dispositivo y selecciona la opción correcta.
                        </p>
                        <button
                          type="button"
                          className="button-primary auth-submit btn-padding-site"
                          onClick={handleCheckPushStatus}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Comprobando..." : "Comprobar estado del acceso"}
                        </button>
                        <button
                          type="button"
                          className="auth-link"
                          style={{ marginTop: 8 }}
                          onClick={() => {
                            setIsPushPending(false);
                            setPushChallengeId(null);
                            setSuccessMessage("");
                            setErrorMessage("");
                          }}
                        >
                          Volver a intentar iniciar sesión
                        </button>
                      </div>
                    )}

                    {/* Paso 2: formulario para introducir código 2FA */}
                    {isTwoFactorStep && (
                      <form className="auth-form" onSubmit={handleTwoFactorSubmit}>
                        <div className="auth-field">
                          <label htmlFor="twoFactorCode" className="auth-label">
                            Código de verificación
                          </label>
                          <input
                            id="twoFactorCode"
                            name="twoFactorCode"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            className="auth-input"
                            placeholder="Introduce el código de 6 dígitos"
                            value={twoFactorCode}
                            onChange={(event) => setTwoFactorCode(event.target.value)}
                            required
                          />
                          <div className="auth-field-helper">
                            <span className="auth-alt">
                              {twoFactorMode === "totp"
                                ? "Introduce el código de 6 dígitos que ves ahora mismo en tu app de autenticación."
                                : "Te hemos enviado un código a tu email. Caduca en unos minutos."}
                            </span>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="button-primary auth-submit btn-padding-site"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Verificando..." : "Confirmar código"}
                        </button>

                        <button
                          type="button"
                          className="auth-link"
                          style={{ marginTop: 8 }}
                          onClick={() => {
                            // Volver al primer paso para reintentar login completo
                            setIsTwoFactorStep(false);
                            setTwoFactorCode("");
                            setTwoFactorChallengeId(null);
                            setSuccessMessage("");
                            setErrorMessage("");
                          }}
                        >
                          Volver a introducir usuario y contraseña
                        </button>
                      </form>
                    )}
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

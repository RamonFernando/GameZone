"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../../../styles/auth.scss";

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const acceptTerms = formData.get("acceptTerms") === "on";

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden. Verifica e inténtalo de nuevo.");
      return;
    }

    if (!name || !email) {
      setErrorMessage("Completa todos los campos obligatorios.");
      return;
    }

    if (!acceptTerms) {
      setErrorMessage("Debes aceptar los Términos y Condiciones de uso para crear tu cuenta.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo crear la cuenta.");
        return;
      }

      router.push("/auth?verifyEmail=1");
    } catch {
      setErrorMessage("Error de red. Inténtalo de nuevo en unos segundos.");
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
              <p className="auth-kicker">GameZone Access</p>
              <h1 className="auth-title">Crea tu cuenta</h1>
              <p className="auth-subtitle">
                Regístrate para guardar tu progreso, acceder a ofertas exclusivas
                y sincronizar tu biblioteca en la Next Gaming Store.
              </p>
            </header>

            <form className="auth-form" onSubmit={handleSubmit}>
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
                  placeholder="Tu nick gamer"
                  minLength={3}
                  required
                />
              </div>

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
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className="auth-input"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
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
                  placeholder="Repite tu contraseña"
                  minLength={8}
                  required
                />
              </div>

              <label className="auth-alt" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id="acceptTerms" name="acceptTerms" type="checkbox" required />
                <span>
                  Acepto los{" "}
                  <Link href="/terms" className="auth-link">
                    Términos y Condiciones de uso
                  </Link>
                </span>
              </label>

              <label className="auth-alt" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input id="acceptMarketing" name="acceptMarketing" type="checkbox" />
                <span>
                  Quiero recibir correos con novedades, ofertas y actualizaciones de GameZone.
                </span>
              </label>

              <button
                type="submit"
                className="button-primary auth-submit btn-padding-site"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              {errorMessage ? (
                <p className="auth-alt" role="alert" aria-live="assertive">
                  {errorMessage}
                </p>
              ) : null}

              <p className="auth-alt">
                ¿Ya tienes cuenta?{" "}
                <Link href="/auth" className="auth-link">
                  Iniciar sesión
                </Link>
              </p>

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">o regístrate con</span>
                <span className="auth-divider-line" />
              </div>

              <div className="auth-social-row">
                <button type="button" className="auth-social-button">
                  <span className="auth-social-icon">G</span>
                  <span>Google</span>
                </button>

                <button type="button" className="auth-social-button">
                  <Image
                    src="/iconos_platforms/facebook5.svg"
                    alt="Facebook"
                    width={16}
                    height={16}
                    className="auth-social-icon-img"
                  />
                  <span>Facebook</span>
                </button>

                <button type="button" className="auth-social-button">
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
          </div>

          <div className="auth-media-panel">
            <div className="auth-media-inner">
              <Image
                src="/Recursos/sign-wallpaper.jpg"
                alt="Arte promocional de registro GameZone Access"
                fill
                priority
                className="auth-media-image"
                sizes="(min-width: 1024px) 480px, 100vw"
              />

              <div className="auth-media-gradient" />

              <div className="auth-media-brand">
                <span className="auth-media-tag">READY PLAYER</span>
                <span className="auth-media-text">
                  Crea tu cuenta y empieza a construir tu perfil gamer con
                  recomendaciones, wishlist y ventajas exclusivas.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

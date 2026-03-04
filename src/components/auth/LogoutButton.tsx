// Botón de cerrar sesión para la sección de cuenta (redirige al login).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Componente que lanza el logout en el backend y limpia la sesión actual.
export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogout = async () => {
    setErrorMessage("");
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setErrorMessage("No se pudo cerrar sesión.");
        return;
      }

      router.push("/auth");
      router.refresh();
    } catch {
      setErrorMessage("Error de red al cerrar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form">
      <button
        type="button"
        className="button-primary auth-submit-compact auth-center-button btn-padding-site"
        onClick={handleLogout}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>

      {errorMessage ? (
        <p className="auth-alt" role="alert" aria-live="assertive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

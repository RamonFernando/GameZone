// Panel principal de "Mi cuenta": perfil, pedidos recientes y sesiones activas.
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

// Datos completos del perfil editable del usuario.
type Profile = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  province?: string | null;
  twoFactorEnabled?: boolean;
  totpEnabled?: boolean;
  pushAuthEnabled?: boolean;
};

// Ítem individual de un pedido concreto.
type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  subtotal: number;
};

// Pedido con importe total, divisa y listado de ítems.
type Order = {
  id: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
};

// Fila que representa una sesión activa (o anterior) del usuario.
type SessionRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

// Formatea un número como importe de dinero en la divisa indicada.
// Por ahora mantiene EUR/es-ES; más adelante podríamos usar geo-format si quieres
// que este panel también cambie según geoCurrency/geoLocale.
function formatMoney(amount: number, currency = "EUR") {
  return amount.toLocaleString("es-ES", { style: "currency", currency });
}

// Componente de dashboard de cuenta: perfil, historial resumido y gestión de sesiones.
export function AccountDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [postalCodeDraft, setPostalCodeDraft] = useState("");
  const [countryDraft, setCountryDraft] = useState("");
  const [provinceDraft, setProvinceDraft] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMessageType, setProfileMessageType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"account" | "details" | "security">("account");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isUpdatingTwoFactor, setIsUpdatingTwoFactor] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [isUpdatingTotp, setIsUpdatingTotp] = useState(false);
  const [totpMessage, setTotpMessage] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpQrDataUrl, setTotpQrDataUrl] = useState("");
  const [totpCodeDraft, setTotpCodeDraft] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  );
  const hasProfileChanges = useMemo(() => {
    if (!profile) {
      return false;
    }
    return (
      nameDraft.trim() !== profile.name ||
      emailDraft.trim().toLowerCase() !== profile.email.toLowerCase() ||
      (avatarUrlDraft.trim() || "") !== (profile.avatarUrl ?? "") ||
      (phoneDraft.trim() || "") !== (profile.phone ?? "") ||
      (addressDraft.trim() || "") !== (profile.addressLine1 ?? "") ||
      (cityDraft.trim() || "") !== (profile.city ?? "") ||
      (postalCodeDraft.trim() || "") !== (profile.postalCode ?? "") ||
      (countryDraft.trim() || "") !== (profile.country ?? "") ||
      (provinceDraft.trim() || "") !== (profile.province ?? "")
    );
  }, [
    addressDraft,
    avatarUrlDraft,
    cityDraft,
    countryDraft,
    emailDraft,
    nameDraft,
    phoneDraft,
    postalCodeDraft,
    profile,
    provinceDraft,
  ]);

  const loadDashboardData = async () => {
    setProfileMessage("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsLoading(true);
      const [meRes, ordersRes, sessionsRes] = await Promise.all([
        fetch("/api/account/me"),
        fetch("/api/orders"),
        fetch("/api/account/sessions"),
      ]);

      if (!meRes.ok || !ordersRes.ok || !sessionsRes.ok) {
        setErrorMessage("No se pudo cargar tu panel de cuenta.");
        return;
      }

      const mePayload = (await meRes.json()) as { user?: Profile };
      const ordersPayload = (await ordersRes.json()) as { orders?: Order[] };
      const sessionsPayload = (await sessionsRes.json()) as { sessions?: SessionRow[] };

      const nextProfile = mePayload.user ?? null;
      setProfile(nextProfile);
      setNameDraft(nextProfile?.name ?? "");
      setEmailDraft(nextProfile?.email ?? "");
      setAvatarUrlDraft(nextProfile?.avatarUrl ?? "");
      setPhoneDraft(nextProfile?.phone ?? "");
      setAddressDraft(nextProfile?.addressLine1 ?? "");
      setCityDraft(nextProfile?.city ?? "");
      setPostalCodeDraft(nextProfile?.postalCode ?? "");
      setCountryDraft(nextProfile?.country ?? "");
      setProvinceDraft(nextProfile?.province ?? "");
      setTwoFactorEnabled(Boolean(nextProfile?.twoFactorEnabled));
      setTotpEnabled(Boolean(nextProfile?.totpEnabled));
      setOrders(ordersPayload.orders ?? []);
      setSessions(sessionsPayload.sessions ?? []);
    } catch {
      setErrorMessage("Error de red al cargar tu cuenta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const cookieMap = new Map(
      document.cookie.split(";").map((entry) => {
        const [key, ...rest] = entry.trim().split("=");
        return [key, decodeURIComponent(rest.join("=") || "")] as const;
      })
    );
    const locale = cookieMap.get("uiLocale") ?? cookieMap.get("geoLocale") ?? "es-ES";
    setLang(locale.toLowerCase().startsWith("en") ? "en" : "es");
  }, []);

  const handleSaveProfile = async () => {
    setProfileMessage("");

    if (nameDraft.trim().length < 3) {
      setProfileMessageType("error");
      setProfileMessage("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    if (!hasProfileChanges) {
      setProfileMessageType("info");
      setProfileMessage("No hay cambios por guardar.");
      return;
    }

    try {
      setIsSavingProfile(true);

      const response = await fetch("/api/account/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nameDraft,
          email: emailDraft,
          avatarUrl: avatarUrlDraft.trim() || null,
          phone: phoneDraft.trim() || null,
          addressLine1: addressDraft.trim() || null,
          city: cityDraft.trim() || null,
          postalCode: postalCodeDraft.trim() || null,
          country: countryDraft.trim() || null,
          province: provinceDraft.trim() || null,
        }),
      });

      const payload = (await response.json()) as { message?: string; user?: Profile };
      if (!response.ok) {
        setProfileMessageType("error");
        setProfileMessage(payload.message ?? "No se pudo actualizar el perfil.");
        return;
      }

      if (payload.user) {
        setProfile(payload.user);
        setNameDraft(payload.user.name);
        setEmailDraft(payload.user.email);
        setAvatarUrlDraft(payload.user.avatarUrl ?? "");
        setPhoneDraft(payload.user.phone ?? "");
        setAddressDraft(payload.user.addressLine1 ?? "");
        setCityDraft(payload.user.city ?? "");
        setPostalCodeDraft(payload.user.postalCode ?? "");
        setCountryDraft(payload.user.country ?? "");
        setProvinceDraft(payload.user.province ?? "");
      }
      setProfileMessageType("success");
      setProfileMessage(payload.message ?? "Perfil actualizado.");
    } catch {
      setProfileMessageType("error");
      setProfileMessage("Error de red al actualizar el perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileMessage("");
    setProfileMessageType("info");

    if (!file.type.startsWith("image/")) {
      setProfileMessageType("error");
      setProfileMessage("El archivo debe ser una imagen.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { message?: string; avatarUrl?: string };
      if (!response.ok) {
        setProfileMessageType("error");
        setProfileMessage(payload.message ?? "No se pudo subir el avatar.");
        return;
      }
      if (payload.avatarUrl) {
        setAvatarUrlDraft(payload.avatarUrl);
        setProfileMessageType("success");
        setProfileMessage(payload.message ?? "Avatar actualizado.");
      }
    } catch {
      setProfileMessageType("error");
      setProfileMessage("Error de red al subir el avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogoutAll = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsRevokingAll(true);
      const response = await fetch("/api/auth/logout-all", { method: "POST" });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudieron cerrar todas las sesiones.");
        return;
      }

      setSuccessMessage(payload.message ?? "Sesiones revocadas.");
      window.location.href = "/auth";
    } catch {
      setErrorMessage("Error de red al cerrar sesiones.");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    setTwoFactorMessage("");
    try {
      setIsUpdatingTwoFactor(true);
      const response = await fetch("/api/account/security/2fa", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !twoFactorEnabled }),
      });

      const payload = (await response.json()) as {
        message?: string;
        twoFactorEnabled?: boolean;
      };

      if (!response.ok) {
        setTwoFactorMessage(payload.message ?? "No se pudo actualizar la configuración de 2FA.");
        return;
      }

      setTwoFactorEnabled(Boolean(payload.twoFactorEnabled));
      setTwoFactorMessage(payload.message ?? "Configuración de seguridad actualizada.");
    } catch {
      setTwoFactorMessage("Error de red al cambiar la configuración de 2FA.");
    } finally {
      setIsUpdatingTwoFactor(false);
    }
  };

  const handleStartTotpSetup = async () => {
    setTotpMessage("");
    setTotpSecret("");
    setTotpQrDataUrl("");
    setTotpCodeDraft("");

    try {
      setIsUpdatingTotp(true);
      const response = await fetch("/api/account/security/totp/setup", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        secret?: string;
        qrDataUrl?: string;
        otpauthUrl?: string;
      };

      if (!response.ok) {
        setTotpMessage(payload.message ?? "No se pudo iniciar la configuración de TOTP.");
        return;
      }

      if (payload.secret) {
        setTotpSecret(payload.secret);
      }
      if (payload.qrDataUrl) {
        setTotpQrDataUrl(payload.qrDataUrl);
      }
      setTotpMessage(
        payload.message ??
          "Escanea el código QR con tu app y luego introduce el código de 6 dígitos para activar."
      );
    } catch {
      setTotpMessage("Error de red al iniciar la configuración de TOTP.");
    } finally {
      setIsUpdatingTotp(false);
    }
  };

  const handleConfirmTotp = async () => {
    if (!totpSecret || !totpCodeDraft.trim()) {
      setTotpMessage("Primero escanea el QR y luego introduce el código de tu app.");
      return;
    }

    try {
      setIsUpdatingTotp(true);
      const response = await fetch("/api/account/security/totp/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: totpSecret,
          code: totpCodeDraft.trim(),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        totpEnabled?: boolean;
      };

      if (!response.ok) {
        setTotpMessage(payload.message ?? "No se pudo activar 2FA con app.");
        return;
      }

      setTotpEnabled(Boolean(payload.totpEnabled));
      setTotpMessage(payload.message ?? "2FA con app activado correctamente.");
      setTotpCodeDraft("");
      setTotpSecret("");
      setTotpQrDataUrl("");
    } catch {
      setTotpMessage("Error de red al activar 2FA con app.");
    } finally {
      setIsUpdatingTotp(false);
    }
  };

  const handleDisableTotp = async () => {
    setTotpMessage("");
    try {
      setIsUpdatingTotp(true);
      const response = await fetch("/api/account/security/totp/disable", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        totpEnabled?: boolean;
      };

      if (!response.ok) {
        setTotpMessage(payload.message ?? "No se pudo desactivar 2FA con app.");
        return;
      }

      setTotpEnabled(Boolean(payload.totpEnabled));
      setTotpSecret("");
      setTotpQrDataUrl("");
      setTotpCodeDraft("");
      setTotpMessage(payload.message ?? "2FA con app desactivado.");
    } catch {
      setTotpMessage("Error de red al desactivar 2FA con app.");
    } finally {
      setIsUpdatingTotp(false);
    }
  };

  if (isLoading) {
    return (
      <p className="auth-alt">
        {lang === "en" ? "Loading your account dashboard..." : "Cargando tu panel de cuenta..."}
      </p>
    );
  }

  return (
    <div className="auth-form">
      <div className="account-tabs">
        <button
          type="button"
          className={
            "account-tab" + (activeTab === "account" ? " account-tab--active" : "")
          }
          onClick={() => setActiveTab("account")}
        >
          {lang === "en" ? "Profile" : "Perfil"}
        </button>
        <button
          type="button"
          className={
            "account-tab" + (activeTab === "details" ? " account-tab--active" : "")
          }
          onClick={() => setActiveTab("details")}
        >
          {lang === "en" ? "Personal data" : "Datos personales"}
        </button>
        <button
          type="button"
          className={
            "account-tab" + (activeTab === "security" ? " account-tab--active" : "")
          }
          onClick={() => setActiveTab("security")}
        >
          {lang === "en" ? "Security" : "Seguridad"}
        </button>
      </div>

      {activeTab === "account" ? (
        <>
          <div className="auth-field">
            <label htmlFor="profile-name" className="auth-label">
              {lang === "en" ? "Name" : "Nombre"}
            </label>
            <input
              id="profile-name"
              type="text"
              className="auth-input"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-email" className="auth-label">
              {lang === "en" ? "Email" : "Correo electrónico"}
            </label>
            <input
              id="profile-email"
              type="email"
              className="auth-input"
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="button-primary auth-submit-compact auth-center-button btn-padding-site"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile
              ? lang === "en"
                ? "Saving..."
                : "Guardando..."
              : hasProfileChanges
                ? lang === "en"
                  ? "Save profile"
                  : "Guardar perfil"
                : lang === "en"
                  ? "No changes"
                  : "Sin cambios"}
          </button>

          {profileMessage ? (
            <p
              className="auth-alt"
              role={profileMessageType === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {profileMessage}
            </p>
          ) : null}

          {profile ? (
            <p className="auth-alt">
              {lang === "en" ? "Active user:" : "Usuario activo:"}{" "}
              <strong>{profile.email}</strong>
            </p>
          ) : null}

          <p className="auth-alt">
            {lang === "en" ? "Total spent:" : "Total gastado:"}{" "}
            <strong>{formatMoney(totalSpent)}</strong>
          </p>

          <hr className="auth-divider-rule" />

          <p className="auth-alt">
            {lang === "en"
              ? "Your session is protected with an httpOnly cookie and automatic expiration."
              : "Tu sesión está protegida con cookie httpOnly y expiración automática."}
          </p>

          <div className="auth-field">
            <span className="auth-label">Sesiones activas</span>
            {sessions.length === 0 ? (
              <p className="auth-alt">
                {lang === "en"
                  ? "There are no active sessions registered."
                  : "No hay sesiones activas registradas."}
              </p>
            ) : (
              sessions.map((session) => (
                <p key={session.id} className="auth-alt">
                  {session.isCurrent
                    ? lang === "en"
                      ? "This session"
                      : "Esta sesión"
                    : lang === "en"
                      ? "Other session"
                      : "Otra sesión"}{" "}
                  - IP: {session.ipAddress ?? (lang === "en" ? "unknown" : "desconocida")} -{" "}
                  {session.userAgent
                    ? session.userAgent.slice(0, 40)
                    : lang === "en"
                      ? "UA unknown"
                      : "UA desconocido"}
                </p>
              ))
            )}
          </div>

          <button
            type="button"
            className="button-ghost auth-center-button btn-padding-site"
            onClick={handleLogoutAll}
            disabled={isRevokingAll}
          >
            {isRevokingAll
              ? lang === "en"
                ? "Closing sessions..."
                : "Cerrando sesiones..."
              : lang === "en"
                ? "Log out on all devices"
                : "Cerrar sesión en todos los dispositivos"}
          </button>

          {errorMessage ? (
            <p className="auth-alt" role="alert" aria-live="assertive">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="auth-alt" role="status" aria-live="polite">
              {successMessage}
            </p>
          ) : null}
        </>
      ) : null}

      {activeTab === "details" ? (
        <>
          <div className="auth-field">
            <label htmlFor="profile-avatar-url" className="auth-label">
              {lang === "en" ? "Avatar URL (optional)" : "URL de avatar (opcional)"}
            </label>
            <input
              id="profile-avatar-url"
              type="url"
              className="auth-input"
              placeholder="https://.../mi-foto.png"
              value={avatarUrlDraft}
              onChange={(event) => setAvatarUrlDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-avatar-file" className="auth-label">
              {lang === "en" ? "Upload profile image" : "Subir imagen de perfil"}
            </label>
            <input
              id="profile-avatar-file"
              type="file"
              accept="image/*"
              className="auth-input"
              onChange={handleAvatarFileChange}
            />
            {isUploadingAvatar ? (
              <p className="auth-alt">
                {lang === "en" ? "Uploading avatar..." : "Subiendo avatar..."}
              </p>
            ) : (
              <p className="auth-alt">
                {lang === "en"
                  ? "You can choose an image from your computer. We will save it as your profile picture."
                  : "Puedes elegir una imagen de tu ordenador. La guardaremos como tu foto de perfil."}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="profile-phone" className="auth-label">
              {lang === "en" ? "Phone" : "Teléfono"}
            </label>
            <input
              id="profile-phone"
              type="tel"
              className="auth-input"
              value={phoneDraft}
              onChange={(event) => setPhoneDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-address" className="auth-label">
              {lang === "en" ? "Address" : "Dirección"}
            </label>
            <input
              id="profile-address"
              type="text"
              className="auth-input"
              value={addressDraft}
              onChange={(event) => setAddressDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-city" className="auth-label">
              {lang === "en" ? "City" : "Ciudad"}
            </label>
            <input
              id="profile-city"
              type="text"
              className="auth-input"
              value={cityDraft}
              onChange={(event) => setCityDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-postal" className="auth-label">
              {lang === "en" ? "Postal code" : "Código postal"}
            </label>
            <input
              id="profile-postal"
              type="text"
              className="auth-input"
              value={postalCodeDraft}
              onChange={(event) => setPostalCodeDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-country" className="auth-label">
              {lang === "en" ? "Country" : "País"}
            </label>
            <input
              id="profile-country"
              type="text"
              className="auth-input"
              value={countryDraft}
              onChange={(event) => setCountryDraft(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="profile-province" className="auth-label">
              {lang === "en" ? "Province" : "Provincia"}
            </label>
            <input
              id="profile-province"
              type="text"
              className="auth-input"
              value={provinceDraft}
              onChange={(event) => setProvinceDraft(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="button-primary auth-submit-compact auth-center-button btn-padding-site"
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            {isSavingProfile
              ? lang === "en"
                ? "Saving..."
                : "Guardando..."
              : hasProfileChanges
                ? lang === "en"
                  ? "Save changes"
                  : "Guardar cambios"
                : lang === "en"
                  ? "No changes"
                  : "Sin cambios"}
          </button>

          {profileMessage ? (
            <p
              className="auth-alt"
              role={profileMessageType === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {profileMessage}
            </p>
          ) : null}
        </>
      ) : null}

      {activeTab === "security" ? (
        <>
          <div className="auth-field">
            <span className="auth-label">Acceso en dos pasos (2FA)</span>
            <p className="auth-alt">
              {lang === "en"
                ? "Add a second security layer. When it is enabled, each time you sign in you will have to enter an additional code that we send to your email."
                : "Añade una segunda capa de seguridad. Cuando esté activado, al iniciar sesión tendrás que introducir además un código que te enviaremos a tu email."}
            </p>
          </div>

          <button
            type="button"
            className={
              "button-primary auth-submit-compact auth-center-button btn-padding-site"
            }
            onClick={handleToggleTwoFactor}
            disabled={isUpdatingTwoFactor}
          >
            {isUpdatingTwoFactor
              ? lang === "en"
                ? "Saving..."
                : "Guardando..."
              : twoFactorEnabled
                ? lang === "en"
                  ? "Disable 2FA by email"
                  : "Desactivar 2FA por email"
                : lang === "en"
                  ? "Enable 2FA by email"
                  : "Activar 2FA por email"}
          </button>

          <p className="auth-alt">
            {lang === "en" ? "Current status:" : "Estado actual:"}{" "}
            <strong>
              {twoFactorEnabled
                ? lang === "en"
                  ? "2FA enabled"
                  : "2FA activado"
                : lang === "en"
                  ? "2FA disabled"
                  : "2FA desactivado"}
            </strong>
          </p>

          {twoFactorMessage ? (
            <p className="auth-alt" role="status" aria-live="polite">
              {twoFactorMessage}
            </p>
          ) : null}

          <hr className="auth-divider-rule" />

          <div className="auth-field">
            <span className="auth-label">Autenticación con app (TOTP)</span>
            <p className="auth-alt">
              {lang === "en" ? "Use apps like " : "Usa apps como "}
              <strong>Google Authenticator</strong>, <strong>Authy</strong>{" "}
              {lang === "en" ? "or " : "o "}
              <strong>FreeOTP</strong>{" "}
              {lang === "en"
                ? "to generate 6‑digit codes that change every 30 seconds. It is the most widely used 2FA system in professional environments."
                : "para generar códigos de 6 dígitos que cambian cada 30 segundos. Es el sistema 2FA más utilizado a nivel profesional."}
            </p>
          </div>

          {!totpEnabled && (
            <>
              <button
                type="button"
                className="button-primary auth-submit-compact auth-center-button btn-padding-site"
                onClick={handleStartTotpSetup}
                disabled={isUpdatingTotp}
              >
                {isUpdatingTotp
                  ? lang === "en"
                    ? "Preparing..."
                    : "Preparando..."
                  : lang === "en"
                    ? "Start setup with app (QR)"
                    : "Iniciar configuración con app (QR)"}
              </button>

              {totpSecret && (
                <div className="auth-field" style={{ marginTop: "0.75rem" }}>
                  {totpQrDataUrl ? (
                    <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                      <Image
                        src={totpQrDataUrl}
                        alt="Código QR para app de autenticación"
                        width={180}
                        height={180}
                        style={{ maxWidth: 180, height: "auto", margin: "0 auto" }}
                      />
                    </div>
                  ) : null}
                  <p className="auth-alt">
                    {lang === "en"
                      ? "1. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.). If you can't scan it, add the account manually using this secret:"
                      : "1. Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.). Si no puedes escanearlo, añade la cuenta manualmente usando este secreto:"}
                  </p>
                  <p className="auth-alt" style={{ fontFamily: "monospace" }}>
                    {totpSecret}
                  </p>
                  <p className="auth-alt">
                    {lang === "en"
                      ? "2. Enter here the 6‑digit code that you see in the app:"
                      : "2. Introduce aquí el código de 6 dígitos que veas en la app:"}
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="auth-input"
                    value={totpCodeDraft}
                    onChange={(event) => setTotpCodeDraft(event.target.value)}
                    placeholder="Código de 6 dígitos"
                  />
                  <button
                    type="button"
                    className="button-primary auth-submit-compact auth-center-button btn-padding-site"
                    style={{ marginTop: "0.5rem" }}
                    onClick={handleConfirmTotp}
                    disabled={isUpdatingTotp}
                  >
                    {isUpdatingTotp
                      ? lang === "en"
                        ? "Verifying..."
                        : "Verificando..."
                      : lang === "en"
                        ? "Confirm code and enable 2FA with app"
                        : "Confirmar código y activar 2FA con app"}
                  </button>
                </div>
              )}
            </>
          )}

          {totpEnabled && (
            <>
              <p className="auth-alt">
                {lang === "en"
                  ? "Current status: 2FA with app enabled. Every time you sign in, you will be asked for the code from your authenticator app."
                  : "Estado actual: 2FA con app activado. Cada vez que inicies sesión, se te pedirá el código de tu app de autenticación."}
              </p>
              <button
                type="button"
                className="button-ghost auth-center-button btn-padding-site"
                onClick={handleDisableTotp}
                disabled={isUpdatingTotp}
              >
                {isUpdatingTotp
                  ? lang === "en"
                    ? "Disabling..."
                    : "Desactivando..."
                  : lang === "en"
                    ? "Disable 2FA with app"
                    : "Desactivar 2FA con app"}
              </button>
            </>
          )}

          {totpMessage ? (
            <p className="auth-alt" role="status" aria-live="polite">
              {totpMessage}
            </p>
          ) : null}

          <hr className="auth-divider-rule" />

          <div className="auth-field">
            <span className="auth-label">Verificación de acceso desde el móvil (Push MFA)</span>
            <p className="auth-alt">
              {lang === "en"
                ? "This is the system where you receive a notification on your phone and approve or deny the sign‑in (for example: “Is this you?” with Yes / No buttons)."
                : "Es el sistema donde recibes una notificación en tu móvil y aceptas o rechazas el inicio de sesión (por ejemplo: \"¿Eres tú?\" con botones de Sí / No)."}
            </p>
            <p className="auth-alt">
              {lang === "en"
                ? "To have this working exactly like Google, we would need our own mobile app with push notifications connected to GameZone. For now only the email second factor is available, but this section prepares the security area to enable it in the future."
                : "Para tener esto igual que Google, necesitaríamos una app móvil propia con notificaciones push conectada a GameZone. De momento solo está disponible el segundo factor por email, pero esta sección deja preparado el apartado de seguridad para activarlo en el futuro."}
            </p>
          </div>

          <button
            type="button"
            className="button-ghost auth-center-button btn-padding-site"
            disabled
            title="Requiere app móvil y sistema de notificaciones push"
          >
            {lang === "en"
              ? "Coming soon: enable verification by mobile notification"
              : "Próximamente: activar verificación por notificación en el móvil"}
          </button>
        </>
      ) : null}
    </div>
  );
}

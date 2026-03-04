// Panel principal de "Mi cuenta": perfil, pedidos recientes y sesiones activas.
"use client";

import Link from "next/link";
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
  const [activeTab, setActiveTab] = useState<"account" | "details">("account");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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

  if (isLoading) {
    return <p className="auth-alt">Cargando tu panel de cuenta...</p>;
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
          Perfil
        </button>
        <button
          type="button"
          className={
            "account-tab" + (activeTab === "details" ? " account-tab--active" : "")
          }
          onClick={() => setActiveTab("details")}
        >
          Datos personales
        </button>
      </div>

      {activeTab === "account" ? (
        <>
          <div className="auth-field">
            <label htmlFor="profile-name" className="auth-label">
              Nombre
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
              Email
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
            {isSavingProfile ? "Guardando..." : hasProfileChanges ? "Guardar perfil" : "Sin cambios"}
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
              Usuario activo: <strong>{profile.email}</strong>
            </p>
          ) : null}

          <p className="auth-alt">
            Total gastado: <strong>{formatMoney(totalSpent)}</strong>
          </p>

          <hr className="auth-divider-rule" />

          <p className="auth-alt">
            Tu sesión está protegida con cookie httpOnly y expiración automática.
          </p>

          <div className="auth-field">
            <span className="auth-label">Sesiones activas</span>
            {sessions.length === 0 ? (
              <p className="auth-alt">No hay sesiones activas registradas.</p>
            ) : (
              sessions.map((session) => (
                <p key={session.id} className="auth-alt">
                  {session.isCurrent ? "Esta sesión" : "Otra sesión"} - IP:{" "}
                  {session.ipAddress ?? "desconocida"} -{" "}
                  {session.userAgent ? session.userAgent.slice(0, 40) : "UA desconocido"}
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
            {isRevokingAll ? "Cerrando sesiones..." : "Cerrar sesión en todos los dispositivos"}
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
              URL de avatar (opcional)
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
              Subir imagen de perfil
            </label>
            <input
              id="profile-avatar-file"
              type="file"
              accept="image/*"
              className="auth-input"
              onChange={handleAvatarFileChange}
            />
            {isUploadingAvatar ? (
              <p className="auth-alt">Subiendo avatar...</p>
            ) : (
              <p className="auth-alt">
                Puedes elegir una imagen de tu ordenador. La guardaremos como tu foto de perfil.
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="profile-phone" className="auth-label">
              Teléfono
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
              Dirección
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
              Ciudad
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
              Código postal
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
              País
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
              Provincia
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
            {isSavingProfile ? "Guardando..." : hasProfileChanges ? "Guardar cambios" : "Sin cambios"}
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
    </div>
  );
}

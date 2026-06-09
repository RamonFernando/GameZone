// Panel principal de "Mi cuenta": perfil, pedidos recientes y sesiones activas.
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocale } from "@/hooks/useLocale";
import {
  createPaymentProgressStorageKey,
  getPaymentProgressStepFromStartedAt,
  type PaymentProgressStep,
} from "@/lib/checkout/payment-progress";

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

type PendingPayment = {
  id: string;
  status: string;
  paymentProvider: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  validationStatus?: "processing" | "error" | "failed";
  validationMessage?: string;
  stripeSessionStatus?: string | null;
  stripePaymentStatus?: string | null;
};

type PaymentStatusPayload = {
  pendingPayment?: PendingPayment | null;
  paymentResult?: PendingPayment | null;
};

type AccountTab = "account" | "details" | "security" | "payment";

const MAX_PENDING_PAYMENT_POLLS = 30;

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
export function AccountDashboard({ initialTab = "account" }: { initialTab?: AccountTab }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentResult, setPaymentResult] = useState<PendingPayment | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRefreshingPendingPayment, setIsRefreshingPendingPayment] = useState(false);
  const [pendingPaymentPollCount, setPendingPaymentPollCount] = useState(0);
  const [paymentProgressStep, setPaymentProgressStep] =
    useState<PaymentProgressStep>("checking");
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
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
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
  const lang = useLocale();
  const clearedPaidOrderRef = useRef<string | null>(null);
  const hadActiveCheckoutFlowRef = useRef(false);

  const totalSpent = useMemo(
    () =>
      orders
        .filter((order) => order.status === "paid")
        .reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  );
  const emailTwoFactorBlockedByTotp = totpEnabled && !twoFactorEnabled;
  const totpBlockedByEmail = twoFactorEnabled && !totpEnabled;
  const personalDataRows = useMemo(
    () => [
      {
        label: lang === "en" ? "Phone" : "Teléfono",
        value: profile?.phone,
      },
      {
        label: lang === "en" ? "Address" : "Dirección",
        value: profile?.addressLine1,
      },
      {
        label: lang === "en" ? "City" : "Ciudad",
        value: profile?.city,
      },
      {
        label: lang === "en" ? "Postal code" : "Código postal",
        value: profile?.postalCode,
      },
      {
        label: lang === "en" ? "Province" : "Provincia",
        value: profile?.province,
      },
      {
        label: lang === "en" ? "Country" : "País",
        value: profile?.country,
      },
    ],
    [lang, profile]
  );
  const hasPersonalData = personalDataRows.some((row) => Boolean(row.value?.trim()));
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

  const fetchPendingPayment = async () => {
    const response = await fetch("/api/orders/pending-payment", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as PaymentStatusPayload;
    return payload;
  };

  const loadDashboardData = async () => {
    setProfileMessage("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsLoading(true);
      const [meRes, ordersRes, sessionsRes, pendingPaymentRes] = await Promise.all([
        fetch("/api/account/me"),
        fetch("/api/orders"),
        fetch("/api/account/sessions"),
        fetch("/api/orders/pending-payment", { cache: "no-store" }),
      ]);

      if (!meRes.ok || !ordersRes.ok || !sessionsRes.ok) {
        setErrorMessage("No se pudo cargar tu panel de cuenta.");
        return;
      }

      const mePayload = (await meRes.json()) as { user?: Profile };
      const ordersPayload = (await ordersRes.json()) as { orders?: Order[] };
      const sessionsPayload = (await sessionsRes.json()) as { sessions?: SessionRow[] };
      const pendingPaymentPayload = pendingPaymentRes.ok
        ? ((await pendingPaymentRes.json()) as PaymentStatusPayload)
        : { pendingPayment: null, paymentResult: null };

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
      setPendingPayment(pendingPaymentPayload.pendingPayment ?? null);
      setPaymentResult(pendingPaymentPayload.paymentResult ?? null);
      setPendingPaymentPollCount(pendingPaymentPayload.pendingPayment ? 1 : 0);
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

  const pendingPaymentReachedLimit = pendingPaymentPollCount >= MAX_PENDING_PAYMENT_POLLS;
  const pendingPaymentHasProblem =
    pendingPayment?.validationStatus === "error" ||
    pendingPayment?.validationStatus === "failed" ||
    pendingPaymentReachedLimit;
  const paymentIsPaid = paymentResult?.status === "paid";
  const paymentProgressIsComplete = paymentProgressStep === "complete";
  const paymentIsAnimatingConfirmation = paymentIsPaid && !paymentProgressIsComplete;
  const accountPaymentSteps = {
    validationDone:
      paymentIsPaid &&
      ["orderSaved", "cartCleared", "complete"].includes(paymentProgressStep),
    registerDone:
      paymentIsPaid &&
      ["cartCleared", "complete"].includes(paymentProgressStep),
    cartDone:
      paymentIsPaid &&
      paymentProgressStep === "complete",
  };
  const accountProgressClass = (isDone: boolean, isActive: boolean) =>
    "checkout-progress-item" +
    (isDone ? " checkout-progress-item--done" : "") +
    (isActive ? " checkout-progress-item--active" : "");

  useEffect(() => {
    if (!pendingPayment || pendingPaymentHasProblem) return;

    const intervalId = window.setInterval(async () => {
      setPendingPaymentPollCount((count) =>
        Math.min(MAX_PENDING_PAYMENT_POLLS, count + 1)
      );
      const nextPaymentStatus = await fetchPendingPayment();
      setPendingPayment(nextPaymentStatus?.pendingPayment ?? null);
      setPaymentResult(nextPaymentStatus?.paymentResult ?? null);
      if (!nextPaymentStatus?.pendingPayment) {
        window.dispatchEvent(new Event("gamezone:cart-cleared"));
        void loadDashboardData();
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pendingPayment, pendingPaymentHasProblem]);

  useEffect(() => {
    if ((pendingPayment || paymentResult) && initialTab === "payment") {
      setActiveTab("payment");
    }
  }, [initialTab, pendingPayment, paymentResult]);

  useEffect(() => {
    if (!isLoading && !pendingPayment && !paymentResult && activeTab === "payment") {
      setActiveTab("account");
    }
  }, [activeTab, isLoading, pendingPayment, paymentResult]);

  const handleRefreshPendingPayment = async () => {
    setIsRefreshingPendingPayment(true);
    try {
      setPendingPaymentPollCount((count) =>
        Math.min(MAX_PENDING_PAYMENT_POLLS, count + 1)
      );
      const nextPaymentStatus = await fetchPendingPayment();
      setPendingPayment(nextPaymentStatus?.pendingPayment ?? null);
      setPaymentResult(nextPaymentStatus?.paymentResult ?? null);
      if (!nextPaymentStatus?.pendingPayment) {
        window.dispatchEvent(new Event("gamezone:cart-cleared"));
        await loadDashboardData();
      }
    } finally {
      setIsRefreshingPendingPayment(false);
    }
  };

  useEffect(() => {
    setPendingPaymentPollCount(pendingPayment ? 1 : 0);
  }, [pendingPayment?.id]);

  useEffect(() => {
    if (pendingPayment) {
      setPaymentProgressStep("checking");
      return;
    }

    if (paymentResult?.status !== "paid") {
      setPaymentProgressStep("complete");
      return;
    }

    const storageKey = createPaymentProgressStorageKey(paymentResult.id);
    const storedStartedAt = window.sessionStorage.getItem(storageKey);
    const startedAt = storedStartedAt ? Number(storedStartedAt) : 0;

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      setPaymentProgressStep("complete");
      return;
    }

    // Active checkout flow confirmed — allow cart clear on completion.
    hadActiveCheckoutFlowRef.current = true;

    const updateProgressStep = () => {
      const nextStep = getPaymentProgressStepFromStartedAt(startedAt);
      setPaymentProgressStep(nextStep);
      if (nextStep === "complete") {
        window.sessionStorage.removeItem(storageKey);
      }
      return nextStep;
    };

    if (updateProgressStep() === "complete") return;

    const intervalId = window.setInterval(() => {
      if (updateProgressStep() === "complete") {
        window.clearInterval(intervalId);
      }
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [paymentResult?.id, paymentResult?.status, pendingPayment]);

  useEffect(() => {
    if (!paymentResult?.id || !paymentIsPaid || !paymentProgressIsComplete) {
      return;
    }

    if (clearedPaidOrderRef.current === paymentResult.id) {
      return;
    }

    // Only clear the cart when completing an active checkout flow started in this
    // session (sessionStorage key was present with a valid timestamp).
    // Prevents clearing the cart on normal account visits where the user has
    // previous paid orders but is not in the middle of a checkout.
    if (!hadActiveCheckoutFlowRef.current) {
      return;
    }

    clearedPaidOrderRef.current = paymentResult.id;
    window.dispatchEvent(new Event("gamezone:cart-cleared"));
  }, [paymentIsPaid, paymentProgressIsComplete, paymentResult?.id]);

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
        setIsEditingDetails(false);
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

  const resetDetailsDrafts = () => {
    setAvatarUrlDraft(profile?.avatarUrl ?? "");
    setPhoneDraft(profile?.phone ?? "");
    setAddressDraft(profile?.addressLine1 ?? "");
    setCityDraft(profile?.city ?? "");
    setPostalCodeDraft(profile?.postalCode ?? "");
    setCountryDraft(profile?.country ?? "");
    setProvinceDraft(profile?.province ?? "");
  };

  const openDetailsEditor = () => {
    resetDetailsDrafts();
    setProfileMessage("");
    setIsEditingDetails(true);
  };

  const closeDetailsEditor = () => {
    resetDetailsDrafts();
    setProfileMessage("");
    setIsEditingDetails(false);
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
    if (!twoFactorEnabled && emailTwoFactorBlockedByTotp) {
      setTwoFactorMessage(
        lang === "en"
          ? "Button disabled: you already have 2FA with app enabled. Disable 2FA with app first if you want to use email codes."
          : "Botón desactivado: ya tienes 2FA con app activado. Desactiva primero 2FA con app si quieres usar códigos por email."
      );
      return;
    }

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
    if (totpBlockedByEmail) {
      setTotpMessage(
        lang === "en"
          ? "Button disabled: you already have 2FA by email enabled. Disable email 2FA first if you want to use an authenticator app."
          : "Botón desactivado: ya tienes 2FA por email activado. Desactiva primero 2FA por email si quieres usar una app autenticadora."
      );
      return;
    }

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
        {pendingPayment || paymentResult ? (
          <button
            type="button"
            className={
              "account-tab" + (activeTab === "payment" ? " account-tab--active" : "")
            }
            onClick={() => setActiveTab("payment")}
          >
            {pendingPayment
              ? lang === "en"
                ? "Payment validation"
                : "Pago en validación"
              : lang === "en"
                ? "Payment result"
                : "Resultado del pago"}
          </button>
        ) : null}
      </div>

      {activeTab === "payment" && (pendingPayment || paymentResult) ? (
        <section className="account-pending-payment account-payment-validation" aria-live="polite">
          <div className="account-pending-payment-head">
            <div>
              <span className="auth-label">
                {lang === "en" ? "Checkout status" : "Estado del pago"}
              </span>
              <h3 className="account-pending-payment-title">
                {paymentIsAnimatingConfirmation
                  ? lang === "en"
                    ? "We are confirming your purchase"
                    : "Estamos confirmando tu compra"
                  : paymentResult?.status === "paid"
                  ? lang === "en"
                    ? "Your purchase was confirmed"
                    : "Tu compra fue confirmada"
                  : pendingPaymentHasProblem
                  ? lang === "en"
                    ? "We could not confirm this payment automatically"
                    : "No pudimos confirmar este pago automáticamente"
                  : lang === "en"
                    ? "We are confirming your purchase"
                    : "Estamos confirmando tu compra"}
              </h3>
            </div>
            <span className="account-pending-payment-badge">
              {(pendingPayment ?? paymentResult)?.paymentProvider === "paypal" ? "PayPal" : "Stripe"}
            </span>
          </div>

          <div className="checkout-status-panel" role="status" aria-live="polite">
            {!paymentProgressIsComplete && !pendingPaymentHasProblem ? (
              <div className="checkout-status-spinner" aria-hidden="true" />
            ) : null}
            <div className="checkout-status-copy">
              <p className="checkout-status-title">
                {paymentIsPaid && paymentProgressIsComplete
                  ? lang === "en"
                    ? "Payment confirmed, order saved and cart cleared"
                    : "Pago confirmado, pedido guardado y carrito limpiado"
                  : paymentIsPaid
                    ? lang === "en"
                      ? "We are confirming your purchase"
                      : "Estamos confirmando tu compra"
                  : pendingPaymentHasProblem
                  ? lang === "en"
                    ? "This needs a manual check"
                    : "Esto necesita una revisión manual"
                  : lang === "en"
                    ? "Your payment is still being validated"
                    : "Tu pago sigue en validación"}
              </p>
              <p className="auth-alt">
                {paymentIsPaid && paymentProgressIsComplete
                  ? lang === "en"
                    ? "Your order is already available in purchase history."
                    : "Tu pedido ya está disponible en el historial de compras."
                  : paymentIsPaid
                    ? lang === "en"
                      ? "We are showing the final steps so you can see exactly what happened."
                      : "Estamos mostrando los pasos finales para que veas exactamente qué ocurrió."
                  : pendingPayment?.validationMessage
                  ? pendingPayment.validationMessage
                  : pendingPaymentReachedLimit
                    ? lang === "en"
                      ? "The automatic check reached its limit. Use the button to retry or review Stripe before charging again."
                      : "La comprobación automática llegó al límite. Usa el botón para reintentar o revisa Stripe antes de volver a cobrar."
                    : lang === "en"
                      ? "The cart will be cleared when the payment provider confirms the transaction."
                      : "El carrito se limpiará cuando la pasarela confirme la transacción."}
              </p>
            </div>
          </div>

          <ol className="checkout-progress-list" aria-label={lang === "en" ? "Payment status" : "Estado del pago"}>
            <li className="checkout-progress-item checkout-progress-item--done">
              <span className="checkout-progress-marker" aria-hidden="true" />
              <span>{lang === "en" ? "Payment received by provider" : "Pago recibido desde la pasarela"}</span>
            </li>
            <li
              className={
                pendingPaymentHasProblem
                  ? "checkout-progress-item checkout-progress-item--error"
                  : accountProgressClass(
                      accountPaymentSteps.validationDone,
                      (paymentIsPaid && paymentProgressStep === "paymentConfirmed") ||
                        (!paymentIsPaid && !pendingPaymentHasProblem)
                    )
              }
            >
              <span className="checkout-progress-marker" aria-hidden="true" />
              <span>
                {lang === "en" ? "Validating secure confirmation" : "Validando confirmación segura"}{" "}
                {!paymentIsPaid
                  ? `(${Math.max(1, pendingPaymentPollCount)}/${MAX_PENDING_PAYMENT_POLLS})`
                  : null}
              </span>
            </li>
            <li
              className={accountProgressClass(
                accountPaymentSteps.registerDone,
                paymentIsPaid && paymentProgressStep === "orderSaved"
              )}
            >
              <span className="checkout-progress-marker" aria-hidden="true" />
              <span>{lang === "en" ? "Register order" : "Registrar pedido"}</span>
            </li>
            <li
              className={accountProgressClass(
                accountPaymentSteps.cartDone,
                paymentIsPaid && paymentProgressStep === "cartCleared"
              )}
            >
              <span className="checkout-progress-marker" aria-hidden="true" />
              <span>{lang === "en" ? "Clear cart" : "Limpiar carrito"}</span>
            </li>
          </ol>

          <p className="auth-alt">
            {lang === "en"
              ? "You can stay in your account while the payment provider confirms the transaction. This panel disappears when the order is paid."
              : "Puedes quedarte en tu cuenta mientras la pasarela confirma la transacción. Este panel desaparece cuando el pedido queda pagado."}
          </p>

          <div className="account-pending-payment-grid">
            <div>
              <span className="auth-label">{lang === "en" ? "Order" : "Pedido"}</span>
              <strong>#{(pendingPayment ?? paymentResult)?.id.slice(0, 8)}</strong>
            </div>
            <div>
              <span className="auth-label">{lang === "en" ? "Total" : "Total"}</span>
              <strong>
                {formatMoney(
                  (pendingPayment ?? paymentResult)?.totalAmount ?? 0,
                  (pendingPayment ?? paymentResult)?.currency
                )}
              </strong>
            </div>
            <div>
              <span className="auth-label">{lang === "en" ? "Status" : "Estado"}</span>
              <strong>
                {paymentResult?.status === "paid"
                  ? lang === "en"
                    ? "Paid"
                    : "Pagado"
                  : pendingPaymentHasProblem
                  ? lang === "en"
                    ? "Needs review"
                    : "Revisar"
                  : lang === "en"
                    ? "Validating"
                    : "Validando"}
              </strong>
            </div>
          </div>

          {pendingPayment?.stripeSessionStatus || pendingPayment?.stripePaymentStatus ? (
            <p className="auth-alt">
              Stripe: sesión {pendingPayment.stripeSessionStatus ?? "desconocida"}, pago{" "}
              {pendingPayment.stripePaymentStatus ?? "desconocido"}.
            </p>
          ) : null}

          <ul className="account-pending-payment-items">
            {(pendingPayment ?? paymentResult)?.items.map((item) => (
              <li key={item.id}>
                <span>{item.title}</span>
                <strong>x{item.quantity}</strong>
              </li>
            ))}
          </ul>

          {pendingPayment ? (
            <button
              type="button"
              className="button-primary auth-submit-compact btn-padding-site"
              onClick={handleRefreshPendingPayment}
              disabled={isRefreshingPendingPayment}
            >
              {isRefreshingPendingPayment
                ? lang === "en"
                  ? "Checking..."
                  : "Comprobando..."
                : pendingPaymentHasProblem
                  ? lang === "en"
                    ? "Retry payment check"
                    : "Reintentar validación del pago"
                  : lang === "en"
                    ? "Update payment status"
                    : "Actualizar estado del pago"}
            </button>
          ) : null}
        </section>
      ) : null}

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
          {!isEditingDetails ? (
            <>
              <div className="account-details-summary">
                <div className="account-details-summary-head">
                  <div>
                    <span className="auth-label">
                      {lang === "en" ? "Saved personal data" : "Datos personales guardados"}
                    </span>
                    <p className="auth-alt">
                      {lang === "en"
                        ? "This information can be used for receipts, order support and account management."
                        : "Esta información puede usarse para recibos, soporte de pedidos y gestión de tu cuenta."}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button-primary auth-submit-compact btn-padding-site account-details-edit-button"
                    onClick={openDetailsEditor}
                  >
                    {hasPersonalData
                      ? lang === "en"
                        ? "Edit data"
                        : "Editar datos"
                      : lang === "en"
                        ? "Add data"
                        : "Añadir datos"}
                  </button>
                </div>

                {hasPersonalData ? (
                  <dl className="account-details-list">
                    {personalDataRows.map((row) => (
                      <div className="account-details-row" key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value?.trim() || (lang === "en" ? "Not set" : "Sin completar")}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="auth-alt">
                    {lang === "en"
                      ? "You have not added personal data yet."
                      : "Todavía no has añadido datos personales."}
                  </p>
                )}
              </div>
            </>
          ) : (
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

              <div className="account-details-actions">
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
                <button
                  type="button"
                  className="button-ghost auth-submit-compact auth-center-button btn-padding-site"
                  onClick={closeDetailsEditor}
                  disabled={isSavingProfile}
                >
                  {lang === "en" ? "Cancel" : "Cancelar"}
                </button>
              </div>
            </>
          )}

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
          <div className="account-recovery-panel">
            <div>
              <span className="auth-label">
                {lang === "en" ? "Account recovery" : "Recuperación de cuenta"}
              </span>
              <p className="auth-alt">
                {lang === "en"
                  ? "Your current recovery flow uses your main email and the password reset link."
                  : "Ahora mismo la recuperación usa tu email principal y el enlace de restablecimiento de contraseña."}
              </p>
            </div>

            <dl className="account-recovery-list">
              <div className="account-recovery-row">
                <dt>{lang === "en" ? "Main email" : "Email principal"}</dt>
                <dd>{profile?.email ?? "—"}</dd>
              </div>
              <div className="account-recovery-row">
                <dt>{lang === "en" ? "Recovery email" : "Email de recuperación"}</dt>
                <dd>{lang === "en" ? "Not configured yet" : "Aún no configurado"}</dd>
              </div>
              <div className="account-recovery-row">
                <dt>{lang === "en" ? "Recovery codes" : "Códigos de recuperación"}</dt>
                <dd>{lang === "en" ? "Not generated yet" : "Aún no generados"}</dd>
              </div>
            </dl>
          </div>

          <hr className="auth-divider-rule" />

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
            disabled={isUpdatingTwoFactor || emailTwoFactorBlockedByTotp}
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

          {emailTwoFactorBlockedByTotp ? (
            <p className="auth-alt" role="status" aria-live="polite">
              {lang === "en"
                ? "Button disabled: you already have 2FA with app enabled. Disable 2FA with app first if you want to use email codes."
                : "Botón desactivado: ya tienes 2FA con app activado. Desactiva primero 2FA con app si quieres usar códigos por email."}
            </p>
          ) : null}

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
                disabled={isUpdatingTotp || totpBlockedByEmail}
              >
                {isUpdatingTotp
                  ? lang === "en"
                    ? "Preparing..."
                    : "Preparando..."
                  : lang === "en"
                    ? "Start setup with app (QR)"
                    : "Iniciar configuración con app (QR)"}
              </button>

              {totpBlockedByEmail ? (
                <p className="auth-alt" role="status" aria-live="polite">
                  {lang === "en"
                    ? "Button disabled: you already have 2FA by email enabled. Disable email 2FA first if you want to use an authenticator app."
                    : "Botón desactivado: ya tienes 2FA por email activado. Desactiva primero 2FA por email si quieres usar una app autenticadora."}
                </p>
              ) : null}

              {totpSecret && (
                <div className="auth-field" style={{ marginTop: "0.75rem" }}>
                  {totpQrDataUrl ? (
                    <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
                      <Image
                        src={totpQrDataUrl}
                        alt="Código QR para app de autenticación"
                        width={180}
                        height={180}
                        unoptimized
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

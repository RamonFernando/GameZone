// Panel de administración de pedidos: listado filtrable y acciones de reembolso.
"use client";

import { useEffect, useMemo, useState } from "react";

// Ítem de un pedido tal como lo ve el panel admin.
type AdminOrderItem = {
  id: string;
  title: string;
  quantity: number;
  subtotal: number;
};

// Pedido completo con datos de pago, reembolso y usuario que lo realizó.
type AdminOrder = {
  id: string;
  status: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  refundedAt: string | null;
  refundedByUserId: string | null;
  refundReason: string | null;
  refundReference: string | null;
  refundEmailSentAt: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  items: AdminOrderItem[];
};

// Filtros disponibles para el listado de pedidos.
type StatusFilter = "all" | "pending" | "paid" | "failed" | "refunded";
type ProviderFilter = "all" | "stripe" | "paypal" | "manual";

// Formatea importes para mostrarlos en la tabla de pedidos.
function formatMoney(amount: number, currency = "EUR") {
  return amount.toLocaleString("es-ES", { style: "currency", currency });
}

// Componente principal que lista pedidos y permite filtrar y reembolsar.
export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundingOrderId, setIsRefundingOrderId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (providerFilter !== "all") {
      params.set("provider", providerFilter);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [providerFilter, statusFilter]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        const response = await fetch(`/api/admin/orders${queryString}`);
        const payload = (await response.json()) as {
          message?: string;
          orders?: AdminOrder[];
        };
        if (!response.ok) {
          setErrorMessage(payload.message ?? "No se pudieron cargar los pedidos.");
          return;
        }
        setOrders(payload.orders ?? []);
      } catch {
        setErrorMessage("Error de red cargando pedidos.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [queryString]);

  const handleRefund = async (orderId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const reason = window.prompt("Indica el motivo del reembolso (mínimo 5 caracteres):", "");
    if (reason === null) {
      return;
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      setErrorMessage("Debes indicar un motivo de reembolso válido.");
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que quieres reembolsar este pedido? Esta acción ejecutará el reembolso en Stripe."
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsRefundingOrderId(orderId);
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: trimmedReason,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "No se pudo procesar el reembolso.");
        return;
      }

      setSuccessMessage(payload.message ?? "Reembolso ejecutado correctamente.");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "refunded",
                refundReason: trimmedReason,
                refundedAt: new Date().toISOString(),
              }
            : order
        )
      );
    } catch {
      setErrorMessage("Error de red procesando el reembolso.");
    } finally {
      setIsRefundingOrderId("");
    }
  };

  return (
    <div className="auth-form">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div className="auth-field" style={{ gap: 6 }}>
          <label htmlFor="statusFilter" className="auth-label">
            Estado
          </label>
          <select
            id="statusFilter"
            className="auth-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="failed">Fallido</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>

        <div className="auth-field" style={{ gap: 6 }}>
          <label htmlFor="providerFilter" className="auth-label">
            Pasarela
          </label>
          <select
            id="providerFilter"
            className="auth-input"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value as ProviderFilter)}
          >
            <option value="all">Todas</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {isLoading ? <p className="auth-alt">Cargando pedidos...</p> : null}
      {errorMessage ? <p className="auth-alt">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-alt">{successMessage}</p> : null}

      {!isLoading && !errorMessage && orders.length === 0 ? (
        <p className="auth-alt">No hay pedidos con esos filtros.</p>
      ) : null}

      {!isLoading && !errorMessage && orders.length > 0 ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920, fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Pedido</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Estado</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Pasarela</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Total</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Referencia</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Reembolso</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Items</th>
                <th style={{ textAlign: "left", padding: "8px 10px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={{ borderTop: "1px solid rgba(148,163,184,0.2)" }}>
                  <td style={{ padding: "8px 10px", lineHeight: 1.35 }}>
                    <strong>#{order.id.slice(0, 8)}</strong>
                    <div className="auth-alt">{order.user.email}</div>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <strong>{order.status}</strong>
                  </td>
                  <td style={{ padding: "8px 10px" }}>{order.paymentProvider ?? "n/a"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
                  </td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    {new Date(order.createdAt).toLocaleString("es-ES")}
                  </td>
                  <td style={{ padding: "8px 10px" }}>{order.paymentReference ?? "sin referencia"}</td>
                  <td style={{ padding: "8px 10px", lineHeight: 1.35 }}>
                    {order.refundedAt ? (
                      <>
                        <div>{new Date(order.refundedAt).toLocaleString("es-ES")}</div>
                        <div className="auth-alt">admin: {order.refundedByUserId ?? "n/a"}</div>
                        <div className="auth-alt">{order.refundReason ?? "sin motivo"}</div>
                      </>
                    ) : (
                      <span className="auth-alt">-</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", lineHeight: 1.35 }}>
                    {order.items.map((item) => `${item.title} x${item.quantity}`).join(", ")}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {order.status === "paid" && order.paymentProvider === "stripe" ? (
                      <button
                        type="button"
                        className="button-ghost btn-padding-site"
                        onClick={() => handleRefund(order.id)}
                        disabled={isRefundingOrderId === order.id}
                      >
                        {isRefundingOrderId === order.id ? "Reembolsando..." : "Reembolsar"}
                      </button>
                    ) : (
                      <span className="auth-alt">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

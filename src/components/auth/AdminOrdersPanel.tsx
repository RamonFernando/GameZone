// Panel de administración de pedidos: listado filtrable y acciones de reembolso.
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminOrdersPanel.module.scss";

// Ítem de un pedido tal como lo ve el panel admin.
type AdminOrderItem = {
  id: string;
  gameSlug: string;
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
type PlatformFilter = "all" | "PlayStation" | "Xbox" | "Nintendo" | "PC";

const ORDERS_PER_PAGE = 20;
const PLATFORM_FILTERS: Array<{ label: PlatformFilter; icon: string }> = [
  { label: "PlayStation", icon: "/iconos_platforms/icon-play.svg" },
  { label: "Xbox", icon: "/iconos_platforms/icon-xbx.svg" },
  { label: "Nintendo", icon: "/iconos_platforms/icon-swt.svg" },
  { label: "PC", icon: "/iconos_platforms/icon-pc.svg" },
];

// Formatea importes para mostrarlos en la tabla de pedidos.
function formatMoney(amount: number, currency = "EUR") {
  return amount.toLocaleString("es-ES", { style: "currency", currency });
}

// Componente principal que lista pedidos y permite filtrar y reembolsar.
// Los pedidos se cargan una sola vez desde la API; el filtrado por estado/pasarela
// y la paginación se aplican en local sobre los datos ya cargados, sin nuevas
// llamadas a la API al cambiar de filtro o de página.
export function AdminOrdersPanel() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [slugPlatformMap, setSlugPlatformMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefundingOrderId, setIsRefundingOrderId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");
        const response = await fetch("/api/admin/orders");
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
  }, []);

  useEffect(() => {
    const loadProductPlatforms = async () => {
      try {
        const response = await fetch("/api/products", { cache: "force-cache" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          products?: Array<{ slug?: string; platform?: string }>;
        };
        const map: Record<string, string> = {};
        for (const product of payload.products ?? []) {
          const slug = String(product.slug ?? "").trim();
          const productPlatform = String(product.platform ?? "").trim();
          if (slug && productPlatform) {
            map[slug] = productPlatform;
          }
        }
        setSlugPlatformMap(map);
      } catch {
        setSlugPlatformMap({});
      }
    };

    void loadProductPlatforms();
  }, []);

  // Filtrado local: no dispara peticiones nuevas, solo recalcula sobre `orders`.
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }
      if (providerFilter !== "all" && order.paymentProvider !== providerFilter) {
        return false;
      }
      if (platformFilter !== "all") {
        const normalizedPlatform = platformFilter.toLowerCase();
        const hasPlatformItem = order.items.some((item) => {
          const itemPlatform = slugPlatformMap[item.gameSlug]?.toLowerCase() ?? "";
          return itemPlatform.includes(normalizedPlatform);
        });
        if (!hasPlatformItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, providerFilter, platformFilter, slugPlatformMap]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));

  // Si el filtro reduce los resultados y la página actual queda fuera de rango, la recolocamos.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

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
      <div className={styles.filtersGrid}>
        <div className={`auth-field ${styles.filterField}`}>
          <label htmlFor="statusFilter" className="auth-label">
            Estado
          </label>
          <select
            id="statusFilter"
            className="auth-input"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="failed">Fallido</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>

        <div className={`auth-field ${styles.filterField}`}>
          <label htmlFor="providerFilter" className="auth-label">
            Pasarela
          </label>
          <select
            id="providerFilter"
            className="auth-input"
            value={providerFilter}
            onChange={(event) => {
              setProviderFilter(event.target.value as ProviderFilter);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todas</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      <div className="auth-field" style={{ gap: 8 }}>
        <span className="auth-label">Plataforma</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className={`button-ghost btn-padding-site${platformFilter === "all" ? " button-primary" : ""}`}
            onClick={() => {
              setPlatformFilter("all");
              setCurrentPage(1);
            }}
            aria-pressed={platformFilter === "all" ? "true" : "false"}
          >
            Todos
          </button>
          {PLATFORM_FILTERS.map((platform) => (
            <button
              key={platform.label}
              type="button"
              className={`button-ghost btn-padding-site${platformFilter === platform.label ? " button-primary" : ""}`}
              onClick={() => {
                setPlatformFilter(platformFilter === platform.label ? "all" : platform.label);
                setCurrentPage(1);
              }}
              aria-pressed={platformFilter === platform.label ? "true" : "false"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Image src={platform.icon} alt="" aria-hidden="true" width={16} height={16} />
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="auth-alt">Cargando pedidos...</p> : null}
      {errorMessage ? <p className="auth-alt">{errorMessage}</p> : null}
      {successMessage ? <p className="auth-alt">{successMessage}</p> : null}

      {!isLoading && !errorMessage && filteredOrders.length === 0 ? (
        <p className="auth-alt">No hay pedidos con esos filtros.</p>
      ) : null}

      {!isLoading && !errorMessage && filteredOrders.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Pedido</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Pasarela</th>
                <th className={styles.th}>Total</th>
                <th className={styles.th}>Fecha</th>
                <th className={styles.th}>Referencia</th>
                <th className={styles.th}>Reembolso</th>
                <th className={styles.thItems}>Items</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className={styles.tr}>
                  <td className={styles.tdMultiline}>
                    <strong>#{order.id.slice(0, 8)}</strong>
                    <div className="auth-alt">{order.user.email}</div>
                  </td>
                  <td className={styles.td}>
                    <strong>{order.status}</strong>
                  </td>
                  <td className={styles.td}>{order.paymentProvider ?? "n/a"}</td>
                  <td className={styles.td}>
                    <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
                  </td>
                  <td className={styles.tdNowrap}>
                    {new Date(order.createdAt).toLocaleString("es-ES")}
                  </td>
                  <td className={styles.td}>{order.paymentReference ?? "sin referencia"}</td>
                  <td className={styles.tdMultiline}>
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
                  <td className={styles.tdItems}>
                    {order.items.map((item) => `${item.title} x${item.quantity}`).join(", ")}
                  </td>
                  <td className={styles.td}>
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

      {!isLoading && !errorMessage && filteredOrders.length > 0 && totalPages > 1 ? (
        <div className={styles.pagination}>
          <button
            type="button"
            className="button-ghost btn-padding-site"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
          >
            Anterior
          </button>
          <span className="auth-alt">
            Página {currentPage} de {totalPages} ({filteredOrders.length} pedidos)
          </span>
          <button
            type="button"
            className="button-ghost btn-padding-site"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}

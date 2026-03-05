// Historial de compras del usuario: muestra cada juego adquirido en forma de tabla.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Ítem individual dentro de un pedido del usuario.
type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

// Pedido del usuario con estado y conjunto de ítems.
type Order = {
  id: string;
  currency: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
};

// Fila "aplanada" que representa una compra de un juego concreto.
type PurchaseRow = {
  rowId: string;
  gameName: string;
  quantity: number;
  price: number;
  currency: string;
  date: string;
  orderStatus: string;
};

// Formatea importes para mostrarlos en la tabla de historial.
function formatMoney(amount: number, currency = "EUR", locale = "es-ES") {
  return amount.toLocaleString(locale, { style: "currency", currency });
}

// Componente que lista el historial completo de compras del usuario.
export function AccountOrdersHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");

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

  const rows = useMemo<PurchaseRow[]>(() => {
    return orders
      .flatMap((order) =>
        order.items.map((item) => ({
          rowId: `${order.id}-${item.id}`,
          gameName: item.title,
          quantity: item.quantity,
          price: item.subtotal,
          currency: order.currency,
          date: order.createdAt,
          orderStatus: order.status,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  useEffect(() => {
    const loadOrders = async () => {
      setErrorMessage("");

      try {
        setIsLoading(true);
        const response = await fetch("/api/orders", { cache: "no-store" });
        const payload = (await response.json()) as { orders?: Order[]; message?: string };

        if (!response.ok) {
          setErrorMessage(
            payload.message ??
              (lang === "en"
                ? "We couldn't load your purchase history."
                : "No se pudo cargar el historial de compras.")
          );
          return;
        }

        setOrders(payload.orders ?? []);
      } catch {
        setErrorMessage(
          lang === "en"
            ? "Network error while loading your purchase history."
            : "Error de red cargando el historial de compras."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, [lang]);

  if (isLoading) {
    return (
      <p className="auth-alt">
        {lang === "en" ? "Loading purchase history..." : "Cargando historial de compras..."}
      </p>
    );
  }

  if (errorMessage) {
    return (
      <div className="auth-form">
        <p className="auth-alt" role="alert">
          {errorMessage}
        </p>
        <Link href="/account" className="button-primary auth-submit-compact auth-center-button btn-padding-site">
          {lang === "en" ? "Back to my account" : "Volver a mi cuenta"}
        </Link>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="auth-form">
        <p className="auth-alt">
          {lang === "en"
            ? "You don't have any purchases yet."
            : "Todavía no tienes compras registradas."}
        </p>
        <Link href="/" className="button-primary auth-submit-compact auth-center-button btn-padding-site">
          {lang === "en" ? "Go to buy games" : "Ir a comprar juegos"}
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="account-orders-table-wrap">
        <table className="account-orders-table">
          <thead>
            <tr>
              <th>{lang === "en" ? "Game" : "Juego"}</th>
              <th>{lang === "en" ? "Date" : "Fecha"}</th>
              <th>{lang === "en" ? "Price" : "Precio"}</th>
              <th>{lang === "en" ? "Status" : "Estado"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowId}>
                <td>
                  {row.gameName}
                  <span className="auth-alt account-orders-qty">x{row.quantity}</span>
                </td>
                <td>
                  {new Date(row.date).toLocaleString(
                    lang === "en" ? "en-US" : "es-ES"
                  )}
                </td>
                <td>
                  {formatMoney(
                    row.price,
                    row.currency,
                    lang === "en" ? "en-US" : "es-ES"
                  )}
                </td>
                <td>{row.orderStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        href="/account"
        className="button-primary auth-submit-compact auth-center-button btn-padding-site"
      >
        {lang === "en" ? "Back to my account" : "Volver a mi cuenta"}
      </Link>
    </div>
  );
}

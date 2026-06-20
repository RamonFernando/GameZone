// Historial de compras del usuario: muestra cada juego adquirido en forma de tabla.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useSearch } from "@/contexts/SearchContext";

type OrderItem = {
  id: string;
  gameSlug: string;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  gameKey?: string | null;
};

type Order = {
  id: string;
  currency: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
};

type PurchaseRow = {
  rowId: string;
  gameSlug: string;
  gameName: string;
  quantity: number;
  price: number;
  currency: string;
  date: string;
  orderStatus: string;
  gameKey?: string | null;
};

function formatMoney(amount: number, currency = "EUR", locale = "es-ES") {
  return amount.toLocaleString(locale, { style: "currency", currency });
}

export function AccountOrdersHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [slugPlatformMap, setSlugPlatformMap] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const lang = useLocale();
  const { platform } = useSearch();

  const handleCopyKey = async (rowId: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(rowId);
      setTimeout(() => setCopiedId((current) => (current === rowId ? null : current)), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles; la clave sigue visible para copiar a mano.
    }
  };

  const rows = useMemo<PurchaseRow[]>(() => {
    return orders
      .flatMap((order) =>
        order.items.map((item) => ({
          rowId: `${order.id}-${item.id}`,
          gameSlug: item.gameSlug ?? "",
          gameName: item.title,
          quantity: item.quantity,
          price: item.subtotal,
          currency: order.currency,
          date: order.createdAt,
          orderStatus: order.status,
          gameKey: item.gameKey ?? null,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  const filteredRows = useMemo(() => {
    if (!platform) return rows;
    const p = platform.toLowerCase();
    return rows.filter((row) => {
      const rowPlatform = slugPlatformMap[row.gameSlug]?.toLowerCase() ?? "";
      return rowPlatform.includes(p);
    });
  }, [rows, platform, slugPlatformMap]);

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

  useEffect(() => {
    fetch("/api/products", { cache: "force-cache" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { products?: { slug: string; platform: string }[] } | null) => {
        if (!data?.products) return;
        const map: Record<string, string> = {};
        for (const p of data.products) map[p.slug] = p.platform;
        setSlugPlatformMap(map);
      })
      .catch(() => {});
  }, []);

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
      {platform && (
        <p className="auth-alt" style={{ marginBottom: 8 }}>
          {lang === "en"
            ? `Filtering by platform: ${platform} (${filteredRows.length} result${filteredRows.length !== 1 ? "s" : ""})`
            : `Filtrando por plataforma: ${platform} (${filteredRows.length} resultado${filteredRows.length !== 1 ? "s" : ""})`}
        </p>
      )}
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
            {filteredRows.map((row) => (
              <tr key={row.rowId}>
                <td>
                  {row.gameName}
                  <span className="auth-alt account-orders-qty">x{row.quantity}</span>
                  {row.orderStatus === "paid" && row.gameKey ? (
                    <div className="account-order-key">
                      <code className="account-order-key-code">{row.gameKey}</code>
                      <button
                        type="button"
                        className="account-order-key-copy"
                        onClick={() => handleCopyKey(row.rowId, row.gameKey as string)}
                        aria-label={lang === "en" ? "Copy activation key" : "Copiar clave de activación"}
                      >
                        {copiedId === row.rowId
                          ? lang === "en"
                            ? "Copied"
                            : "Copiada"
                          : lang === "en"
                            ? "Copy"
                            : "Copiar"}
                      </button>
                    </div>
                  ) : null}
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
    </div>
  );
}

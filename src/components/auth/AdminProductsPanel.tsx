// Panel de administración de productos: listado, filtros, creación y edición.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Fila de producto tal y como viene del backend para el panel admin.
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  priceOriginal: number;
  discountPercent: number;
  cashbackPercent: number;
  likesCount: number;
  priceFinal: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
};

// Borrador editable de un producto en los formularios de creación/edición.
type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  coverImage: string;
  platform: string;
  region: string;
  storeLabel: string;
  cardSubtitle: string;
  priceOriginal: string;
  discountPercent: string;
  cashbackPercent: string;
  likesCount: string;
  stock: string;
  isActive: boolean;
};

// Tipos auxiliares para ordenar columnas y mostrar toasts de feedback.
type SortColumn = "priceOriginal" | "stock" | "createdAt";
type SortDirection = "asc" | "desc";

type ToastItem = {
  id: string;
  type: "success" | "error";
  text: string;
};

// Número de productos por página en el listado principal.
const PAGE_SIZE = 6;

// Borrador vacío que usamos como estado inicial del formulario de producto.
const emptyDraft: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  coverImage: "",
  platform: "PC",
  region: "EUROPA",
  storeLabel: "Steam",
  cardSubtitle: "Código digital oficial",
  priceOriginal: "",
  discountPercent: "",
  cashbackPercent: "0",
  likesCount: "0",
  stock: "",
  isActive: true,
};

// Convierte un ProductRow en ProductDraft para prellenar el formulario de edición.
function toDraft(product: ProductRow): ProductDraft {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    coverImage: product.coverImage,
    platform: product.platform,
    region: product.region,
    storeLabel: product.storeLabel,
    cardSubtitle: product.cardSubtitle,
    priceOriginal: String(product.priceOriginal),
    discountPercent: String(product.discountPercent),
    cashbackPercent: String(product.cashbackPercent),
    likesCount: String(product.likesCount),
    stock: String(product.stock),
    isActive: product.isActive,
  };
}

function validateDraft(draft: ProductDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 2) errors.push("Nombre demasiado corto.");
  if (!/^[a-z0-9-]+$/.test(draft.slug.trim())) {
    errors.push("Slug inválido (usa minúsculas, números y guiones).");
  }
  if (draft.description.trim().length < 6) errors.push("Descripción demasiado corta.");
  if (!draft.coverImage.trim().startsWith("/")) {
    errors.push("La imagen debe empezar por '/'.");
  }

  const price = Number(draft.priceOriginal);
  const discount = Number(draft.discountPercent);
  const cashback = Number(draft.cashbackPercent);
  const likes = Number(draft.likesCount);
  const stock = Number(draft.stock);
  if (!Number.isFinite(price) || price <= 0) errors.push("Precio original inválido.");
  if (!Number.isInteger(discount) || discount < 0 || discount > 90) {
    errors.push("Descuento debe ser entero entre 0 y 90.");
  }
  if (!Number.isInteger(cashback) || cashback < 0 || cashback > 50) {
    errors.push("Cashback debe ser entero entre 0 y 50.");
  }
  if (!Number.isInteger(likes) || likes < 0) {
    errors.push("Likes inválido.");
  }
  if (!Number.isInteger(stock) || stock < 0) errors.push("Stock inválido.");
  return errors;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M3 17.25V21h3.75L18.81 8.94l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42L18.2 3.29a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2.01-1.66z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path
        d="M6 7h12l-1 14H7L6 7zm4-4h4l1 2h4v2H5V5h4l1-2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AdminProductsPanel() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [modalErrors, setModalErrors] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<ProductDraft>(emptyDraft);
  const [modalNotice, setModalNotice] = useState<string>("");
  const modalNameInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/products");
      const payload = (await response.json()) as { products?: ProductRow[]; message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudieron cargar productos.");
        return;
      }
      setProducts(payload.products ?? []);
    } catch {
      pushToast("error", "Error de red cargando productos.");
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const sortedFilteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(q) || product.slug.toLowerCase().includes(q)
        )
      : products;

    const sorted = [...filtered].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortColumn === "priceOriginal") {
        aValue = a.priceOriginal;
        bValue = b.priceOriginal;
      } else if (sortColumn === "stock") {
        aValue = a.stock;
        bValue = b.stock;
      } else {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [products, searchTerm, sortColumn, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedFilteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = sortedFilteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortColumn, sortDirection]);

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("desc");
  };

  const handleCreate = async () => {
    const errors = validateDraft(draft);
    setCreateErrors(errors);
    if (errors.length > 0) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          slug: draft.slug.trim().toLowerCase(),
          description: draft.description.trim(),
          coverImage: draft.coverImage.trim(),
          platform: draft.platform.trim(),
          region: draft.region.trim(),
          storeLabel: draft.storeLabel.trim(),
          cardSubtitle: draft.cardSubtitle.trim(),
          priceOriginal: Number(draft.priceOriginal),
          discountPercent: Number(draft.discountPercent),
          cashbackPercent: Number(draft.cashbackPercent),
          likesCount: Number(draft.likesCount),
          stock: Number(draft.stock),
          isActive: draft.isActive,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo crear producto.");
        return;
      }
      setDraft(emptyDraft);
      setCreateErrors([]);
      pushToast("success", payload.message ?? "Producto creado.");
      await loadProducts();
    } catch {
      pushToast("error", "Error de red creando producto.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;

    const product = products.find((item) => item.id === pendingDeleteId);
    if (!product) return;

    try {
      const response = await fetch(`/api/admin/products/${pendingDeleteId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo eliminar producto.");
        return;
      }
      pushToast("success", payload.message ?? "Producto eliminado.");
      await loadProducts();
    } catch {
      pushToast("error", "Error de red eliminando producto.");
    } finally {
      setPendingDeleteId(null);
      setPendingDeleteName(null);
    }
  };

  const openDeleteModal = (product: ProductRow) => {
    setPendingDeleteId(product.id);
    setPendingDeleteName(product.name);
  };

  const closeDeleteModal = () => {
    setPendingDeleteId(null);
    setPendingDeleteName(null);
  };

  const openEditModal = (product: ProductRow) => {
    setEditingProductId(product.id);
    setModalDraft(toDraft(product));
    setModalErrors([]);
    setModalNotice("");
  };

  const closeEditModal = () => {
    setEditingProductId(null);
    setModalDraft(emptyDraft);
    setModalErrors([]);
    setModalNotice("");
  };

  useEffect(() => {
    if (!editingProductId) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditModal();
      }
    };

    if (modalNameInputRef.current) {
      modalNameInputRef.current.focus();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingProductId]);

  const handleModalSave = async () => {
    if (!editingProductId) return;

    const errors = validateDraft(modalDraft);
    setModalErrors(errors);
    if (errors.length > 0) return;

    try {
      setSavingId(editingProductId);
      const response = await fetch(`/api/admin/products/${editingProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modalDraft.name.trim(),
          slug: modalDraft.slug.trim().toLowerCase(),
          description: modalDraft.description.trim(),
          coverImage: modalDraft.coverImage.trim(),
          platform: modalDraft.platform.trim(),
          region: modalDraft.region.trim(),
          storeLabel: modalDraft.storeLabel.trim(),
          cardSubtitle: modalDraft.cardSubtitle.trim(),
          priceOriginal: Number(modalDraft.priceOriginal),
          discountPercent: Number(modalDraft.discountPercent),
          cashbackPercent: Number(modalDraft.cashbackPercent),
          likesCount: Number(modalDraft.likesCount),
          stock: Number(modalDraft.stock),
          isActive: modalDraft.isActive,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo actualizar producto.");
        setModalNotice("");
        return;
      }
      pushToast("success", payload.message ?? "Producto actualizado.");
      setModalNotice("Cambios guardados correctamente.");
      await loadProducts();
    } catch {
      pushToast("error", "Error de red actualizando producto.");
      setModalNotice("");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="auth-form">
      <h3 className="auth-label">Crear producto</h3>
      <input
        className="auth-input"
        placeholder="Nombre"
        value={draft.name}
        onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Slug"
        value={draft.slug}
        onChange={(event) => setDraft((prev) => ({ ...prev, slug: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Descripción"
        value={draft.description}
        onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="URL imagen (ej: /games_data/.../cover.jpg)"
        value={draft.coverImage}
        onChange={(event) => setDraft((prev) => ({ ...prev, coverImage: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Plataforma (ej: PC, PlayStation)"
        value={draft.platform}
        onChange={(event) => setDraft((prev) => ({ ...prev, platform: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Región (ej: EUROPA)"
        value={draft.region}
        onChange={(event) => setDraft((prev) => ({ ...prev, region: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Tienda / launcher (ej: Steam)"
        value={draft.storeLabel}
        onChange={(event) => setDraft((prev) => ({ ...prev, storeLabel: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Subtítulo de tarjeta (ej: Código de Steam EUROPE)"
        value={draft.cardSubtitle}
        onChange={(event) => setDraft((prev) => ({ ...prev, cardSubtitle: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Precio original"
        value={draft.priceOriginal}
        onChange={(event) => setDraft((prev) => ({ ...prev, priceOriginal: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Descuento (%)"
        value={draft.discountPercent}
        onChange={(event) =>
          setDraft((prev) => ({ ...prev, discountPercent: event.target.value }))
        }
      />
      <input
        className="auth-input"
        placeholder="Stock disponible"
        value={draft.stock}
        onChange={(event) => setDraft((prev) => ({ ...prev, stock: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Cashback (%)"
        value={draft.cashbackPercent}
        onChange={(event) => setDraft((prev) => ({ ...prev, cashbackPercent: event.target.value }))}
      />
      <input
        className="auth-input"
        placeholder="Likes"
        value={draft.likesCount}
        onChange={(event) => setDraft((prev) => ({ ...prev, likesCount: event.target.value }))}
      />
      <label className="auth-alt" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, isActive: event.target.checked }))
          }
        />
        Producto activo
      </label>
      {createErrors.map((error) => (
        <p key={error} className="auth-alt" role="alert">
          {error}
        </p>
      ))}
      <button
        type="button"
        className="button-primary auth-submit-compact admin-center-button btn-padding-site"
        onClick={handleCreate}
        disabled={isSaving}
      >
        {isSaving ? "Guardando..." : "Crear producto"}
      </button>

      <h3 className="auth-label">Productos</h3>
      <input
        className="auth-input"
        placeholder="Buscar por nombre o slug..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("priceOriginal")}>
          Ordenar por precio {sortColumn === "priceOriginal" ? `(${sortDirection})` : ""}
        </button>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("stock")}>
          Ordenar por stock {sortColumn === "stock" ? `(${sortDirection})` : ""}
        </button>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("createdAt")}>
          Ordenar por fecha {sortColumn === "createdAt" ? `(${sortDirection})` : ""}
        </button>
      </div>

      {isLoading ? <p className="auth-alt">Cargando productos...</p> : null}

      {!isLoading ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Precio</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Stock</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Extras</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Estado</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Alta</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((product) => (
                <tr key={product.id} style={{ borderTop: "1px solid rgba(148,163,184,0.2)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <strong>{product.name}</strong>
                    <div className="auth-alt">{product.slug}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div className="auth-alt">
                      {product.priceOriginal.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </div>
                    <div>
                      <strong>
                        {product.priceFinal.toLocaleString("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </strong>{" "}
                      <span className="auth-alt">(-{product.discountPercent}%)</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{product.stock}</td>
                  <td style={{ padding: "10px 12px", lineHeight: 1.35 }}>
                    <div className="auth-alt">{product.platform} · {product.region}</div>
                    <div className="auth-alt">{product.storeLabel}</div>
                    <div className="auth-alt">Cashback {product.cashbackPercent}% · ♥ {product.likesCount}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>{product.isActive ? "Activo" : "Inactivo"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {new Date(product.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        aria-label={`Editar ${product.name}`}
                        title="Editar"
                        style={{
                          width: 30,
                          height: 30,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: "1px solid rgba(59,130,246,0.45)",
                          background: "rgba(59,130,246,0.12)",
                          color: "#bfdbfe",
                          cursor: "pointer",
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(product)}
                        aria-label={`Eliminar ${product.name}`}
                        title="Eliminar"
                        style={{
                          width: 30,
                          height: 30,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: "1px solid rgba(248,113,113,0.45)",
                          background: "rgba(248,113,113,0.12)",
                          color: "#fecaca",
                          cursor: "pointer",
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && sortedFilteredProducts.length > PAGE_SIZE ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className="button-ghost btn-padding-site"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={safePage <= 1}
          >
            Anterior
          </button>
          <span className="auth-alt">
            Página {safePage} de {pageCount}
          </span>
          <button
            type="button"
            className="button-ghost btn-padding-site"
            onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
            disabled={safePage >= pageCount}
          >
            Siguiente
          </button>
        </div>
      ) : null}

      {editingProductId ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeEditModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(680px, 100%)", maxHeight: "85vh", overflow: "auto", padding: 16 }}
          >
            <h3 className="auth-title" style={{ marginBottom: 8 }}>
              Editar producto
            </h3>
            <div className="auth-form">
              <input
                className="auth-input"
                placeholder="Nombre"
                value={modalDraft.name}
                ref={modalNameInputRef}
                onChange={(event) =>
                  setModalDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <input
                className="auth-input"
                placeholder="Slug"
                value={modalDraft.slug}
                onChange={(event) =>
                  setModalDraft((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <input
                className="auth-input"
                placeholder="Descripción"
                value={modalDraft.description}
                onChange={(event) =>
                  setModalDraft((prev) => ({ ...prev, description: event.target.value }))
                }
              />
              <input
                className="auth-input"
                placeholder="URL imagen"
                value={modalDraft.coverImage}
                onChange={(event) =>
                  setModalDraft((prev) => ({ ...prev, coverImage: event.target.value }))
                }
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <input
                  className="auth-input"
                  placeholder="Plataforma"
                  value={modalDraft.platform}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, platform: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Región"
                  value={modalDraft.region}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, region: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Tienda / launcher"
                  value={modalDraft.storeLabel}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, storeLabel: event.target.value }))
                  }
                />
              </div>
              <input
                className="auth-input"
                placeholder="Subtítulo"
                value={modalDraft.cardSubtitle}
                onChange={(event) =>
                  setModalDraft((prev) => ({ ...prev, cardSubtitle: event.target.value }))
                }
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <input
                  className="auth-input"
                  placeholder="Precio original"
                  value={modalDraft.priceOriginal}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, priceOriginal: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Descuento (%)"
                  value={modalDraft.discountPercent}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, discountPercent: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Stock disponible"
                  value={modalDraft.stock}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, stock: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Cashback (%)"
                  value={modalDraft.cashbackPercent}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, cashbackPercent: event.target.value }))
                  }
                />
                <input
                  className="auth-input"
                  placeholder="Likes"
                  value={modalDraft.likesCount}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, likesCount: event.target.value }))
                  }
                />
              </div>
              <label className="auth-alt" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={modalDraft.isActive}
                  onChange={(event) =>
                    setModalDraft((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Producto activo
              </label>
              {modalErrors.map((error) => (
                <p key={error} className="auth-alt" role="alert">
                  {error}
                </p>
              ))}
              {modalNotice ? (
                <p className="auth-alt" role="status" aria-live="polite">
                  {modalNotice}
                </p>
              ) : null}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="button-primary auth-submit-compact admin-center-button button-primary-edit-product-save"
                  onClick={handleModalSave}
                  disabled={savingId === editingProductId}
                >
                  {savingId === editingProductId ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  className="button-ghost button-ghost-equal admin-center-button button-primary-edit-product-cancel"
                  onClick={closeEditModal}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteId ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(420px, 100%)", padding: 16 }}
          >
            <h3 className="auth-title" style={{ marginBottom: 8 }}>
              Eliminar producto
            </h3>
            <p className="auth-alt" style={{ marginBottom: 12 }}>
              {pendingDeleteName
                ? `¿Seguro que quieres eliminar "${pendingDeleteName}"?`
                : "¿Seguro que quieres eliminar este producto?"}
              {" "}
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="button-ghost admin-center-button button-primary-edit-product-cancel"
                onClick={closeDeleteModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="button-primary admin-center-button button-primary-edit-product-delete"
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toasts.length > 0 ? (
        <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1200, display: "grid", gap: 8 }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                borderRadius: 10,
                padding: "10px 12px",
                background: toast.type === "success" ? "#14532d" : "#7f1d1d",
                color: "#f8fafc",
                border: "1px solid rgba(255,255,255,0.2)",
                minWidth: 240,
              }}
            >
              {toast.text}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

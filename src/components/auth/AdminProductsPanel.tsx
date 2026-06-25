// Panel de administración de productos: listado, filtros, creación y edición.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import styles from "./AdminProductsPanel.module.scss";
import { ProductEditModal } from "./admin/ProductEditModal";
import { DeleteProductModal } from "./admin/DeleteProductModal";
import { KeysModal } from "./admin/KeysModal";
import { AdminToastList } from "./admin/AdminToastList";
import { CreateProductModal } from "./admin/CreateProductModal";
import type { ProductDraft, ToastItem, KeyRow, KeysData } from "./admin/types";

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
  saleEndsAt?: string | null;
  createdAt: string;
};

// Tipos auxiliares para ordenar columnas.
type SortColumn = "priceOriginal" | "stock" | "createdAt";
type SortDirection = "asc" | "desc";

type AdminRole = "ADMIN" | "SUPER_ADMIN";

type CatalogSyncRun = {
  id: string;
  status: string;
  mode: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  fallbackUsed: boolean;
  dryRun: boolean;
  error: string | null;
};

type CatalogSyncStatus = {
  latestRun: CatalogSyncRun | null;
  runningRun: CatalogSyncRun | null;
  lastWriteSuccess: CatalogSyncRun | null;
  canRunToday: boolean;
  canForce: boolean;
};

// Diagnostico de calidad del catalogo para encontrar fichas pobres.
type CatalogQualityIssue =
  | "short_description"
  | "missing_long_description"
  | "missing_background"
  | "missing_screenshots"
  | "missing_developer"
  | "missing_publisher";

type CatalogQualityProduct = {
  id: string;
  name: string;
  slug: string;
  coverImage: string;
  storeLabel: string;
  metadataSource: string | null;
  issues: CatalogQualityIssue[];
};

type CatalogQualityReport = {
  total: number;
  incomplete: number;
  products: CatalogQualityProduct[];
};

// Número de productos por página en el listado principal.
const PAGE_SIZE = 6;

const CATALOG_ISSUE_LABELS: Record<CatalogQualityIssue, string> = {
  short_description: "Descripcion corta",
  missing_long_description: "Sin descripcion larga",
  missing_background: "Sin fondo",
  missing_screenshots: "Sin capturas",
  missing_developer: "Sin developer",
  missing_publisher: "Sin publisher",
};

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
  saleEndsAt: "",
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
    saleEndsAt: product.saleEndsAt
      ? new Date(product.saleEndsAt).toISOString().slice(0, 16)
      : "",
  };
}

function isValidImagePath(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("/") || trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

function validateDraft(draft: ProductDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < 2) errors.push("Nombre demasiado corto.");
  if (!/^[a-z0-9-]+$/.test(draft.slug.trim())) {
    errors.push("Slug inválido (usa minúsculas, números y guiones).");
  }
  if (draft.description.trim().length < 6) errors.push("Descripción demasiado corta.");
  if (!isValidImagePath(draft.coverImage)) {
    errors.push("La imagen debe ser una ruta local '/' o una URL http(s).");
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

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor" />
    </svg>
  );
}

type AdminProductsPanelProps = {
  role: AdminRole;
  isCreateOpen: boolean;
  onCreateClose: () => void;
  showEnrichment: boolean;
  enrichmentRef?: RefObject<HTMLElement | null>;
};

export function AdminProductsPanel({ role, isCreateOpen, onCreateClose, showEnrichment, enrichmentRef }: AdminProductsPanelProps) {
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
  const [isSyncingMarket, setIsSyncingMarket] = useState(false);
  const [isLoadingQuality, setIsLoadingQuality] = useState(true);
  const [isEnrichingCatalog, setIsEnrichingCatalog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CatalogSyncStatus | null>(null);
  const [catalogQuality, setCatalogQuality] = useState<CatalogQualityReport | null>(null);
  const [forceSync, setForceSync] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string | null>(null);
  const [modalDraft, setModalDraft] = useState<ProductDraft>(emptyDraft);
  const [modalNotice, setModalNotice] = useState<string>("");
  const [keysPanelSlug, setKeysPanelSlug] = useState<string | null>(null);
  const [keysData, setKeysData] = useState<KeysData | null>(null);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeysText, setNewKeysText] = useState("");
  const [addingKeys, setAddingKeys] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingModalCover, setUploadingModalCover] = useState(false);
  const modalNameInputRef = useRef<HTMLInputElement | null>(null);

  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const loadKeys = useCallback(async (slug: string) => {
    setKeysLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${slug}/keys`, { cache: "no-store" });
      const payload = (await response.json()) as KeysData & { message?: string };
      if (!response.ok) { pushToast("error", payload.message ?? "Error cargando claves."); return; }
      setKeysData(payload);
    } catch { pushToast("error", "Error de red cargando claves."); }
    finally { setKeysLoading(false); }
  }, [pushToast]);

  const openKeysPanel = useCallback((slug: string) => {
    setKeysPanelSlug(slug);
    setNewKeysText("");
    setKeysData(null);
    void loadKeys(slug);
  }, [loadKeys]);

  const closeKeysPanel = useCallback(() => {
    setKeysPanelSlug(null);
    setKeysData(null);
    setNewKeysText("");
  }, []);

  const handleAddKeys = useCallback(async () => {
    if (!keysPanelSlug || !newKeysText.trim()) return;
    setAddingKeys(true);
    try {
      const response = await fetch(`/api/admin/products/${keysPanelSlug}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: newKeysText }),
      });
      const payload = (await response.json()) as { added?: number; duplicates?: number; message?: string };
      if (!response.ok) { pushToast("error", payload.message ?? "Error añadiendo claves."); return; }
      pushToast("success", `${payload.added ?? 0} clave(s) añadida(s). ${payload.duplicates ?? 0} duplicadas omitidas.`);
      setNewKeysText("");
      void loadKeys(keysPanelSlug);
    } catch { pushToast("error", "Error de red añadiendo claves."); }
    finally { setAddingKeys(false); }
  }, [keysPanelSlug, newKeysText, loadKeys, pushToast]);

  const handleDeleteKey = useCallback(async (keyId: string) => {
    if (!keysPanelSlug) return;
    try {
      const response = await fetch(`/api/admin/keys/${keyId}`, { method: "DELETE" });
      const payload = (await response.json()) as { deleted?: boolean; message?: string };
      if (!response.ok) { pushToast("error", payload.message ?? "Error eliminando clave."); return; }
      pushToast("success", "Clave eliminada.");
      void loadKeys(keysPanelSlug);
    } catch { pushToast("error", "Error de red eliminando clave."); }
  }, [keysPanelSlug, loadKeys, pushToast]);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/products", { cache: "no-store" });
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

  const loadSyncStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products/sync-market", { cache: "no-store" });
      const payload = (await response.json()) as CatalogSyncStatus & { message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo cargar estado de sincronizacion.");
        return;
      }
      setSyncStatus(payload);
    } catch {
      pushToast("error", "Error de red cargando estado de sincronizacion.");
    }
  }, [pushToast]);

  const loadCatalogQuality = useCallback(async () => {
    try {
      setIsLoadingQuality(true);
      const response = await fetch("/api/admin/products/enrichment?limit=12", { cache: "no-store" });
      const payload = (await response.json()) as {
        report?: CatalogQualityReport;
        message?: string;
      };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo cargar auditoria de catalogo.");
        return;
      }
      setCatalogQuality(payload.report ?? null);
    } catch {
      pushToast("error", "Error de red cargando auditoria de catalogo.");
    } finally {
      setIsLoadingQuality(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadProducts();
    void loadSyncStatus();
    void loadCatalogQuality();
  }, [loadProducts, loadSyncStatus, loadCatalogQuality]);

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

  // Sube una imagen desde el equipo al endpoint admin y, si va bien, rellena
  // automáticamente el campo coverImage con la URL devuelta por el servidor.
  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/admin/product-images", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) {
        pushToast("error", payload.message ?? "No se pudo subir la imagen.");
        return;
      }
      setDraft((prev) => ({ ...prev, coverImage: payload.url as string }));
      pushToast("success", "Imagen subida. URL rellenada automáticamente.");
    } catch {
      pushToast("error", "Error de red subiendo la imagen.");
    } finally {
      setUploadingCover(false);
    }
  };

  // Igual que handleCoverUpload pero para el modal de editar: rellena
  // modalDraft.coverImage con la URL devuelta por el servidor.
  const handleModalCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadingModalCover(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/admin/product-images", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) {
        pushToast("error", payload.message ?? "No se pudo subir la imagen.");
        return;
      }
      setModalDraft((prev) => ({ ...prev, coverImage: payload.url as string }));
      pushToast("success", "Imagen subida. URL rellenada automáticamente.");
    } catch {
      pushToast("error", "Error de red subiendo la imagen.");
    } finally {
      setUploadingModalCover(false);
    }
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
          saleEndsAt: draft.saleEndsAt || null,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo crear producto.");
        return;
      }
      setDraft(emptyDraft);
      setCreateErrors([]);
      onCreateClose();
      pushToast("success", payload.message ?? "Producto creado.");
      await loadProducts();
    } catch {
      pushToast("error", "Error de red creando producto.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarketSync = async (dryRun = false) => {
    try {
      setIsSyncingMarket(true);
      const params = new URLSearchParams();
      if (dryRun) params.set("dryRun", "1");
      if (!dryRun && forceSync && role === "SUPER_ADMIN") params.set("force", "1");
      const query = params.toString();
      const response = await fetch(`/api/admin/products/sync-market${query ? `?${query}` : ""}`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        sync?: {
          created?: number;
          updated?: number;
          skipped?: number;
          enriched?: number;
          enrichmentMissingApiKey?: boolean;
        };
      };

      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo sincronizar mercado.");
        return;
      }

      const sync = payload.sync;
      pushToast(
        "success",
        sync
          ? `${dryRun ? "Previsualizacion" : "Mercado sincronizado"}: ${sync.created ?? 0} creados, ${sync.updated ?? 0} actualizados, ${sync.skipped ?? 0} omitidos, ${sync.enriched ?? 0} enriquecidos RAWG${sync.enrichmentMissingApiKey ? " (falta RAWG_API_KEY)" : ""}.`
          : payload.message ?? "Mercado sincronizado."
      );
      if (!dryRun) {
        await loadProducts();
        await loadCatalogQuality();
      }
      await loadSyncStatus();
    } catch {
      pushToast("error", "Error de red sincronizando mercado.");
    } finally {
      setIsSyncingMarket(false);
    }
  };

  const handleCatalogEnrichment = async (dryRun = false) => {
    try {
      setIsEnrichingCatalog(true);
      const params = new URLSearchParams({ limit: "12" });
      if (dryRun) params.set("dryRun", "1");
      const response = await fetch(`/api/admin/products/enrichment?${params.toString()}`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        message?: string;
        enrichment?: {
          enriched?: number;
          skipped?: number;
          missingApiKey?: boolean;
        };
        report?: CatalogQualityReport;
      };

      if (!response.ok) {
        pushToast("error", payload.message ?? "No se pudo enriquecer el catalogo.");
        return;
      }

      const enrichment = payload.enrichment;
      pushToast(
        "success",
        enrichment
          ? `${dryRun ? "Previsualizacion" : "Enriquecimiento"} RAWG: ${enrichment.enriched ?? 0} enriquecidos, ${enrichment.skipped ?? 0} omitidos${enrichment.missingApiKey ? " (falta RAWG_API_KEY)" : ""}.`
          : payload.message ?? "Enriquecimiento ejecutado."
      );
      setCatalogQuality(payload.report ?? null);
      if (!dryRun) {
        await loadProducts();
        await loadCatalogQuality();
      }
    } catch {
      pushToast("error", "Error de red enriqueciendo catalogo.");
    } finally {
      setIsEnrichingCatalog(false);
    }
  };

  const latestSync = syncStatus?.latestRun ?? null;
  const lastWriteSync = syncStatus?.lastWriteSuccess ?? null;
  const canForceSync = role === "SUPER_ADMIN" && (syncStatus?.canForce ?? true);
  const isWriteSyncDisabled =
    isSyncingMarket ||
    Boolean(syncStatus?.runningRun) ||
    (syncStatus?.canRunToday === false && !(canForceSync && forceSync));

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

  useEffect(() => {
    if (!pendingDeleteId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pendingDeleteId]);

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

  const closeCreateModal = () => {
    onCreateClose();
    setDraft(emptyDraft);
    setCreateErrors([]);
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

  useEffect(() => {
    if (!isCreateOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isCreateOpen]);

  useEffect(() => {
    if (!isCreateOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreateModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateOpen]);

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
          saleEndsAt: modalDraft.saleEndsAt || null,
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
      <CreateProductModal
        isOpen={isCreateOpen}
        draft={draft}
        setDraft={setDraft}
        uploadingCover={uploadingCover}
        onCoverUpload={(file) => void handleCoverUpload(file)}
        createErrors={createErrors}
        isSaving={isSaving}
        onSave={handleCreate}
        onClose={closeCreateModal}
      />

      <h3 className="auth-label">Productos</h3>
      <input
        className="auth-input"
        placeholder="Buscar por nombre o slug..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <div className={styles.sortBar}>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("priceOriginal")}>
          Ordenar por precio {sortColumn === "priceOriginal" ? `(${sortDirection})` : ""}
        </button>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("stock")}>
          Ordenar por stock {sortColumn === "stock" ? `(${sortDirection})` : ""}
        </button>
        <button type="button" className="button-ghost btn-padding-site" onClick={() => toggleSort("createdAt")}>
          Ordenar por fecha {sortColumn === "createdAt" ? `(${sortDirection})` : ""}
        </button>
        <button
          type="button"
          className="button-primary btn-padding-site"
          onClick={() => handleMarketSync(true)}
          disabled={isSyncingMarket}
        >
          {isSyncingMarket ? "Comprobando..." : "Previsualizar sync"}
        </button>
        <button
          type="button"
          className="button-primary btn-padding-site"
          onClick={() => handleMarketSync(false)}
          disabled={isWriteSyncDisabled}
        >
          {isSyncingMarket ? "Sincronizando..." : "Sincronizar mercado"}
        </button>
      </div>

      <div className={`auth-alt ${styles.syncStatusGrid}`}>
        {latestSync ? (
          <p className={styles.p0}>
            Ultima sync: {latestSync.status} · {new Date(latestSync.startedAt).toLocaleString("es-ES")} ·{" "}
            {latestSync.createdCount} creados, {latestSync.updatedCount} actualizados,{" "}
            {latestSync.skippedCount} omitidos.
          </p>
        ) : (
          <p className={styles.p0}>Todavia no hay sincronizaciones registradas.</p>
        )}
        {lastWriteSync && !syncStatus?.canRunToday ? (
          <p className={styles.p0}>
            Sync diaria ya ejecutada: {new Date(lastWriteSync.finishedAt ?? lastWriteSync.startedAt).toLocaleString("es-ES")}.
          </p>
        ) : null}
        {syncStatus?.runningRun ? (
          <p className={styles.p0} role="status" aria-live="polite">
            Hay una sincronizacion en curso.
          </p>
        ) : null}
        {canForceSync ? (
          <label className={styles.forceSyncLabel}>
            <input
              type="checkbox"
              checked={forceSync}
              onChange={(event) => setForceSync(event.target.checked)}
            />
            Forzar aunque ya se haya sincronizado hoy
          </label>
        ) : null}
      </div>

      {isLoading ? <p className="auth-alt">Cargando productos...</p> : null}

      {!isLoading ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Precio</th>
                <th className={styles.th}>Stock</th>
                <th className={styles.th}>Extras</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>Alta</th>
                <th className={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((product) => (
                <tr key={product.id} className={styles.tr}>
                  <td className={styles.td}>
                    <strong>{product.name}</strong>
                    <div className="auth-alt">{product.slug}</div>
                  </td>
                  <td className={styles.td}>
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
                  <td className={styles.td}>{product.stock}</td>
                  <td className={styles.tdMultiline}>
                    <div className="auth-alt">{product.platform} · {product.region}</div>
                    <div className="auth-alt">{product.storeLabel}</div>
                    <div className="auth-alt">Cashback {product.cashbackPercent}% · ♥ {product.likesCount}</div>
                  </td>
                  <td className={styles.td}>{product.isActive ? "Activo" : "Inactivo"}</td>
                  <td className={styles.td}>
                    {new Date(product.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        onClick={() => openKeysPanel(product.slug)}
                        aria-label={`Claves de ${product.name}`}
                        title="Gestionar claves"
                        className={`${styles.iconBtn} ${styles.iconBtnKeys}`}
                      >
                        <KeyIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        aria-label={`Editar ${product.name}`}
                        title="Editar"
                        className={`${styles.iconBtn} ${styles.iconBtnEdit}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(product)}
                        aria-label={`Eliminar ${product.name}`}
                        title="Eliminar"
                        className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
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
        <div className={styles.pagination}>
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

      {showEnrichment ? (
        <section ref={enrichmentRef} className={styles.enrichmentPanel}>
          <div className={styles.enrichmentHeader}>
            <div>
              <h3 className={`auth-label ${styles.enrichmentTitle}`}>
                Catalogo incompleto
              </h3>
              <p className={`auth-alt ${styles.p0}`}>
                {isLoadingQuality
                  ? "Revisando metadata..."
                  : catalogQuality
                    ? `${catalogQuality.incomplete} de ${catalogQuality.total} productos necesitan mas informacion.`
                    : "No hay auditoria disponible."}
              </p>
            </div>
            <div className={styles.enrichmentActions}>
              <button
                type="button"
                className="button-ghost btn-padding-site"
                onClick={() => loadCatalogQuality()}
                disabled={isLoadingQuality || isEnrichingCatalog}
              >
                Revisar
              </button>
              <button
                type="button"
                className="button-primary btn-padding-site"
                onClick={() => handleCatalogEnrichment(false)}
                disabled={isLoadingQuality || isEnrichingCatalog || catalogQuality?.incomplete === 0}
              >
                {isEnrichingCatalog ? "Enriqueciendo..." : "Enriquecer incompletos"}
              </button>
            </div>
          </div>

          {catalogQuality?.products.length ? (
            <div className={styles.qualityList}>
              {catalogQuality.products.slice(0, 6).map((product) => (
                <div key={product.id} className={styles.qualityItem}>
                  <div>
                    <strong>{product.name}</strong>
                    <div className="auth-alt">
                      {product.slug} · {product.storeLabel} · {product.metadataSource ?? "sin fuente"}
                    </div>
                  </div>
                  <div className={styles.qualityIssuesList}>
                    {product.issues.slice(0, 3).map((issue) => (
                      <span
                        key={`${product.id}-${issue}`}
                        className={`auth-alt ${styles.qualityIssueBadge}`}
                      >
                        {CATALOG_ISSUE_LABELS[issue]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoadingQuality ? (
            <p className={`auth-alt ${styles.p0}`}>
              Todos los productos activos tienen metadata suficiente.
            </p>
          ) : null}
        </section>
      ) : null}

      <ProductEditModal
        editingProductId={editingProductId}
        modalDraft={modalDraft}
        setModalDraft={setModalDraft}
        modalNameInputRef={modalNameInputRef}
        uploadingModalCover={uploadingModalCover}
        onCoverUpload={handleModalCoverUpload}
        modalErrors={modalErrors}
        modalNotice={modalNotice}
        savingId={savingId}
        onSave={handleModalSave}
        onClose={closeEditModal}
      />

      <KeysModal
        keysPanelSlug={keysPanelSlug}
        keysData={keysData}
        keysLoading={keysLoading}
        newKeysText={newKeysText}
        setNewKeysText={setNewKeysText}
        addingKeys={addingKeys}
        onAddKeys={() => void handleAddKeys()}
        onDeleteKey={(keyId) => void handleDeleteKey(keyId)}
        onClose={closeKeysPanel}
      />

      <DeleteProductModal
        pendingDeleteId={pendingDeleteId}
        pendingDeleteName={pendingDeleteName}
        onDelete={handleDelete}
        onClose={closeDeleteModal}
      />

      <AdminToastList toasts={toasts} />
    </div>
  );
}

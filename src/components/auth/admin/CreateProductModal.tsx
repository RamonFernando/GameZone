import { useState } from "react";
import { createPortal } from "react-dom";
import type { Dispatch, SetStateAction } from "react";
import type { ProductDraft } from "./types";
import styles from "./CreateProductModal.module.scss";

type Props = {
  isOpen: boolean;
  draft: ProductDraft;
  setDraft: Dispatch<SetStateAction<ProductDraft>>;
  uploadingCover: boolean;
  onCoverUpload: (file: File | undefined) => void;
  createErrors: string[];
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
};

export function CreateProductModal({
  isOpen,
  draft,
  setDraft,
  uploadingCover,
  onCoverUpload,
  createErrors,
  isSaving,
  onSave,
  onClose,
}: Props) {
  const [showSaleDate, setShowSaleDate] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crear producto"
      onClick={onClose}
      className={styles.overlay}
    >
      <div
        className={`card ${styles.card}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className={`auth-title ${styles.title}`}>Crear producto</h3>
        <div className="auth-form">
          <input
            className="auth-input"
            placeholder="Nombre"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="auth-input"
            placeholder="Slug (ej: cyberpunk-2077)"
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
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingCover}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onCoverUpload(file);
            }}
          />
          {uploadingCover ? <p className="auth-alt">Subiendo imagen...</p> : null}
          <div className={styles.gridThreeCols}>
            <input
              className="auth-input"
              placeholder="Plataforma"
              value={draft.platform}
              onChange={(event) => setDraft((prev) => ({ ...prev, platform: event.target.value }))}
            />
            <input
              className="auth-input"
              placeholder="Región"
              value={draft.region}
              onChange={(event) => setDraft((prev) => ({ ...prev, region: event.target.value }))}
            />
            <input
              className="auth-input"
              placeholder="Tienda / launcher"
              value={draft.storeLabel}
              onChange={(event) => setDraft((prev) => ({ ...prev, storeLabel: event.target.value }))}
            />
          </div>
          <input
            className="auth-input"
            placeholder="Subtítulo (ej: Código digital oficial)"
            value={draft.cardSubtitle}
            onChange={(event) => setDraft((prev) => ({ ...prev, cardSubtitle: event.target.value }))}
          />
          <div className={styles.gridThreeCols}>
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
              onChange={(event) => setDraft((prev) => ({ ...prev, discountPercent: event.target.value }))}
            />
            <input
              className="auth-input"
              placeholder="Stock"
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
          </div>
          <label className={`auth-alt ${styles.labelCheckbox}`}>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Producto activo
          </label>
          {showSaleDate ? (
            <div>
              <label className="auth-alt" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Fin de oferta
                <input
                  className="auth-input"
                  type="datetime-local"
                  value={draft.saleEndsAt}
                  onChange={(event) => setDraft((prev) => ({ ...prev, saleEndsAt: event.target.value }))}
                />
              </label>
              <button
                type="button"
                className="button-ghost btn-padding-site"
                onClick={() => {
                  setShowSaleDate(false);
                  setDraft((prev) => ({ ...prev, saleEndsAt: "" }));
                }}
              >
                Quitar fecha
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="button-ghost btn-padding-site"
              onClick={() => setShowSaleDate(true)}
            >
              + Añadir fecha de fin de oferta
            </button>
          )}
          {createErrors.map((error) => (
            <p key={error} className="auth-alt" role="alert">
              {error}
            </p>
          ))}
          <div className={styles.btnRow}>
            <button
              type="button"
              className={`button-primary auth-submit-compact admin-center-button ${styles.btnSave}`}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Creando..." : "Crear producto"}
            </button>
            <button
              type="button"
              className={`button-ghost button-ghost-equal admin-center-button ${styles.btnCancel}`}
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

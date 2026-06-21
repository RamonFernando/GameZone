import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ProductDraft } from "./types";
import styles from "./ProductEditModal.module.scss";

type Props = {
  editingProductId: string | null;
  modalDraft: ProductDraft;
  setModalDraft: Dispatch<SetStateAction<ProductDraft>>;
  modalNameInputRef: RefObject<HTMLInputElement | null>;
  uploadingModalCover: boolean;
  onCoverUpload: (file: File | undefined) => void;
  modalErrors: string[];
  modalNotice: string;
  savingId: string | null;
  onSave: () => void;
  onClose: () => void;
};

export function ProductEditModal({
  editingProductId,
  modalDraft,
  setModalDraft,
  modalNameInputRef,
  uploadingModalCover,
  onCoverUpload,
  modalErrors,
  modalNotice,
  savingId,
  onSave,
  onClose,
}: Props) {
  if (!editingProductId) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className={styles.overlay}
    >
      <div
        className={`card ${styles.card}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className={`auth-title ${styles.title}`}>
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
          {/* Alternativa a la URL: subir una imagen desde el equipo. Al
              subirla, rellena automáticamente el campo de arriba. */}
          <input
            className="auth-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingModalCover}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onCoverUpload(file);
            }}
          />
          {uploadingModalCover ? (
            <p className="auth-alt">Subiendo imagen...</p>
          ) : null}
          <div className={styles.gridThreeCols}>
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
          <div className={styles.gridThreeCols}>
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
          <label className={`auth-alt ${styles.labelCheckbox}`}>
            <input
              type="checkbox"
              checked={modalDraft.isActive}
              onChange={(event) =>
                setModalDraft((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Producto activo
          </label>
          <label className={`auth-alt ${styles.labelSaleDate}`}>
            Fin de oferta (opcional)
            <input
              className="auth-input"
              type="datetime-local"
              value={modalDraft.saleEndsAt}
              onChange={(event) =>
                setModalDraft((prev) => ({ ...prev, saleEndsAt: event.target.value }))
              }
            />
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
          <div className={styles.btnRow}>
            <button
              type="button"
              className={`button-primary auth-submit-compact admin-center-button button-primary-edit-product-save ${styles.btnSave}`}
              onClick={onSave}
              disabled={savingId === editingProductId}
            >
              {savingId === editingProductId ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className={`button-ghost button-ghost-equal admin-center-button button-primary-edit-product-cancel ${styles.btnCancel}`}
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

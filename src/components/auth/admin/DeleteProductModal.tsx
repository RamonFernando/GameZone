import { createPortal } from "react-dom";
import styles from "./DeleteProductModal.module.scss";

type Props = {
  pendingDeleteId: string | null;
  pendingDeleteName: string | null;
  onDelete: () => void;
  onClose: () => void;
};

export function DeleteProductModal({ pendingDeleteId, pendingDeleteName, onDelete, onClose }: Props) {
  if (typeof document === "undefined" || !pendingDeleteId) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-product-title"
      onClick={onClose}
      className={styles.overlay}
    >
      <div
        className={`card ${styles.card}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="delete-product-title" className={`auth-title ${styles.title}`}>
          Eliminar producto
        </h3>
        <p className={`auth-alt ${styles.subtitle}`}>
          {pendingDeleteName
            ? `¿Seguro que quieres eliminar "${pendingDeleteName}"?`
            : "¿Seguro que quieres eliminar este producto?"}
          {" "}
          Esta acción no se puede deshacer.
        </p>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={`button-ghost admin-center-button button-primary-edit-product-cancel ${styles.btnCancel}`}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`button-primary admin-center-button button-primary-edit-product-delete ${styles.btnConfirm}`}
            onClick={onDelete}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

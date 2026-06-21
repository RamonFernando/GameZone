import { createPortal } from "react-dom";
import type { Dispatch, SetStateAction } from "react";
import type { KeysData } from "./types";
import styles from "./KeysModal.module.scss";

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M6 7h12l-1 14H7L6 7zm4-4h4l1 2h4v2H5V5h4l1-2z" fill="currentColor" />
    </svg>
  );
}

type Props = {
  keysPanelSlug: string | null;
  keysData: KeysData | null;
  keysLoading: boolean;
  newKeysText: string;
  setNewKeysText: Dispatch<SetStateAction<string>>;
  addingKeys: boolean;
  onAddKeys: () => void;
  onDeleteKey: (keyId: string) => void;
  onClose: () => void;
};

export function KeysModal({
  keysPanelSlug,
  keysData,
  keysLoading,
  newKeysText,
  setNewKeysText,
  addingKeys,
  onAddKeys,
  onDeleteKey,
  onClose,
}: Props) {
  if (typeof document === "undefined" || !keysPanelSlug) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keys-panel-title"
      onClick={onClose}
      className={styles.overlay}
    >
      <div
        className={`card ${styles.card}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="keys-panel-title" className={`auth-title ${styles.title}`}>
          Claves de activación
        </h3>
        <p className={`auth-alt ${styles.info}`}>
          Producto: <strong>{keysPanelSlug}</strong>
          {keysData ? ` · Stock disponible: ${keysData.available}` : ""}
        </p>

        <div className={styles.addSection}>
          <p className={`auth-alt ${styles.addNote}`}>
            Añadir claves (una por línea o separadas por comas):
          </p>
          <textarea
            className={`auth-input ${styles.textarea}`}
            rows={4}
            placeholder={"XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY"}
            value={newKeysText}
            onChange={(event) => setNewKeysText(event.target.value)}
          />
          <button
            type="button"
            className={`button-primary btn-padding-site ${styles.addBtn}`}
            onClick={onAddKeys}
            disabled={addingKeys || !newKeysText.trim()}
          >
            {addingKeys ? "Añadiendo…" : "Añadir claves"}
          </button>
        </div>

        {keysLoading ? (
          <p className="auth-alt">Cargando claves…</p>
        ) : keysData && keysData.keys.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Clave</th>
                  <th className={styles.th}>Plataforma</th>
                  <th className={styles.th}>Estado</th>
                  <th className={styles.th}>Pedido</th>
                  <th className={styles.thEmpty}></th>
                </tr>
              </thead>
              <tbody>
                {keysData.keys.map((key) => (
                  <tr key={key.id} className={styles.tr}>
                    <td className={styles.tdMono}>
                      {key.assignedOrderId ? "••••••••••••••••" : key.keyCode}
                    </td>
                    <td className={styles.td}>{key.platform}</td>
                    <td className={styles.td}>
                      <span className={key.assignedOrderId ? styles.statusAssigned : styles.statusAvailable}>
                        {key.assignedOrderId ? "Asignada" : "Disponible"}
                      </span>
                    </td>
                    <td className={styles.tdOrderId}>
                      {key.assignedOrderId ? key.assignedOrderId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className={styles.td}>
                      {key.assignedOrderId === null && (
                        <button
                          type="button"
                          onClick={() => onDeleteKey(key.id)}
                          aria-label="Eliminar clave"
                          title="Eliminar clave no asignada"
                          className={styles.deleteBtn}
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : keysData ? (
          <p className="auth-alt">Sin claves para este producto.</p>
        ) : null}

        <div className={styles.closeRow}>
          <button
            type="button"
            className={`button-ghost btn-padding-site ${styles.closeBtn}`}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

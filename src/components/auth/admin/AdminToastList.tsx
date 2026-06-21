import type { ToastItem } from "./types";
import styles from "./AdminToastList.module.scss";

type Props = { toasts: ToastItem[] };

export function AdminToastList({ toasts }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

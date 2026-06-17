import type { ReactNode } from "react";
import styles from "./AuthCard.module.scss";

interface AuthCardProps {
  children: ReactNode;
  /** Envuelve los hijos en un grid de dos columnas (formulario + media) */
  withGrid?: boolean;
  /** Variante de columna única centrada (forgot-password, reset-password) */
  single?: boolean;
}

export function AuthCard({ children, withGrid = false, single = false }: AuthCardProps) {
  let inner: ReactNode;

  if (withGrid) {
    inner = <div className={styles.authGrid}>{children}</div>;
  } else if (single) {
    inner = <div className={styles.singleInner}>{children}</div>;
  } else {
    inner = children;
  }

  return (
    <div className={`card card-hover ${styles.authCard}`}>
      {inner}
    </div>
  );
}

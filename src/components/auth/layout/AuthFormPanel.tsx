import type { ReactNode } from "react";
import styles from "./AuthFormPanel.module.scss";

interface AuthFormPanelProps {
  children: ReactNode;
}

export function AuthFormPanel({ children }: AuthFormPanelProps) {
  return <div className={styles.authFormPanel}>{children}</div>;
}

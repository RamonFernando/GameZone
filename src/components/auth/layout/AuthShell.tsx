import type { ReactNode } from "react";
import styles from "./AuthShell.module.scss";

interface AuthShellProps {
  children: ReactNode;
  center?: boolean;
}

export function AuthShell({ children, center = false }: AuthShellProps) {
  return (
    <section className={`${styles.authShell}${center ? ` ${styles.center}` : ""}`}>
      {children}
    </section>
  );
}

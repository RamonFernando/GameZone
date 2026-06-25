"use client";

import { useState } from "react";
import styles from "./AdminControlClient.module.scss";
import { AdminProductsPanel } from "./AdminProductsPanel";
import { AdminUsersPanel } from "./AdminUsersPanel";

type AdminRole = "ADMIN" | "SUPER_ADMIN";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor" />
    </svg>
  );
}

export function AdminControlClient({ role }: { role: AdminRole }) {
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [showEnrichment, setShowEnrichment] = useState(false);

  return (
    <>
      <div className={styles.actionBar}>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionBtnCreate}`}
          onClick={() => setIsCreateProductOpen(true)}
        >
          <PlusIcon />
          Crear producto
        </button>
        {role === "SUPER_ADMIN" ? (
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnCreate}`}
            onClick={() => setIsCreateAdminOpen(true)}
          >
            <PlusIcon />
            Crear administrador
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.actionBtnCatalog}`}
          onClick={() => setShowEnrichment((prev) => !prev)}
        >
          <ListIcon />
          {showEnrichment ? "Ocultar catálogo" : "Catálogo incompleto"}
        </button>
      </div>

      <AdminProductsPanel
        role={role}
        isCreateOpen={isCreateProductOpen}
        onCreateClose={() => setIsCreateProductOpen(false)}
        showEnrichment={showEnrichment}
      />

      {role === "SUPER_ADMIN" ? (
        <AdminUsersPanel
          isCreateAdminOpen={isCreateAdminOpen}
          onCreateAdminClose={() => setIsCreateAdminOpen(false)}
        />
      ) : (
        <p className="auth-alt">
          Solo el super admin puede gestionar administradores.
        </p>
      )}
    </>
  );
}

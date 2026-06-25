"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./AdminUsersPanel.module.scss";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  isVerified: boolean;
  createdAt: string;
};

type Draft = {
  name: string;
  email: string;
  password: string;
};

const emptyDraft: Draft = {
  name: "",
  email: "",
  password: "",
};

type AdminUsersPanelProps = {
  isCreateAdminOpen: boolean;
  onCreateAdminClose: () => void;
};

export function AdminUsersPanel({ isCreateAdminOpen, onCreateAdminClose }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/users");
      const payload = (await response.json()) as { users?: UserRow[]; message?: string };
      if (!response.ok) {
        setMessage(payload.message ?? "No se pudieron cargar usuarios.");
        return;
      }
      setUsers(payload.users ?? []);
    } catch {
      setMessage("Error de red cargando usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!isCreateAdminOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isCreateAdminOpen]);

  useEffect(() => {
    if (!isCreateAdminOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCreateAdmin();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateAdminOpen]);

  const closeCreateAdmin = () => {
    onCreateAdminClose();
    setDraft(emptyDraft);
    setMessage("");
  };

  const handleCreateAdmin = async () => {
    try {
      setIsCreating(true);
      setMessage("");
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "No se pudo crear administrador.");
        return;
      }

      onCreateAdminClose();
      setDraft(emptyDraft);
      setMessage(payload.message ?? "Administrador creado.");
      await loadUsers();
    } catch {
      setMessage("Error de red creando administrador.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleAdmin = async (user: UserRow) => {
    if (user.role === "SUPER_ADMIN") {
      return;
    }

    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";

    try {
      setUpdatingUserId(user.id);
      setMessage("");
      const response = await fetch(`/api/admin/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(payload.message ?? "No se pudo cambiar el rol.");
        return;
      }

      setMessage(payload.message ?? "Rol actualizado.");
      await loadUsers();
    } catch {
      setMessage("Error de red cambiando rol.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="auth-form">
      {isCreateAdminOpen ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crear administrador"
          onClick={closeCreateAdmin}
          className={styles.overlay}
        >
          <div
            className={`card ${styles.modalCard}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="auth-title" style={{ marginBottom: 8 }}>Crear administrador</h3>
            <div className="auth-form">
              <input
                className="auth-input"
                placeholder="Nombre"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="auth-input"
                placeholder="Email"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                className="auth-input"
                type="password"
                placeholder="Contraseña temporal"
                value={draft.password}
                onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
              />
              {message ? <p className="auth-alt" role="alert">{message}</p> : null}
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className="button-primary button-admin-modal-save"
                  onClick={handleCreateAdmin}
                  disabled={isCreating}
                >
                  {isCreating ? "Creando..." : "Crear administrador"}
                </button>
                <button
                  type="button"
                  className="button-ghost button-admin-modal-cancel"
                  onClick={closeCreateAdmin}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      <h3 className="auth-label">Usuarios del sistema</h3>
      {message ? <p className="auth-alt">{message}</p> : null}
      {isLoading ? <p className="auth-alt">Cargando usuarios...</p> : null}

      {!isLoading ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nombre</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Rol</th>
                <th className={styles.th}>Verificado</th>
                <th className={styles.th}>Alta</th>
                <th className={styles.th}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isUpdating = updatingUserId === user.id;
                const isSuperAdmin = user.role === "SUPER_ADMIN";
                const isAdmin = user.role === "ADMIN";
                const roleLabel = isSuperAdmin ? "Super admin" : isAdmin ? "Admin" : "Usuario";

                return (
                  <tr key={user.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong>{user.name}</strong>
                    </td>
                    <td className={styles.td}>{user.email}</td>
                    <td className={styles.td}>{roleLabel}</td>
                    <td className={styles.td}>{user.isVerified ? "Si" : "No"}</td>
                    <td className={styles.td}>
                      {new Date(user.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className={styles.td}>
                      {isSuperAdmin ? (
                        <span className="auth-alt">Bloqueado</span>
                      ) : (
                        <button
                          type="button"
                          className={`button-ghost btn-padding-site${isAdmin ? ` ${styles.btnAdminActive}` : ""}`}
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isUpdating || updatingUserId !== null}
                          aria-pressed={isAdmin}
                          title={
                            isAdmin
                              ? "Administrador — pulsa para revocar el rol"
                              : "Usuario — pulsa para conceder el rol de administrador"
                          }
                        >
                          {isUpdating ? "Actualizando..." : isAdmin ? "Admin" : "No admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

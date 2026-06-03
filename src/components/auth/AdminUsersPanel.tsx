"use client";

import { useEffect, useState } from "react";

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

export function AdminUsersPanel() {
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

      setMessage(payload.message ?? "Administrador creado.");
      setDraft(emptyDraft);
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
      <h3 className="auth-label">Crear administrador</h3>
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
        placeholder="Contrasena temporal"
        value={draft.password}
        onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
      />
      <button
        type="button"
        className="button-primary auth-submit-compact admin-center-button btn-padding-site"
        onClick={handleCreateAdmin}
        disabled={isCreating}
      >
        {isCreating ? "Creando..." : "Crear administrador"}
      </button>

      <h3 className="auth-label">Usuarios del sistema</h3>
      {message ? <p className="auth-alt">{message}</p> : null}
      {isLoading ? <p className="auth-alt">Cargando usuarios...</p> : null}

      {!isLoading ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Email</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Rol</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Verificado</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Alta</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isUpdating = updatingUserId === user.id;
                const isSuperAdmin = user.role === "SUPER_ADMIN";
                const actionLabel = user.role === "ADMIN" ? "Quitar admin" : "Hacer admin";

                return (
                  <tr key={user.id} style={{ borderTop: "1px solid rgba(148,163,184,0.2)" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <strong>{user.name}</strong>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{user.email}</td>
                    <td style={{ padding: "10px 12px" }}>{user.role}</td>
                    <td style={{ padding: "10px 12px" }}>{user.isVerified ? "Si" : "No"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {new Date(user.createdAt).toLocaleDateString("es-ES")}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {isSuperAdmin ? (
                        <span className="auth-alt">Bloqueado</span>
                      ) : (
                        <button
                          type="button"
                          className="button-ghost btn-padding-site"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isUpdating || updatingUserId !== null}
                        >
                          {isUpdating ? "Actualizando..." : actionLabel}
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

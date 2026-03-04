// Panel de administración de usuarios: listado y creación de nuevos administradores.
"use client";

import { useEffect, useState } from "react";

// Fila de usuario con datos básicos y rol dentro del sistema.
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  isVerified: boolean;
  createdAt: string;
};

// Borrador del formulario para crear administradores.
type Draft = {
  name: string;
  email: string;
  password: string;
};

// Estado inicial vacío del borrador de administrador.
const emptyDraft: Draft = {
  name: "",
  email: "",
  password: "",
};

// Componente que lista usuarios y permite crear nuevos administradores.
export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  return (
    <div className="auth-form">
      <h3 className="auth-label">Crear administrador (solo super admin)</h3>
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
        placeholder="Contraseña temporal"
        value={draft.password}
        onChange={(event) => setDraft((prev) => ({ ...prev, password: event.target.value }))}
      />
      <button
        type="button"
        className="button-primary auth-submit-compact admin-center-button btn-padding-site"
        onClick={handleCreateAdmin}
        disabled={isSaving}
      >
        {isSaving ? "Guardando..." : "Crear / Promover a ADMIN"}
      </button>

      <h3 className="auth-label">Usuarios del sistema</h3>
      {isLoading ? <p className="auth-alt">Cargando usuarios...</p> : null}
      {!isLoading ? (
        <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Nombre</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Email</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Rol</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Verificado</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Alta</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {message ? <p className="auth-alt">{message}</p> : null}
    </div>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminProductsPanel } from "@/components/auth/AdminProductsPanel";
import { AdminUsersPanel } from "@/components/auth/AdminUsersPanel";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getActiveSessionFromToken } from "@/lib/auth/session-server";
import "../../../styles/auth.scss";

export default async function AdminControlPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth?next=/admin/control");
  }

  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect("/account");
  }

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-form-panel">
          <header className="auth-header">
            <p className="auth-kicker">Admin Console</p>
            <h1 className="auth-title">Panel de control</h1>
            <p className="auth-subtitle">
              Gestiona productos, precios, descuentos y administradores.
            </p>
          </header>

          <AdminProductsPanel />
          {session.role === "SUPER_ADMIN" ? (
            <AdminUsersPanel />
          ) : (
            <p className="auth-alt">
              Solo el super admin puede gestionar administradores.
            </p>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/admin/orders" className="button-ghost btn-padding-site">
              Ver panel de pedidos
            </Link>
            <Link href="/account" className="button-ghost btn-padding-site">
              Volver a mi cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

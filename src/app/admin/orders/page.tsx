import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminOrdersPanel } from "@/components/auth/AdminOrdersPanel";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getActiveSessionFromToken } from "@/lib/auth/session-server";
import "../../../styles/auth.scss";

export default async function AdminOrdersPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth?next=/admin/orders");
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
            <h1 className="auth-title">Pedidos del sistema</h1>
            <p className="auth-subtitle">
              Auditoría de transacciones con filtros por estado y pasarela.
            </p>
          </header>

          <AdminOrdersPanel />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/admin/control" className="button-ghost btn-padding-site">
              Ir a panel de control
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

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminControlClient } from "@/components/auth/AdminControlClient";
import { SESSION_COOKIE_NAME } from "@/services/auth/session";
import { getActiveSessionFromToken } from "@/services/auth/session-server";
import { AuthShell } from "@/components/auth/layout/AuthShell";
import { AuthCard } from "@/components/auth/layout/AuthCard";
import { AuthFormPanel } from "@/components/auth/layout/AuthFormPanel";
import "../../../styles/auth.scss";
import "../../../styles/account.scss";

export default async function AdminControlPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth?next=/admin/control");
  }

  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
    redirect("/account");
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthFormPanel>
          <header className="auth-header">
            <p className="auth-kicker">Admin Console</p>
            <h1 className="auth-title">Panel de control</h1>
            <p className="auth-subtitle">
              Gestiona productos, precios, descuentos y administradores.
            </p>
          </header>

          <AdminControlClient role={session.role} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/admin/orders" className="button-ghost btn-padding-site">
              Ver panel de pedidos
            </Link>
            <Link href="/account" className="button-ghost btn-padding-site">
              Volver a mi cuenta
            </Link>
          </div>
        </AuthFormPanel>
      </AuthCard>
    </AuthShell>
  );
}

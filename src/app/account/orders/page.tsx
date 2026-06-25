import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountOrdersHistory } from "@/components/auth/AccountOrdersHistory";
import { SESSION_COOKIE_NAME } from "@/services/auth/session";
import { getActiveSessionFromToken } from "@/services/auth/session-server";
import { AuthShell } from "@/components/auth/layout/AuthShell";
import { AuthCard } from "@/components/auth/layout/AuthCard";
import { AuthFormPanel } from "@/components/auth/layout/AuthFormPanel";
import "../../../styles/auth.scss";
import "../../../styles/account.scss";

export default async function AccountOrdersPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth");
  }

  return (
    <AuthShell>
      <AuthCard>
        <AuthFormPanel>
          <header className="auth-header">
            <p className="auth-kicker orders-kicker-row">
              GameZone Access
              <Link href="/account" className="button-ghost btn-padding-site orders-back-mobile">
                ← Volver
              </Link>
            </p>
            <h1 className="auth-title">Historial de compras</h1>
            <div className="orders-subtitle-row">
              <p className="auth-subtitle">
                Consulta todas tus compras con el nombre del juego, fecha y precio pagado.
              </p>
              <Link href="/account" className="button-ghost btn-padding-site orders-back-desktop">
                ← Volver
              </Link>
            </div>
          </header>

          <AccountOrdersHistory />

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link href="/account" className="button-ghost btn-padding-site">
              Volver a mi cuenta
            </Link>
          </div>
        </AuthFormPanel>
      </AuthCard>
    </AuthShell>
  );
}

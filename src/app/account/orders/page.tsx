import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountOrdersHistory } from "@/components/auth/AccountOrdersHistory";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getActiveSessionFromToken } from "@/lib/auth/session-server";
import "../../../styles/auth.scss";

export default async function AccountOrdersPage() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth");
  }

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-form-panel">
          <header className="auth-header">
            <p className="auth-kicker">GameZone Access</p>
            <h1 className="auth-title">Historial de compras</h1>
            <p className="auth-subtitle">
              Consulta todas tus compras con el nombre del juego, fecha y precio pagado.
            </p>
          </header>

          <AccountOrdersHistory />
        </div>
      </div>
    </section>
  );
}

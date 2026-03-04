import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountDashboard } from "@/components/auth/AccountDashboard";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionRefresher } from "@/components/auth/SessionRefresher";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getActiveSessionFromToken } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";
import { getUserById } from "@/lib/auth/store";
import "../../styles/auth.scss";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { order?: string };
}) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? await getActiveSessionFromToken(sessionToken) : null;

  if (!session) {
    redirect("/auth");
  }

  const user = await getUserById(session.userId);
  const sessionDisplayName = user?.name?.trim() || session.email;
  const latestPaidOrder = await prisma.order.findFirst({
    where: {
      userId: session.userId,
      status: "paid",
    },
    include: {
      items: {
        orderBy: {
          id: "asc",
        },
        take: 1,
      },
    },
    orderBy: {
      paidAt: "desc",
    },
  });
  const latestGameSlug = latestPaidOrder?.items[0]?.gameSlug;
  const latestPurchasedProduct = latestGameSlug
    ? await prisma.product.findUnique({
        where: { slug: latestGameSlug },
        select: {
          coverImage: true,
          name: true,
        },
      })
    : null;
  const latestPurchasedCover = latestPurchasedProduct?.coverImage ?? null;
  const latestPurchasedName = latestPurchasedProduct?.name ?? "Último juego comprado";
  const dynamicMediaBackground = latestPurchasedCover
    ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.15), rgba(15, 23, 42, 0.88)),
       radial-gradient(circle at top left, rgba(124, 58, 237, 0.45), transparent 55%),
       url("${latestPurchasedCover}")`
    : undefined;

  const avatarInitial =
    (sessionDisplayName?.trim().charAt(0).toUpperCase() || "G") ?? "G";
  const avatarStyle =
    user?.avatarUrl && user.avatarUrl.trim().length > 0
      ? {
          backgroundImage: `url("${user.avatarUrl}")`,
          color: "transparent",
        }
      : undefined;

  return (
    <section className="auth-shell">
      <div className="card card-hover auth-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <div className="account-avatar-header">
              <header className="auth-header">
                <p className="auth-kicker">GameZone Access</p>
                <h1 className="auth-title">Mi cuenta</h1>
                <p className="auth-subtitle">
                  Sesión iniciada como <strong>{sessionDisplayName}</strong>.
                </p>
              </header>
              <div className="account-avatar-circle" style={avatarStyle}>
                {!avatarStyle ? avatarInitial : null}
              </div>
            </div>

            <div className="auth-form">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="/" className="button-primary auth-submit-compact btn-padding-site">
                  Ir a comprar juegos
                </Link>
                <Link href="/account/orders" className="button-primary auth-submit-compact btn-padding-site">
                  Historial de compras
                </Link>
              </div>
              {searchParams?.order ? (
                <p className="auth-alt" role="status" aria-live="polite">
                  Pedido completado: #{searchParams.order.slice(0, 8)}.
                </p>
              ) : null}
              {(session.role === "ADMIN" || session.role === "SUPER_ADMIN") ? (
                <p className="auth-alt">
                  Panel admin:{" "}
                  <Link href="/admin/orders" className="auth-link">
                    ver pedidos globales
                  </Link>
                </p>
              ) : null}
              {(session.role === "ADMIN" || session.role === "SUPER_ADMIN") ? (
                <p className="auth-alt">
                  Panel de control:{" "}
                  <Link href="/admin/control" className="auth-link">
                    gestionar productos y admins
                  </Link>
                </p>
              ) : null}
            </div>

            <AccountDashboard />
            <LogoutButton />
            <SessionRefresher />
          </div>

          <div className="auth-media-panel">
            <div className="auth-media-inner">
              <div
                className="auth-media-gradient"
                style={dynamicMediaBackground ? { backgroundImage: dynamicMediaBackground } : undefined}
              />
              <div className="auth-media-brand">
                <span className="auth-media-tag">MY PROFILE</span>
                <span className="auth-media-text">
                  {latestPurchasedCover
                    ? `Tu último juego comprado: ${latestPurchasedName}.`
                    : "Gestiona tu cuenta y accede de forma segura a tus próximas secciones privadas."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

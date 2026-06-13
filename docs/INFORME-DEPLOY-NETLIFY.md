# Informe de Deploy — GameZone (GameStopV4)

**Fecha:** 13/06/2026 · **Rama:** `dev-13062026` → `main` · **Autor:** Claude (auditor)

> Para GPT (revisor) y Ramón (ejecutor del merge y deploy).
> Este documento es la fuente de verdad antes de subir a producción.
> **No hacer el merge sin completar la sección B de pre-deploy.**

---

## 1. Estado de ramas

| Rama | Último commit | Estado |
|---|---|---|
| `main` | `ca76bcc` (12/06) | Producción actual |
| `dev-13062026` | `f96c7bf` (13/06) | Lista para merge — 34 archivos sobre main |
| `dev-13062026-claude` | `3a45ebc` | Integrada en dev-13062026 ✅ |
| `dev-13062026-gpt` | `dc5bf61` | Integrada en dev-13062026 ✅ |

**Diferencia dev-13062026 vs main (34 archivos, ~3900 líneas):**

```
.github/workflows/ci.yml         ← Lighthouse CI añadido
.lighthouserc.js                 ← Lighthouse presupuesto
prisma/schema.prisma             ← Modelo AuditLog añadido
prisma/migrations/20260613.../   ← Migración AuditLog (YA aplicada en Neon ✅)
src/lib/audit-log.ts             ← Helper logAudit()
src/lib/audit-log.test.ts        ← 8 tests
src/lib/products.test.ts         ← 22 tests
playwright.config.ts + e2e/      ← 3 specs E2E
package.json                     ← devDependencies: @playwright/test, @lhci/cli
14 rutas API                     ← Instrumentadas con logAudit()
src/app/api/payments/stripe/webhook/route.ts ← logAudit ORDER_PAID
docs/                            ← Historial, plan, este informe
```

---

## 2. Verificaciones ya ejecutadas (DoD 3.1)

| Comando | Resultado | Ejecutado por |
|---|---|---|
| `npx tsc --noEmit` | ✅ | GPT (13/06) |
| `npx vitest run` | ✅ 76/76 tests | GPT (13/06) |
| `npx next build` | ✅ | GPT (13/06) |
| `npm run build` | ⚠️ Solo falla por lock Prisma DLL en Windows/Dropbox — no es bug de código | Local |
| `npx prisma migrate deploy` | ✅ Aplicada en Neon producción | Claude (13/06) |
| `npx playwright install chromium` | ✅ | Claude (13/06) |

---

## 3. Checklist pre-deploy

### A — Verificaciones de código (hacer antes del merge)

- [ ] **ESLint limpio:** `npx eslint . --max-warnings 0`
  > El CI falla si hay warnings. Había 2 warnings pendientes del 11/06 (react-hooks/exhaustive-deps + variable sin uso en MarketIntelligenceSections.tsx). Verificar si fueron resueltos.

- [ ] **Build limpio en entorno limpio** (sin Dropbox/DLL lock):
  ```bash
  npx tsc --noEmit && npx vitest run && npx next build
  ```

### B — Acciones manuales del usuario (BLOQUEANTES) 🔴

- [ ] **B1 — Rotación de secretos** ← CRÍTICO, hacer antes del deploy
  Los secretos siguientes deben regenerarse porque convivieron con el `.db` filtrado:
  - `SESSION_SECRET` → regenerar (mínimo 32 chars aleatorios)
  - `ENCRYPTION_KEY` → regenerar (`node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`)
  - `CRON_SECRET` → regenerar
  - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → en dashboard Stripe
  - `PAYPAL_CLIENT_SECRET` → en dashboard PayPal
  - `GOOGLE_CLIENT_SECRET` → en Google Cloud Console
  - `FACEBOOK_CLIENT_SECRET` → en Meta for Developers
  - SMTP credentials → en panel del proveedor
  - Después: redeploy en Netlify + forzar reset de contraseña a usuarios del `.db` antiguo

- [ ] **B2 — DATABASE_URL pooled en Netlify**
  En Netlify → Site settings → Environment variables:
  - `DATABASE_URL` debe ser la URL **pooled** de Neon (formato `ep-xxx.eu-west-1.aws.neon.tech`, sin `/api/v2/...`)
  - `DATABASE_URL_UNPOOLED` puede quedar como directa (para migrations, no se usa en runtime)
  > Sin la URL pooled, las funciones serverless de Netlify agotan las conexiones bajo carga.

- [ ] **B3 — Backup de Neon antes del deploy**
  ```bash
  pg_dump $DATABASE_URL_UNPOOLED > backup-pre-deploy-13062026.sql
  ```
  O usar el panel de Neon → Branches → crear branch snapshot.

---

## 4. Variables de entorno en Netlify (verificar todas)

> Netlify → Site configuration → Environment variables

| Variable | Requerida | Nota |
|---|---|---|
| `DATABASE_URL` | 🔴 Obligatoria | URL **pooled** de Neon |
| `DATABASE_URL_UNPOOLED` | 🟡 Opcional | Solo para migrations manuales |
| `APP_BASE_URL` | 🔴 Obligatoria | `https://tu-dominio.netlify.app` (o dominio propio) |
| `SESSION_SECRET` | 🔴 Obligatoria | ≥32 chars aleatorios, ROTAR antes del deploy |
| `ENCRYPTION_KEY` | 🔴 Obligatoria | 32 bytes en base64, ROTAR antes del deploy |
| `CRON_SECRET` | 🔴 Obligatoria | Para el endpoint del cron de Netlify |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | 🔴 Para email | Sin esto: registro, 2FA por email y reset de contraseña no envían |
| `SMTP_FROM` | 🟡 | `no-reply@tu-dominio.com` |
| `STRIPE_SECRET_KEY` | 🔴 Para pagos | Clave de producción (no `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | 🔴 Para pagos | Registrar webhook en Stripe → URL: `https://tu-app/api/payments/stripe/webhook` |
| `PAYPAL_CLIENT_ID` | 🔴 Para pagos | Credencial producción |
| `PAYPAL_CLIENT_SECRET` | 🔴 Para pagos | ROTAR |
| `PAYPAL_ENV` | 🔴 | `live` (no `sandbox`) |
| `PAYPAL_WEBHOOK_ID` | 🔴 Para pagos | ID del webhook registrado en PayPal |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 🟠 OAuth Google | Sin esto: login con Google desactivado |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` / `FACEBOOK_CONFIG_ID` | 🟠 OAuth Facebook | Sin esto: login con Facebook desactivado |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | 🔵 Opcional | Sin esto: login con Twitter desactivado |
| `SENTRY_DSN` | 🟡 Recomendado | Sin esto Sentry no inicializa, app funciona igual |
| `RAWG_API_KEY` | 🔵 Opcional | Para enriquecimiento de metadatos de juegos |
| `ENABLE_MASTER_ADMIN` | 🟡 | `true` solo en primer deploy; luego eliminar o poner `false` |
| `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD` | 🟡 | Solo si ENABLE_MASTER_ADMIN=true |
| `NEXT_PUBLIC_SITE_URL` | 🟡 | Igual que APP_BASE_URL pero público (para client-side) |

---

## 5. Procedimiento de merge y deploy

```bash
# 1. Asegurarse de estar en dev-13062026 limpia
git checkout dev-13062026
git status  # debe estar limpia

# 2. Merge a main (no fast-forward para conservar historial)
git checkout main
git merge --no-ff dev-13062026 -m "merge: integrar dev-13062026 en main (C1 audit log, C2 E2E, C3 tests, G1 Lighthouse CI)"

# 3. Verificar build post-merge
npx tsc --noEmit && npx vitest run && npx next build

# 4. Push (triggea CI + deploy en Netlify)
git push origin main
```

> Netlify detecta el push a `main` y lanza el build automáticamente.
> El CI de GitHub Actions también se disparará — verificar que pase antes de considerar el deploy correcto.

---

## 6. Verificación post-deploy (manual)

Abrir la URL de Netlify en modo incógnito y verificar:

- [ ] Home carga con productos (SSR correcto, no pantalla en blanco)
- [ ] Registro de usuario nuevo → email de verificación llega
- [ ] Login correcto → sesión persiste tras recarga
- [ ] Añadir al carrito → persiste tras recarga
- [ ] Checkout Stripe → formulario de pago aparece (no necesario completar con tarjeta real)
- [ ] Consola del navegador → sin errores CSP (cabeceras de seguridad 7.1)
- [ ] `<html lang="es">` en el fuente de la página (8.4)
- [ ] `/api/health` o `/api/cron/cleanup` con `CRON_SECRET` → responde 200

---

## 7. Riesgos conocidos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Secrets no rotados → sesiones antiguas válidas | Alto si no se rota | Crítico | Rotar antes del merge (B1) |
| DATABASE_URL no pooled → connection exhaustion | Medio | Alto | Verificar en Netlify (B2) |
| ESLint con warnings → CI falla en push a main | Medio | Bloqueante (CI) | Ejecutar lint localmente antes del merge |
| Prisma DLL lock en build de Netlify | Bajo (solo ocurre en Windows/Dropbox local) | Ninguno en CI/Netlify | No aplicable en Netlify |
| AuditLog en Neon — migración ya aplicada | — | Bajo | Migración ya desplegada; `migrate deploy` no hace nada si ya está |
| OAuth redirects apuntan a `localhost` | Alto si no se actualiza | Login social roto | Actualizar redirect URIs en Google/Facebook/Twitter con la URL de producción |

---

## 8. Post-deploy pendiente (no bloqueante)

- Configurar monitor de uptime (UptimeRobot gratis) sobre la home
- Activar alertas de Sentry para errores nuevos en producción
- Dominio propio (4.2/8.5) — actualizar `APP_BASE_URL` + redirect URIs OAuth + webhooks Stripe/PayPal
- Confirmar plan de backup en Neon (10.4)

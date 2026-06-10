# Traspaso para Sonnet — tareas 3.5, 3.3 y 3.2

> Contexto: GameZone (Next.js App Router + Prisma + PostgreSQL/Neon). El plan de
> auditoría está en `docs/PLAN-MEJORAS-AUDITORIA.md`. Tareas 1.1, 1.2, 2.1 y 3.1 ya
> hechas. Estas tres son **no críticas** (calidad/observabilidad/escala).
>
> **Convenciones del repo (respetar):**
> - Commits: `tipo: descripción en minúsculas sin punto + DDMMYYYY` (ej. `feat: ... 11062026`). Tipos: `feat`, `fix`, `docs`.
> - Tras cada tarea: `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build` (todo en verde).
> - **Nunca commitear `.env`** (está en `.gitignore`). Tampoco `prisma/dev.db*` ni backups.
> - En Windows, si `build`/`migrate` dan `EPERM` sobre `query_engine-windows.dll.node`: parar `npm run dev`, repetir, rearrancar.
> - Un commit por tarea. Push al final (o cuando lo pida el usuario).

---

## 3.5 — Tests de integración

**Objetivo:** cubrir flujos que cruzan varias piezas, no solo funciones sueltas.

**Setup actual:** Vitest, entorno `node`, patrón `src/**/*.test.ts` (ver `vitest.config.ts`). Hay 17 tests unitarios. Alias `@` → `src`.

**Qué cubrir (prioridad):**
1. **Idempotencia de webhooks** (lo más valioso):
   - Stripe (`src/app/api/payments/stripe/webhook/route.ts`) y PayPal (`src/app/api/payments/paypal/webhook/route.ts`).
   - Invariante: si llega el MISMO evento dos veces, el pedido se marca `paid` una sola vez, NO se envía 2 veces el email de confirmación, y no se duplican efectos.
   - La lógica de marcar pagado vive en `src/lib/checkout/order-service.ts` (`completePaidOrder`). Revisar si ya hay guarda de idempotencia (p. ej. no re-procesa si `status === "paid"` o si `confirmationEmailSentAt` ya está). Testear esa guarda.
2. **Flujo de checkout manual completo:** `createPendingOrder` → `completePaidOrder` (en `order-service.ts`): que el total se calcula bien, el pedido nace `pending` y pasa a `paid`, y se crean los `OrderItem`.
3. **Rotación de sesión:** `src/lib/auth/session-server.ts` / `session.ts`. Que al rotar token la sesión vieja queda revocada y la nueva es válida.

**Decisión de enfoque (elegir una, recomiendo la primera):**
- **(A) Tests a nivel de servicio con Prisma mockeado** (`vi.mock("@/lib/prisma")`): rápidos, sin BD, deterministas. Ideal para idempotencia y cálculo de totales.
- **(B) Tests contra una BD de test real** (otra DB Neon o SQLite de test): más fieles pero más lentos y con setup. NO usar la BD de producción/dev.

> Nota: ya existen scripts E2E (`npm run e2e:checkout`, `e2e:stripe`, `e2e:paypal`) que pegan a un servidor vivo — son complementarios, no sustituyen estos tests de integración.

**Hecho cuando:** hay tests nuevos verdes que fallarían si se rompe la idempotencia de webhooks o el cálculo del pedido.

---

## 3.3 — Logging / Sentry

**Parte A — logging consistente (rápido, sin cuentas):**
- Solo hay **2 catches silenciosos**, ambos en `src/app/api/payments/paypal/webhook/route.ts` (líneas ~32 y ~61: `.catch(() => false)` y `.catch(() => null)`).
- Cambiarlos para que registren con el `logger` existente (`import { logger } from "@/lib/logger"`) antes de devolver el fallback, p. ej. `logger.error("...", { err })`. NO cambiar el comportamiento de fallback, solo añadir el log.
- Revisar también `order-service.ts` y los webhooks por otros errores tragados en silencio.

**Parte B — Sentry (requiere cuenta del usuario):**
- ⚠️ **Decisión/acción del usuario:** crear proyecto en Sentry y dar el `SENTRY_DSN`. Sin DSN, dejar la integración inerte (no rompe nada).
- Instalar `@sentry/nextjs` (con `--ignore-scripts` para no disparar `prisma generate` si el dev server corre). Ejecutar el wizard o crear manualmente los archivos de config (`sentry.client.config.ts`, `sentry.server.config.ts`, instrumentación). Inicializar solo si `SENTRY_DSN` está definido.
- Añadir `SENTRY_DSN` a `.env.example` (vacío) y al checklist de `docs/NETLIFY-DEPLOY.md`.
- Considerar añadirlo a `RECOMMENDED_VARS` en `src/lib/env.ts` (opcional).

**Hecho cuando:** los catches silenciosos registran por logger; Sentry inicializa cuando hay DSN y no estorba cuando no lo hay.

---

## 3.2 — Rate limit distribuido con Upstash (OPCIONAL)

> El rate limit actual (`src/lib/auth/rate-limit.ts`) ya es atómico y persistente en BD (`RateLimitBucket`), con fail-open. Funciona. Esta tarea es solo para escala; **no es bloqueante**. Confirmar con el usuario si merece la pena ahora.

- ⚠️ **Decisión/acción del usuario:** crear base Upstash Redis y dar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
- Instalar `@upstash/ratelimit` y `@upstash/redis`.
- Reescribir `enforceRateLimit` para usar Upstash cuando las env vars existan, y **mantener el fallback a `RateLimitBucket`** (BD) si no están configuradas, para no romper local/dev. Conservar la firma actual y los 5 scopes (`register`, `verify`, `resend`, `login`, `2fa-verify`) con sus límites/ventanas.
- Añadir las env vars a `.env.example` y a `docs/NETLIFY-DEPLOY.md`.
- Tras migrar, la tabla `RateLimitBucket` puede quedarse como fallback (no borrar el modelo).

**Hecho cuando:** con env vars de Upstash, el rate limit usa Redis; sin ellas, sigue usando la BD igual que ahora.

---

## Resumen de cuentas/secretos que necesita el usuario

| Tarea | Necesita del usuario |
|---|---|
| 3.5 | Nada (si se usa enfoque A con mocks) |
| 3.3 | `SENTRY_DSN` (crear proyecto Sentry) — opcional, la parte de logging no lo necesita |
| 3.2 | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (crear base Upstash) |

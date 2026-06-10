# Plan de mejoras y auditoría — GameZone (GameStopV4)

> Documento de trabajo para implementación. Auditoría realizada sobre el estado del repo
> a fecha 2026-06-10. Pensado para ejecutarse por fases. Cada tarea indica severidad,
> archivos afectados y criterio de "hecho".
>
> **Contexto para quien implemente (Sonnet 4.6):** Proyecto Next.js 16 (App Router) + Prisma +
> SQLite, auth propio con HMAC, 2FA (email/TOTP/push), pagos Stripe + PayPal. Objetivo final:
> desplegar en **Netlify**. NO romper los flujos de auth ni de pago existentes. Ejecutar
> `npx tsc --noEmit` + `npx vitest run` + `npm run build` tras cada fase.

---

## ESTADO DEL PLAN (actualizado 2026-06-10)

Leyenda: ✅ hecho · ⚠️ hecho parcial / pendiente acción manual · ⬜ pendiente

| Tarea | Estado |
|---|---|
| 0.1 — Eliminar `.db` del historial de Git | ✅ hecho (purgado + force-push de `main` y 2 ramas backup; **rotación de secretos/reset de contraseñas pendiente, manual**) |
| 0.2 — Sin secretos hardcodeados | ✅ verificado (fallbacks dev lanzan error en prod) |
| 1.1 — SQLite → PostgreSQL | ✅ hecho (Neon, Frankfurt; esquema migrado + 67 productos/5 users/58 pedidos/etc. copiados con conteos verificados). **Pendiente Netlify: usar URL pooled (`-pooler`) en `DATABASE_URL` de producción** |
| 1.2 — Avatares a blob storage | ✅ hecho (guardados como `Bytes` en Postgres, tabla `UserAvatar`; servidos por `GET /api/account/avatar/[userId]`; límite 2 MB + validación magic bytes + resize 256×256 webp con sharp; 3 avatares existentes migrados) |
| 1.3 — Cron en Netlify | ✅ hecho (`netlify/functions/sync-catalogs.mts`, schedule `0 5 * * *`) |
| 1.4 — Runtime Next.js en Netlify | ✅ hecho (`netlify.toml` + `@netlify/plugin-nextjs`). Revisar `instrumentation.ts` en serverless |
| 1.5 — Geo sin fetch externo | ✅ hecho (usa cabecera `x-nf-geo-country`, sin llamada a ipapi.co) |
| 2.1 — Cifrar `totpSecret` | ✅ hecho (AES-256-GCM en `src/lib/crypto/totp-secret.ts`, env `ENCRYPTION_KEY`; cifra en enable, descifra en verify; secreto existente re-cifrado; fallback a texto plano legado; con tests) |
| 2.2 — Reducir tolerancia TOTP | ✅ hecho (`epochTolerance: 1` en enable y verify) |
| 2.3 — Rate limit en 2FA/TOTP verify | ✅ hecho (scope `2fa-verify`, 5/10min, aplicado en ambos endpoints) |
| 2.4 — Cabeceras de seguridad HTTP | ✅ hecho (CSP, X-Frame, HSTS, etc. en `next.config.mjs`) |
| 2.5 — Validar `event.type` en webhooks | ✅ hecho (`HANDLED_TYPES` guard en Stripe y PayPal) |
| 3.1 — Zod en bodies de API | ✅ hecho (zod instalado; helper `src/lib/validation.ts`; aplicado a las 24 rutas con body JSON: auth, account, cart, checkout, payments, admin; webhooks usan body crudo, no aplica; con tests) |
| 3.2 — Rate limit distribuido (Upstash) | ⬜ pendiente (opcional) |
| 3.3 — Logging / Sentry | ⬜ pendiente |
| 3.4 — CI GitHub Actions | ✅ hecho (`.github/workflows/ci.yml`: tsc + vitest + build) |
| 3.5 — Tests de integración | ⬜ pendiente |

**Bloqueadores de deploy en Netlify RESUELTOS:** 1.1 (Postgres) ✅ y 1.2 (avatares) ✅. Ya no quedan bloqueadores de runtime. Pendiente operativo antes de producción: usar URL **pooled** (`-pooler`) en `DATABASE_URL` de Netlify (ahora apunta a la directa), y rotación de secretos de la tarea 0.1.

---

## FASE 0 — CRÍTICO INMEDIATO (hacer antes que nada)

### 0.1 — Eliminar la base de datos real del historial de Git  🔴 CRÍTICO  ✅ HECHO (git) / ⚠️ rotación manual pendiente
- **Problema:** `backups/dev-pre-api-info-2026-06-02.db` está trackeado en el repo público.
  Contiene datos reales (emails, password hashes, pedidos).
- **Acción:**
  1. `git rm --cached backups/dev-pre-api-info-2026-06-02.db`
  2. Purgar del historial completo con `git filter-repo --path backups/dev-pre-api-info-2026-06-02.db --invert-paths`
     (o BFG Repo-Cleaner). Un `git rm` simple NO basta.
  3. Force push (`git push --force`) tras coordinar.
  4. **Rotar TODOS los secretos** como si estuvieran comprometidos: `SESSION_SECRET`,
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, claves PayPal, SMTP, OAuth, `CRON_SECRET`.
  5. Forzar reset de contraseña a cualquier usuario real que estuviera en ese `.db`.
- **Verificar:** `git log --all --full-history -- "backups/*.db"` no devuelve nada.

### 0.2 — Confirmar que ningún secreto está hardcodeado  🔴  ✅ HECHO
- Revisar que `SESSION_SECRET` esté en env (los fallbacks dev en `session.ts:25` y
  `oauth.ts:38` ya lanzan error en producción — correcto, mantener).
- **Verificar:** `validateEnv()` lanza si falta `SESSION_SECRET` o `DATABASE_URL` en prod.

---

## FASE 1 — BLOQUEADORES PARA NETLIFY (sin esto no despliega)

### 1.1 — Migrar SQLite → PostgreSQL  🔴 BLOQUEADOR  ⬜ PENDIENTE
- **Problema:** `schema.prisma` usa `provider = "sqlite"` con fichero local. Netlify es
  serverless: filesystem efímero, sin estado entre invocaciones.
- **Acción:**
  1. Provisionar Postgres gestionado (recomendado: **Neon**, tier gratis + driver serverless).
  2. `schema.prisma`: cambiar `provider = "postgresql"`.
  3. Revisar tipos: SQLite es laxo; Postgres es estricto. Los campos `*Json String` siguen
     siendo `String` (OK), pero verificar defaults y `@db.Text` donde haga falta para
     descripciones largas (`longDescription`, `requirements`).
  4. Generar migración inicial limpia para Postgres (`prisma migrate dev`).
  5. Setear `DATABASE_URL` en Netlify con la connection string (usar pooled connection de Neon).
- **Verificar:** `prisma migrate deploy` corre limpio; la app arranca contra Postgres.

### 1.2 — Mover almacenamiento de avatares a blob storage  🔴 BLOQUEADOR (también es vuln A3)  ⬜ PENDIENTE
- **Problema:** `avatar/route.ts:43-44` hace `fs.writeFile` a `public/avatars/`. El FS de
  Netlify es de solo lectura/efímero → falla en producción.
- **Acción:**
  1. Elegir backend: **Netlify Blobs** (nativo) o Cloudinary / Cloudflare R2 / S3.
  2. Reescribir el handler para subir al blob store y guardar la URL pública en `avatarUrl`.
  3. **Aprovechar para arreglar las sub-vulnerabilidades:**
     - Límite de tamaño máximo (~2 MB) antes de procesar.
     - Validar *magic bytes* reales (no confiar en `file.type`, que lo controla el cliente).
     - Acotar extensiones a jpg/png/webp por contenido real.
  4. Eliminar la variable `updatedUser` sin usar / limpieza.
- **Verificar:** subida funciona en build de producción; rechaza ficheros >2 MB y no-imágenes.

### 1.3 — Recrear el cron de Vercel en Netlify  🔴 BLOQUEADOR  ✅ HECHO
- **Problema:** `vercel.json` define cron `0 5 * * *` → `/api/cron/sync-catalogs`. Netlify NO
  lee `vercel.json`.
- **Acción:**
  1. Crear `netlify.toml` con una **Scheduled Function** que invoque `/api/cron/sync-catalogs`.
  2. El endpoint ya valida `Bearer CRON_SECRET` (`cron/sync-catalogs/route.ts:12`) — mantener,
     setear `CRON_SECRET` en Netlify.
  3. Borrar `vercel.json` (o dejarlo documentado como legacy si se quiere doble target).
- **Verificar:** la scheduled function dispara y responde 200 con el secreto correcto, 401 sin él.

### 1.4 — Configurar el runtime de Next.js para Netlify  🔴 BLOQUEADOR  ✅ HECHO (revisar instrumentation.ts)
- **Acción:**
  1. Instalar/activar `@netlify/plugin-nextjs` (o el runtime nativo de Next en Netlify).
  2. `netlify.toml`: build command (`npm run build` ya incluye `prisma generate`), publish dir,
     y declarar todas las env vars necesarias.
  3. Revisar `instrumentation.ts`: `ensureMasterAdminUser()` en startup puede NO ejecutarse de
     forma fiable en serverless. Alternativas: moverlo a seed de migración, o a un endpoint
     protegido de inicialización idempotente que se llame una vez tras el deploy.
- **Verificar:** deploy de prueba en Netlify arranca y sirve páginas + APIs.

### 1.5 — Sustituir la geolocalización síncrona del middleware  🟠 ALTA (vuln A2)  ✅ HECHO
- **Problema:** `middleware.ts:22` hace `fetch("https://ipapi.co/json/")` en cada request a
  página pública. Bloquea el render, depende de un servicio externo, y es caro en Edge.
- **Acción:**
  1. Usar la geo que Netlify ya inyecta (`context.geo` / cabecera `x-nf-geo`) — cero latencia.
  2. Si se quiere fallback, hacerlo client-side y cacheado, NUNCA bloqueando el middleware.
  3. Mantener las cookies `geoCountry/geoCurrency/geoLocale` pero pobladas desde la geo nativa.
- **Verificar:** middleware no hace fetch externo; las cookies se siguen poblando.

---

## FASE 2 — SEGURIDAD (severidad alta/media)

### 2.1 — Cifrar `totpSecret` en reposo  🟠 ALTA (vuln A1)  ⬜ PENDIENTE
- **Problema:** `totpSecret` se guarda en texto plano (`schema.prisma:43`,
  `totp/enable/route.ts:66`). Si la DB se filtra, se pueden generar códigos 2FA de cualquiera.
- **Acción:**
  1. Nueva env var `ENCRYPTION_KEY` (32 bytes, base64).
  2. Cifrar con AES-256-GCM al guardar; descifrar solo al verificar.
  3. Migración para re-cifrar secretos existentes (o forzar re-setup de TOTP a usuarios).
- **Verificar:** el valor en DB es ciphertext; el flujo de verificación TOTP sigue funcionando.

### 2.2 — Reducir la ventana de tolerancia TOTP  🟠 ALTA (vuln A4)  ✅ HECHO
- **Problema:** `totp/enable/route.ts:54` usa `epochTolerance: 30`. Verificar la semántica exacta
  en la versión de `otplib` instalada — si son periodos de 30s, eso es ±15 min (excesivo).
- **Acción:** reducir a la tolerancia mínima razonable (±1 periodo / ±30s). Revisar también el
  endpoint `totp/verify`.
- **Verificar:** códigos viejos (>1 min) son rechazados; el código actual se acepta.

### 2.3 — Rate limit en endpoints de verificación 2FA/TOTP  🟡 MEDIA (vuln M1)  ✅ HECHO
- **Problema:** `rate-limit.ts:12` solo cubre `register/verify/resend/login`. `/api/auth/2fa/verify`
  y `/api/auth/totp/verify` no tienen límite → brute-force del código de 6 dígitos.
- **Acción:** añadir scope `2fa-verify` (p.ej. 5 intentos / 10 min por IP+usuario) y aplicarlo
  en ambos endpoints.
- **Verificar:** tras N intentos fallidos se devuelve 429.

### 2.4 — Cabeceras de seguridad HTTP  🟡 MEDIA (vuln M4)  ✅ HECHO
- **Acción:** añadir en `next.config.mjs` (`headers()`) o `netlify.toml`:
  `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`.
  Ajustar la CSP a los dominios de imágenes ya listados en `next.config.mjs`.
- **Verificar:** las cabeceras aparecen en las respuestas; el sitio sigue cargando imágenes/scripts.

### 2.5 — Validación de tipo de evento antes del cast en webhooks  🟡 MEDIA (vuln M2)  ✅ HECHO
- **Acción:** en `stripe/webhook/route.ts` y `paypal/webhook/route.ts`, validar `event.type`
  antes de hacer `as Stripe.Checkout.Session`. Confirmar que el `fallbackEmail` dummy de PayPal
  nunca se usa como destinatario real (se recupera por `userId` en `completePaidOrder` — OK,
  pero blindar).
- **Verificar:** eventos de tipo inesperado no provocan acceso a campos inexistentes.

---

## FASE 3 — CALIDAD DE CÓDIGO Y ROBUSTEZ

### 3.1 — Introducir Zod para validación de bodies de API  🟡 (vuln M3)
- **Problema:** los bodies se castean con `as Type` sin validación runtime (todas las rutas).
- **Acción:** añadir `zod`, definir esquemas por endpoint, parsear y devolver 400 con detalle.
  Empezar por las rutas sensibles: login, register, checkout, reset-password.
- **Verificar:** inputs malformados devuelven 400 estructurado; tipos garantizados en runtime.

### 3.2 — Rate limiting distribuido (opcional pero recomendado)
- El rate limit actual (`RateLimitBucket` en DB) ya es atómico tras el último fix, pero carga la
  DB principal. Para escala, migrar a **Upstash Redis**. No es bloqueador.

### 3.3 — Logging y observabilidad
- Sustituir los `.catch(() => false)` silenciosos por logging consistente con `logger`.
- Integrar **Sentry** para errores de producción.

### 3.4 — CI en GitHub Actions  ✅ HECHO
- Workflow que corra `tsc --noEmit` + `eslint` + `vitest run` + `build` en cada PR.
- Los scripts ya existen en `package.json`; solo falta el `.github/workflows/ci.yml`.

### 3.5 — Tests de integración
- Solo hay 9 tests unitarios (auth/games/oauth). Añadir cobertura para: flujo de checkout
  completo, idempotencia de webhooks (Stripe manda evento doble, PayPal manda 2), y rotación
  de sesión.

---

## Orden de ejecución recomendado

1. **FASE 0** — antes de cualquier otra cosa (fuga de datos activa).
2. **FASE 1** — para que el deploy en Netlify sea posible.
3. **FASE 2** — endurecer seguridad antes de exponer en producción.
4. **FASE 3** — calidad continua, se puede iterar tras el primer deploy.

## Comandos de verificación (tras cada fase)
```
npx tsc --noEmit
npx vitest run
npm run build
```

## Tecnologías a incorporar (resumen)
- **Zod** — validación runtime (mayor impacto/coste).
- **PostgreSQL (Neon)** — reemplazo obligatorio de SQLite.
- **Netlify Blobs / Cloudinary / R2** — avatares.
- **Upstash Redis** — rate limit distribuido (opcional).
- **Sentry** — observabilidad.
- **@netlify/plugin-nextjs** — runtime de despliegue.
- **GitHub Actions** — CI.

---

## FASE 4 — MEJORAS IMPORTANTES (próximas iteraciones)

> Estas mejoras no son bloqueadoras pero son necesarias para que GameZone sea una aplicación real y profesional.

### 4.1 — SEO básico  🟠 ALTA
- **Problema:** el sitio no aparece en Google ni en buscadores. No hay `sitemap.xml`, `robots.txt` ni metadatos Open Graph.
- **Acción:**
  1. Generar `sitemap.xml` dinámico con todas las rutas públicas y productos (Next.js `app/sitemap.ts`).
  2. Añadir `robots.txt` permitiendo crawlers en rutas públicas y bloqueando `/api/`, `/admin/`, `/account/`.
  3. Añadir metadatos Open Graph en cada página (título, descripción, imagen) para previews en redes sociales.
  4. Registrar el sitio en **Google Search Console** y enviar el sitemap.
  5. Usar un **dominio propio** (ej. `gamezoneshop.es`) en lugar de `gamezone-digital-store.netlify.app` — mejora el SEO y la credibilidad.
- **Verificar:** `https://gamezone-digital-store.netlify.app/sitemap.xml` devuelve XML válido; Google Search Console muestra el sitio indexado.

### 4.2 — Dominio propio  🟠 ALTA
- **Problema:** `gamezone-digital-store.netlify.app` no transmite confianza ni es memorable. Los subdominios `.netlify.app` tienen menos peso en SEO.
- **Acción:**
  1. Registrar dominio (recomendado: `gamezoneshop.es`, `gamezone.store` o similar).
  2. Configurarlo en Netlify (DNS + certificado SSL automático).
  3. Actualizar `APP_BASE_URL`, OAuth redirect URIs (Google, Facebook), webhooks de Stripe y PayPal con el nuevo dominio.
- **Verificar:** el sitio carga en el dominio propio con HTTPS; los redirects de OAuth funcionan.

### 4.3 — Rate limiting distribuido (Upstash)  🟡 MEDIA
- Ver tarea 3.2 — ya documentado. Prioritario si el sitio recibe tráfico real.

### 4.4 — Emails transaccionales con plantillas HTML  🟡 MEDIA
- **Problema:** los emails de confirmación de compra son texto plano. No representan bien la marca.
- **Acción:** diseñar plantillas HTML responsive para: confirmación de pedido, reset de contraseña, verificación de cuenta, bienvenida.
- **Verificar:** los emails se renderizan correctamente en Gmail, Outlook y móvil.

### 4.5 — Panel de administración completo  🟡 MEDIA
- **Problema:** el panel admin actual es básico. Falta gestión de pedidos, usuarios, y catálogo desde la UI.
- **Acción:** añadir vistas para: gestión de pedidos (estado, reembolsos), gestión de usuarios (ban, roles), edición del catálogo de productos, métricas básicas de ventas.
- **Verificar:** un admin puede gestionar pedidos y productos sin tocar la base de datos directamente.

### 4.6 — Subida de imágenes de producto desde el equipo  🟠 ALTA
- **Problema:** el formulario de crear/editar producto (`src/components/auth/AdminProductsPanel.tsx`)
  solo acepta una **ruta escrita a mano** (`/games_data/.../cover.jpg`) o una URL externa de un
  dominio permitido en `next.config.mjs` (RAWG, Steam, G2A). No hay botón para subir un archivo
  desde el PC. En Netlify (serverless, FS de solo lectura) NO se puede escribir en `public/`, así
  que un upload tradicional a disco no funciona.
- **Acción (reutilizar el patrón de los avatares, tarea 1.2):**
  1. Guardar los bytes de la imagen en PostgreSQL (tabla nueva `ProductImage` con `Bytes`, o blob
     storage tipo Cloudinary/R2).
  2. Servirla por una ruta `GET /api/admin/products/[id]/image` (o pública) y guardar esa URL en
     `coverImage` / `backgroundImage`.
  3. En el formulario: `<input type="file" accept="image/*">` + botón "Subir imagen"; al
     seleccionar, subir vía `POST` y rellenar el campo con la URL resultante.
  4. Validar en servidor: tamaño máx (~2-3 MB), magic bytes reales, redimensionar/convertir a webp
     con `sharp` (ya está en el proyecto por los avatares).
  5. Mantener compatibilidad: seguir aceptando rutas/URL existentes para no romper el catálogo.
- **Nota de rendimiento:** NO incrustar la imagen como base64 en `coverImage`: el listado del
  catálogo (`/api/products`) devuelve `coverImage` de todos los productos y dispararía el tamaño de
  la respuesta. Servir siempre por URL/ruta API.
- **Verificar:** un admin sube una imagen desde su PC, se guarda y se muestra en la ficha y en el
  catálogo, en producción (Netlify).

---

## FASE 5 — MEJORAS FUTURAS (roadmap a largo plazo)

> Mejoras que añadirían valor significativo pero que requieren más tiempo de desarrollo o dependen de acuerdos con terceros.

### 5.1 — Integración con la API de Xbox (Microsoft Store)  🔵 FUTURO
- **Descripción:** conectar con la API de Xbox/Microsoft Store para importar catálogo de juegos Xbox, precios actualizados y disponibilidad en tiempo real.
- **Requisito:** acceso a la [Microsoft Partner Center API](https://docs.microsoft.com/en-us/azure/marketplace/) o acuerdo con Microsoft.
- **Acción:**
  1. Crear sección dedicada `/xbox` en la app con catálogo y filtros específicos de Xbox.
  2. Sincronizar precios y disponibilidad vía cron diario (igual que `sync-catalogs`).
  3. Mostrar distintivo de plataforma (Xbox Series X/S, Xbox One, Game Pass).
- **Nota:** evaluar también APIs de PlayStation Store y Nintendo eShop para unificar en una sección "Todas las plataformas".

### 5.2 — Google Analytics / GA4  🔵 FUTURO
- **Descripción:** integrar Google Analytics 4 para medir tráfico, conversiones y comportamiento de usuarios.
- **Acción:**
  1. Crear propiedad GA4 en [analytics.google.com](https://analytics.google.com).
  2. Añadir el script de GA4 en `layout.tsx` usando `next/script` con `strategy="afterInteractive"`.
  3. Configurar eventos personalizados: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
  4. Actualizar la CSP en `next.config.mjs` para permitir los dominios de Google Analytics.
- **Nota:** asegurarse de cumplir con RGPD — mostrar banner de cookies y no activar GA hasta consentimiento.

### 5.3 — Sistema de valoraciones y reseñas  🔵 FUTURO
- **Descripción:** permitir a usuarios que han comprado un juego dejar una valoración (1-5 estrellas) y reseña de texto.
- **Acción:** nuevo modelo `Review` en Prisma, endpoints CRUD, componente UI en la página del producto.
- **Verificar:** solo usuarios con compra confirmada pueden dejar reseña; las reseñas aparecen paginadas en el producto.

### 5.4 — Lista de deseos (Wishlist)  🔵 FUTURO
- **Descripción:** los usuarios pueden guardar juegos en una lista de deseos y recibir notificación por email cuando bajen de precio.
- **Acción:** modelo `Wishlist` en Prisma, endpoints, UI en la página del producto y sección `/account/wishlist`.

### 5.5 — PWA (Progressive Web App)  🔵 FUTURO
- **Descripción:** convertir GameZone en una PWA para que los usuarios puedan instalarla en móvil como app nativa.
- **Acción:** añadir `manifest.json`, Service Worker con caché offline para el catálogo, iconos de app.
- **Verificar:** Chrome muestra el prompt "Añadir a pantalla de inicio"; la home carga offline.

### 5.6 — Sistema de afiliados / códigos de descuento  🔵 FUTURO
- **Descripción:** gestión de cupones y códigos de descuento (porcentaje o cantidad fija) para campañas de marketing.
- **Acción:** modelo `Coupon` en Prisma, validación en checkout, panel admin para gestión de cupones.

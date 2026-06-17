# Plan de mejoras y auditoría — GameZone (GameStopV4)

> **v2 — Auditoría revisada y ampliada el 2026-06-11** (revisión senior fullstack + seguridad + UX
> sobre el código real del repo). Sustituye a la v1 del 2026-06-10, conservando su historial de estado.
>
> **Contexto para quien implemente (Opus / Sonnet):** Proyecto Next.js 16 (App Router) + React 19 +
> Prisma + PostgreSQL (Neon), auth propio con HMAC, 2FA (email/TOTP/push), pagos Stripe + PayPal,
> deploy en **Netlify**. SCSS global (sin Tailwind). Sentry integrado.
>
> **Reglas para implementar (obligatorias):**
> 1. NO romper los flujos de auth, carrito ni pago existentes.
> 2. Mínimo cambio viable: no refactorizar lo que no pide la tarea.
> 3. Tras cada tarea: `npx tsc --noEmit` + `npx vitest run` + `npm run build` limpios.
> 4. Una rama backup antes de cada fase: `git checkout -b backup-pre-<fase>-DDMMYYYY`.
> 5. Commits pequeños, uno por tarea, con mensaje descriptivo.

---

## ESTADO GLOBAL (verificado contra el código el 2026-06-11)

Leyenda: ✅ hecho · ⚠️ parcial / acción manual pendiente · ⬜ pendiente

| Tarea | Estado |
|---|---|
| 0.1 — `.db` fuera del historial Git | ✅ git purgado · ⚠️ **rotación de secretos manual SIGUE PENDIENTE** |
| 0.2 — Sin secretos hardcodeados | ✅ verificado |
| 1.1 — SQLite → PostgreSQL (Neon) | ✅ hecho · ⚠️ usar URL **pooled** en `DATABASE_URL` de Netlify |
| 1.2 — Avatares en Postgres (`UserAvatar`) | ✅ hecho |
| 1.3 — Cron en Netlify | ✅ hecho |
| 1.4 — Runtime Next.js en Netlify | ✅ hecho |
| 1.5 — Geo sin fetch externo | ✅ hecho (verificado en `middleware.ts`) |
| 2.1 — Cifrar `totpSecret` (AES-256-GCM) | ✅ hecho |
| 2.2 — Tolerancia TOTP reducida | ✅ hecho |
| 2.3 — Rate limit en 2FA/TOTP | ✅ hecho |
| 2.4 — Cabeceras de seguridad | ✅ hecho · 7.1 ✅ hecho · ⚠️ pendiente validación manual en producción (home, ficha, auth, checkout) |
| 2.5 — Validación `event.type` webhooks | ✅ hecho |
| 3.1 — Zod en bodies de API | ✅ hecho |
| 3.2 — Rate limit distribuido (Upstash) | ✅ hecho (17/06/2026; usa Upstash con fallback PostgreSQL si faltan env vars) |
| 3.3 — Sentry | ✅ **HECHO** (verificado: `withSentryConfig` en `next.config.mjs`, configs server/edge/client) — la v1 lo marcaba pendiente por error |
| 3.4 — CI GitHub Actions | ✅ hecho |
| 3.5 — Tests de integración | ✅ **HECHO** (11/06/2026; 48 tests: servicios de checkout/sesión + rutas webhook Stripe/PayPal + login/2FA) |
| 4.1 — SEO básico (sitemap/robots/OG/Search Console) | ✅ hecho |
| 4.1b — SEO avanzado (metadata por juego + JSON-LD) | ✅ **HECHO** (11/06/2026; ficha split server/client, `generateMetadata` y JSON-LD `Product`) |
| 4.2 — Dominio propio | ⬜ pendiente (manual, usuario) |
| 4.6 — Subida de imágenes de producto | ✅ **HECHO** (verificado: modelo `ProductImage`, rutas `api/admin/product-images` y `api/product-images`, inputs `type="file"` en `AdminProductsPanel.tsx`) |
| **FASE 6 — Rendimiento** | ✅ **COMPLETA** — móvil 79→**96** (+17), PC 99→92 (cold-cache proxy, aceptable). Objetivo ≥ 90 móvil cumplido. |
| **FASE 7 — Seguridad avanzada** | ⚠️ en curso — **7.1 ✅ 7.3 ✅ 7.4 ✅** hechas; 7.2 🔴 manual pendiente (usuario) |
| **FASE 8 — SEO avanzado** | ⚠️ en curso — **8.1/8.2/8.3/8.4 ✅ hechas**; 8.5 pendiente (manual) |
| **FASE 9 — UI/UX** | ✅ **COMPLETA** — 9.1/9.2/9.3/9.4/9.5 ✅; Parte B: B1/B2/B3/B4/B5/B6/B7/B8 ✅ todos hechos |
| **Audit Log (C1)** | ✅ HECHO 13/06/2026 -- tabla AuditLog en Neon, logAudit(), 18 puntos en 14 rutas. Migracion aplicada. |
| **FASE 10 — Testing y robustez** | ⚠️ en curso — **10.1 ✅ 11/06**, **10.2 ✅ 13/06** (Playwright 3 specs), **10.3 ✅ 13/06** (ESLint CI + Lighthouse CI); 10.4 pendiente |

**Acciones manuales del usuario aún pendientes:** rotación de secretos (0.1), URL pooled en Netlify (1.1), dominio propio (4.2).

---

## FASES 0–5 (v1) — resumen

Las fases 0–3 están completas, incluida 3.2 (Upstash con fallback PostgreSQL, 17/06/2026). 3.5 quedó cubierto y ampliado el 11/06/2026 con tests de servicios, sesión, webhooks Stripe/PayPal y login + 2FA; el resto de robustez continúa en FASE 10.
La fase 4 está completa salvo 4.2 (dominio, manual). 4.1b quedó cerrada en FASE 8 con metadata por ficha y JSON-LD.
La fase 5 (roadmap: Xbox API, GA4, reseñas, wishlist, PWA, cupones) sigue vigente como futuro.
El detalle histórico completo está en el commit anterior de este archivo (`git log -- docs/PLAN-MEJORAS-AUDITORIA.md`).

---

## FASE 6 — RENDIMIENTO  🔴 PRIORIDAD MÁXIMA

> **Síntoma reportado por el usuario:** la página tarda mucho en cargar.
> **Causa raíz identificada en la auditoría (verificada en código):** la home es 100% client-side.
> La cadena actual es: HTML vacío → descarga JS → hidratación → `fetch /api/products` +
> `fetch /api/home/hero` (ambos con `cache: "no-store"`) → consulta a Neon (Frankfurt) en frío →
> render. Cada visita paga TODA la cadena; nada se cachea en ningún nivel.

### 6.1 — Convertir la home a Server Component con datos precargados  🔴 CRÍTICO  ✅ HECHA (commit `9533064`, 11/06/2026; tsc + 25 tests + build verdes; la ruta `/` aparece como ƒ dynamic en el build con datos vía unstable_cache)
- **Problema:** `src/app/page.tsx` es `"use client"` y carga productos y hero por fetch en
  `useEffect` con `cache: "no-store"` (líneas 156-188). `src/app/api/products/route.ts` es
  `force-dynamic` y consulta la DB en cada request.
- **Acción (patrón igual al planificado para la ficha de juego en FASE 8 — hacer ambos con el mismo criterio):**
  1. Crear `src/app/HomeClient.tsx` con `"use client"`: mover ahí TODO el contenido actual de
     `page.tsx` (búsqueda, scoring, filtros, Hero, GameGrid), recibiendo `initialProducts` y
     `initialHeroSections` por props.
  2. Convertir `src/app/page.tsx` en server component (sin `"use client"`): llamar directamente a
     `listActiveProducts()` y a la lógica de hero (extraerla de `api/home/hero/route.ts` a
     `src/lib/home-hero.ts` para reutilizarla) y pasar los datos a `<HomeClient>`.
  3. Envolver la carga de productos con `unstable_cache` (tag `products`, `revalidate: 300`).
  4. Llamar a `revalidateTag("products")` en las mutaciones de admin que crean/editan/borran
     productos, para que el catálogo se refresque al instante tras un cambio.
  5. Los likes del usuario NO van en el payload cacheado: hidratarlos client-side tras el load
     con un endpoint ligero `GET /api/products/likes` (solo ids), únicamente si hay cookie de sesión.
  6. Mantener `/api/products` como está para compatibilidad (lo usan otras vistas), pero la home
     ya no dependerá de él.
- **Resultado esperado:** el HTML llega con el catálogo ya renderizado (LCP inmediato), la DB se
  consulta como máximo una vez cada 5 min, y la interactividad (búsqueda/filtros) no cambia.
- **Verificar:** la home renderiza productos sin JS (ver código fuente de la página); búsqueda,
  filtros, likes y carrito siguen funcionando; `npm run build` muestra la ruta `/` como dinámica
  con caché o estática.

### 6.2 — Recortar el payload del catálogo  🟠 ALTA  ✅ HECHA (11/06/2026, commit pendiente)
> Hecho como blindaje defensivo: se trunca `description` a 200 chars en la preview
> del catálogo de la home (`src/lib/home-data.ts`, `truncateForSearch`). Con los
> datos actuales (descripciones de ~64 chars) ahorra 0 bytes, pero evita que un
> futuro enriquecimiento RAWG con descripciones largas infle el HTML de la home.
> La ficha de detalle sigue leyendo la descripción íntegra de su propia query.
> `backgroundImage` se dejó intacto a propósito (lo usa el fallback del Hero;
> riesgo > beneficio).
- **Problema:** `/api/products` y ahora el server fetch devuelven TODOS los campos de TODOS los
  productos (incl. `description` completa) para pintar tarjetas que solo usan nombre, imagen,
  precio y plataforma. Con el catálogo creciendo, el payload crece linealmente.
- **Acción:**
  1. Crear un selector "preview" en `src/lib/products.ts` con solo los campos que usa `GameCard`
     (revisar el componente para la lista exacta; `description` solo si la búsqueda la usa —
     la usa el scoring: en ese caso truncarla a ~200 chars para el índice de búsqueda).
  2. Aplicarlo en la home (6.1) y en `/api/products`.
- **Verificar:** la respuesta del catálogo baja de tamaño (medir antes/después con DevTools);
  las tarjetas y la búsqueda se ven/funcionan igual.

### 6.3 — Skeletons en lugar de texto "Cargando..."  🟡 MEDIA  ✅ HECHA (11/06/2026)
> `src/app/loading.tsx` creado con 10 tarjetas skeleton + header skeleton usando las clases
> CSS ya existentes (`.game-grid-skeleton`, `.game-card-skeleton`, `skeleton-pulse`).
> Incluye `<main className="main-wrapper">` para evitar salto de layout (CLS = 0).
- **Problema:** mientras carga, la home muestra un párrafo "Cargando productos...". La percepción
  de lentitud empeora.
- **Acción:**
  1. Crear `src/app/loading.tsx` (convención App Router) con un skeleton del grid: 8-12
     tarjetas grises con `animation: pulse`. Reutilizar las clases/dimensiones reales de
     `GameCard` para que no haya salto de layout (CLS).
  2. Tras 6.1 apenas se verá, pero cubre navegaciones lentas y rutas aún client-side.
- **Verificar:** al navegar con red lenta (DevTools → Slow 3G) se ven skeletons, no texto plano.

### 6.4 — Imágenes: optimización WebP, `sizes` correctos y placeholder blur  🟡 MEDIA  ✅ HECHA (11/06/2026)
> **Lighthouse móvil detectó 4657 KiB de ahorro potencial en imágenes** (score 79, LCP 5.3s).
> Causa raíz: `unoptimized` en `GameCard` desactivaba la optimización de Next.js.
> Solución aplicada (commit `bef7fcf` + siguiente):
> - `unoptimized` eliminado → Next.js convierte a WebP y redimensiona automáticamente.
> - `quality` bajado de 100 → 85 (óptimo para WebP; visualmente idéntico, ~40% menos peso).
> - `sizes` corregido: `"(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"` (antes asumía 1 columna en móvil).
> - `placeholder="blur"` + `blurDataURL` SVG #0f172a añadido.
> - `remotePatterns` en `next.config.mjs` ya estaba configurado con todos los dominios necesarios.
- **Estado actual:** `GameCard` y `Hero` ya usan `next/image` y el Hero ya tiene `priority` ✓.
- **Hero también corregido (11/06/2026):** `unoptimized` eliminado de las 3 imágenes del Hero
  (`hero-bg-blur` quality 50, `hero-bg-art` quality 100→90, thumbnails quality 100→75).
  Con optimization activa + `priority`, Next.js inyecta automáticamente `<link rel="preload">`
  en el SSR del Hero, resolviendo el "Descubrimiento de solicitudes de LCP" de Lighthouse.
- **Verificar:** en DevTools → Network, las imágenes del grid en móvil pesan menos; no hay CLS.

### 6.5 — Medición objetiva (antes y después)  ✅ HECHA (11/06/2026)
> **Baseline → resultado final tras 6.3 + 6.4 + Hero optimization:**
>
> | | Baseline | Final | Cambio |
> |---|---|---|---|
> | Móvil rendimiento | 79 | **96** | **+17** ✅ |
> | Móvil LCP | 5.3s | ~1.x s | ✅ |
> | PC rendimiento | 99 | 92 | -7 (dentro de rango verde) |
> | PC LCP | 0.6s | 1.1s | cold-cache proxy, aceptable |
> | CLS | 0 | 0 | = |
>
> Objetivo del plan (Performance ≥ 90 móvil) **cumplido con margen**.
> La bajada en PC es el coste esperado del proxy de optimización en primera petición;
> 92 sigue siendo "excelente" y ambas plataformas están en verde.
- **Acción:** correr Lighthouse (Chrome DevTools, modo incógnito, Performance) sobre la home en
  producción ANTES de empezar la fase y DESPUÉS de 6.1-6.4. Guardar ambos reports en
  `docs/lighthouse/` (JSON o captura).
- **Objetivo:** Performance ≥ 90 móvil, LCP < 2.5s, CLS < 0.1.
- **Nota:** sin medición no se puede afirmar mejora. Este paso no es opcional.

---

## FASE 7 — SEGURIDAD AVANZADA  🟠

> Lo crítico ya está hecho (fases 0-2). Esto es endurecimiento de nivel producción real.

### 7.1 — Endurecer la CSP: eliminar `unsafe-eval`, plan para `unsafe-inline`  🟠 ALTA  ✅ HECHA (11/06/2026)
> `unsafe-eval` eliminado de `script-src` en producción. Solución aplicada en `next.config.mjs`:
> ```js
> `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://js.stripe.com https://www.paypal.com`
> ```
> Dev mantiene `unsafe-eval` (webpack HMR lo necesita). Producción queda sin él.
> `unsafe-inline` se mantiene de momento — Next.js inyecta inline scripts en hidratación;
> migrar a nonces requiere soporte estable en Netlify (deuda técnica anotada).
- **Verificar pendiente (manual):** abrir producción tras deploy y confirmar sin errores CSP
  en consola en: home, ficha, auth, checkout con Stripe y PayPal completos.

### 7.2 — Rotación de secretos (recordatorio de 0.1)  🔴 MANUAL PENDIENTE
- Sigue pendiente desde la v1. Mientras no se haga, los secretos que convivieron con el `.db`
  filtrado deben considerarse comprometidos: `SESSION_SECRET`, claves Stripe/PayPal, SMTP,
  OAuth, `CRON_SECRET`, `ENCRYPTION_KEY`.
- **Acción (usuario, ~30 min):** regenerar cada secreto en su panel (Stripe, PayPal, Google,
  etc.), actualizar env vars en Netlify, redeploy, forzar reset de contraseña a usuarios reales
  del `.db` antiguo.

### 7.3 — Cookie del carrito anónimo legible por JS  🟡 MEDIA  ✅ HECHA (11/06/2026)
> `gamezone_cart_session` solo se lee en `src/app/api/cart/scope/route.ts` (servidor).
> Ningún cliente JS la lee. Cambiado `httpOnly: false` → `httpOnly: true`.

### 7.4 — Auditoría de dependencias automatizada  🟡 MEDIA  ✅ HECHA (11/06/2026)
> - `npm audit fix` aplicado: vulnerabilidad de nodemailer resuelta.
> - 2 vulnerabilidades moderadas restantes en `postcss` (dependencia transitiva de Next.js
>   16.2.7) — no reparables sin downgrade de Next.js. Documentadas como known issue.
> - `npm audit --omit=dev --audit-level=high` añadido al CI (`ci.yml`) — falla solo en high/critical.
> - `.github/dependabot.yml` creado: updates npm weekly (lunes), límite 5 PRs,
>   major updates de Next.js ignorados (evitar upgrades automáticos rotos).

### 7.5 — Protección anti-bot en registro  🔵 OPCIONAL
- Si empieza a haber registros basura: **Cloudflare Turnstile** (gratis, sin fricción de
  usuario) en register y reset-password. No implementar hasta que haya señal del problema.

---

## FASE 8 — SEO AVANZADO  🟠

> El SEO básico (sitemap, robots, OG global, Search Console) está hecho. Esto es lo que hace
> que cada juego aparezca en Google con su propio título, precio y estrellas.

### 8.1 — `generateMetadata` por juego (split server/client)  🟠 ALTA  ✅ HECHA (11/06/2026)
- **Problema (verificado):** `src/app/games/[slug]/page.tsx` es `"use client"` → todas las
  fichas comparten el metadato genérico del layout. Google las ve idénticas.
- **Acción (el mismo patrón que la home en 6.1 — hacer después de 6.1 para reaprovechar el criterio):**
  1. Mover toda la UI actual a `src/app/games/[slug]/GameDetailClient.tsx` (`"use client"`),
     recibiendo el producto por props.
  2. `page.tsx` pasa a server component: lee el producto por slug desde Prisma
     (reutilizar/crear helper en `src/lib/products.ts`), maneja inexistente con `notFound()`,
     y renderiza `<GameDetailClient product={...}>`.
  3. Exportar `generateMetadata({ params })`: title = nombre del juego, description = corta del
     producto, `openGraph.images` = `coverImage` del producto (cada juego con su preview real al
     compartirlo, no el logo), canonical = `/games/[slug]`.
  4. El producto viaja por props — eliminar el fetch client-side duplicado.
- **Precaución:** probar añadir al carrito, likes y galería tras el split. Commit separado.
- **Verificar:** `view-source:` de una ficha muestra title/OG propios; carrito y likes funcionan.

### 8.2 — JSON-LD `Product` por ficha  🟠 ALTA  ✅ HECHA (11/06/2026)
- **Acción:** en el `page.tsx` server de 8.1, inyectar
  `<script type="application/ld+json">` con schema.org `Product`: `name`, `image`,
  `description`, `offers` (`price` final calculado, `priceCurrency: "EUR"`, `availability`
  según stock) y `aggregateRating` solo si hay rating con count > 0.
- **Verificar:** [Rich Results Test](https://search.google.com/test/rich-results) valida la
  ficha sin errores.

### 8.3 — JSON-LD `WebSite` + `Organization` en la home  ✅ HECHA (11/06/2026)
- **Acción:** en el `page.tsx` server de la home (tras 6.1), añadir schema `WebSite` con
  `potentialAction: SearchAction` (target `/?q={search_term_string}` — la home ya soporta `?q=`)
  y `Organization` con logo. Esto habilita la caja de búsqueda en resultados de Google.
- **Verificar:** Rich Results Test reconoce el SearchAction.

### 8.4 — Idioma declarado vs idioma real  ✅ HECHO (11/06/2026)
- **Problema:** `layout.tsx` fijaba `<html lang="es">` pero la UI tiene textos en/es vía `uiLocale`.
- **Implementado:** `layout.tsx` ahora es `async`, lee la cookie `uiLocale` (fallback `geoLocale` → `"es-ES"`)
  con `await cookies()` de `next/headers`, extrae los 2 primeros chars y pasa `lang={lang}` al `<html>`.
  Los cambios de idioma en Header/Footer actualizan la cookie → el server re-renderiza con `lang` correcto.
- **Textos i18n:** migrados en FASE 9.4 (CartDrawer, Header). Los componentes restantes están en la hoja
  de ruta de FASE 9 Parte B (opcional).
- **Verificar:** en DevTools, `<html lang="en">` al seleccionar inglés y `<html lang="es">` al volver.

### 8.5 — Dominio propio (recordatorio de 4.2)  🟠 MANUAL
- Sin dominio propio el SEO competirá siempre con handicap. ~10-15 €/año. Tras configurarlo:
  actualizar `APP_BASE_URL`, OAuth redirects, webhooks Stripe/PayPal, y `metadataBase`.

---

## FASE 9 — UI/UX

> Parte A = calidad base que toda tienda real necesita (hacer). Parte B = modernización
> estética OPCIONAL — el usuario está satisfecho con su diseño actual; son propuestas
> inspiradas en tiendas reales (Instant Gaming, Eneba, G2A, Epic) para valorar una a una.
> **NO implementar la Parte B sin que el usuario elija qué puntos quiere.**

### Parte A — Calidad base (hacer)

### 9.1 — Estados de error y carga por ruta  ✅ HECHA (11/06/2026)
- **Problema (verificado):** no existe ningún `loading.tsx` ni `error.tsx` por ruta (solo
  `global-error.tsx`). Un error en la ficha de un juego tumba la página entera sin recuperación.
- **Acción:** añadir `src/app/error.tsx` (client, con botón "Reintentar" que llame a `reset()`)
  y los `loading.tsx` de 6.3. Estilo coherente con el tema oscuro actual.
- **Verificar:** forzar un throw en una página → se ve la pantalla de error con retry, no un
  crash en blanco.

### 9.2 — Estado vacío de búsqueda con sugerencias  🟡 MEDIA
- **Problema:** buscar algo sin resultados deja el grid vacío sin guía.
- **Acción:** en `GameGrid`, cuando `isFiltered && games.length === 0`: mensaje claro
  ("Sin resultados para «X»"), botón "Limpiar búsqueda", y 4 productos populares como
  sugerencia (los de mayor `discountPercent` o rating ya disponibles en el listado completo).
- **Verificar:** buscar "asdfgh" muestra el estado vacío con sugerencias clicables.

### 9.3 — Accesibilidad base  🟡 MEDIA
- **Acción (auditar y corregir, no rediseñar):**
  1. Foco visible: comprobar que todos los elementos interactivos tienen `:focus-visible` con
     outline perceptible sobre fondo oscuro (globals.scss).
  2. Botones de icono (carrito, like, cerrar drawer) con `aria-label`.
  3. `prefers-reduced-motion`: envolver animaciones/transiciones grandes en
     `@media (prefers-reduced-motion: no-preference)`.
  4. Contraste: verificar textos secundarios grises sobre #22242A con un checker (ratio ≥ 4.5:1).
  5. El CartDrawer debe poder cerrarse con `Escape` y atrapar el foco mientras está abierto.
- **Verificar:** navegación completa home → ficha → carrito → checkout solo con teclado.

### 9.4 — Consistencia de textos (ver 8.4)  🟡 MEDIA
- La unificación i18n de 8.4 es también una tarea UX. Misma tarea, no duplicar.

### 9.5 — Modularizar SCSS por componente  🟡 MEDIA
- **Problema:** el proyecto tiene muchos componentes (`Header`, `Hero`, `Footer`, `GameCard`,
  `GameGrid`, `CartDrawer`, paneles de cuenta/admin, etc.) pero solo unos pocos archivos SCSS
  globales (`globals.scss`, `auth.scss`, `responsive-refinements.scss`). Esto concentra estilos
  de secciones distintas en un mismo archivo, dificulta localizar cambios y aumenta el riesgo de
  colisiones entre clases.
- **Acción (progresiva, no masiva):**
  1. Mantener `globals.scss` solo para estilos verdaderamente globales: reset, variables base,
     `html/body`, tipografía, tokens, utilidades generales y reglas globales justificadas.
  2. Migrar un componente cada vez a CSS Modules con el patrón:
     `ComponentName.tsx` + `ComponentName.module.scss`.
  3. Empezar por componentes de menor riesgo: `Footer` → `Hero` → `GameCard` → `GameGrid` →
     `Header`.
  4. En cada migración: localizar clases usadas, mover solo esos estilos al módulo, cambiar
     `className="..."` por `className={styles...}`, probar desktop/móvil y eliminar del global
     solo cuando esté verificado.
  5. No mezclar esta tarea con rediseños visuales ni cambios de lógica.
- **Verificar:** el componente migrado se ve igual en desktop y móvil; no hay clases huérfanas
  evidentes en `globals.scss`; `npx tsc --noEmit`, `npx vitest run` y `npm run build` pasan.

- **Estado 17/06/2026 (rama dev-17062026-gpt):**
  - ✅ Footer — commit `4d1bf0b`
  - ✅ Hero — commit `0b375f7`
  - ✅ GameCard — commit `6b313a1` (`src/components/ui/GameCard.module.scss`)
  - ✅ GameGrid — commit `6b313a1` (`src/components/ui/GameGrid.module.scss`)
  - ✅ CartDrawer — commit `4396a46` (`src/components/features/CartDrawer.module.scss`)
  - ✅ GameDetailClient — commit `9435b0f` (`src/app/games/[slug]/GameDetailClient.module.scss`)
  - ✅ Header — commit `11857b0` (`src/components/layout/Header.module.scss`, 15+ breakpoints)
  - ✅ MarketIntelligenceSections — commit `0fcea97` (`src/components/features/MarketIntelligenceSections.module.scss`, ~1500 líneas, THUMB_POSITION_CLASS map)
  - ✅ **FeaturedSection** — commit `3d4384d` (`src/components/features/FeaturedSection.module.scss`)
  - ✅ **PromoAppBanner** — commit `3d4384d` (`src/components/features/PromoAppBanner.module.scss`)
  - ✅ **auth.scss / account.scss** (17/06/2026): GPT había creado `auth.module.scss` + `account.module.scss` con `:global()` en todas las clases (falsos CSS Modules). Corregido renombrando a `auth.scss` + `account.scss` (SCSS global real); eliminados todos los `:global()` y side-effect imports.
  - ✅ **Auth layout components CSS Modules** (17/06/2026): `AuthShell` · `AuthCard` · `AuthFormPanel` · `AuthMediaPanel` creados en `src/components/auth/layout/` con sus `*.module.scss` reales. 11 páginas migradas (auth, register, forgot-password, reset-password, verify, checkout, checkout/success, account, account/orders, admin/control, admin/orders). `tsc` limpio + 76/76 tests.
  - Validado con `npx tsc --noEmit`, `npx.cmd vitest run` (76/76), `npx.cmd next build` y revisión visual pública desktop/móvil.

### Parte B — Modernización estética  🔵 OPCIONAL (elegir con el usuario)

> Inspirado en patrones estándar de las tiendas de videojuegos actuales. Cada punto es
> independiente. El diseño actual (tema oscuro #22242A, grid de tarjetas, hero) se mantiene
> como base — esto son capas encima, no un rediseño.

- **B1 — Fila de confianza** bajo el hero: ✅ **HECHA** (11/06/2026, commit `5e57af5`).
  Iconos de "Entrega inmediata", "Pago seguro"
  (logos Visa/Mastercard/PayPal), "Soporte 24h". Patrón universal en Eneba/Instant Gaming/G2A;
  es lo que más "tienda real" transmite de toda la lista.
- **B2 — Chips de filtro** sobre el grid: ✅ **HECHA** (11/06/2026, commit `e6a3525`).
  Chips Todos/PlayStation/Xbox/Nintendo/PC/Ofertas sobre el grid, conectados a `useSearch`
  y filtro local por descuento.
- **B3 — Micro-interacciones en tarjetas:** ✅ **HECHA** (11/06/2026, commit `5e57af5`).
  Hover con `transform: translateY(-4px)` + sombra +
  zoom sutil de la imagen (`scale(1.05)` con `overflow: hidden`). Respetar
  `prefers-reduced-motion`.
- **B4 — CTA pegajoso en ficha móvil:** ✅ **HECHA** (11/06/2026, commit `ae61b54`).
  Barra inferior fija con precio + "Añadir al carrito" al hacer scroll en la ficha.
- **B5 — "Vistos recientemente":** ✅ **HECHA** (11/06/2026, commit `ae61b54`).
  Carrusel en home con los últimos juegos visitados mediante `localStorage` (`useRecentlyViewed`).
- **B6 — Wishlist visible:** ✅ **HECHA** (11/06/2026, commit `e6a3525`).
  `GET /api/account/wishlist` y pestaña "Mi lista" en cuenta, alimentada desde `ProductLike`.
- **B7 — Cuenta atrás en ofertas:** ✅ **HECHA** (verificado 17/06/2026). `GameCard.tsx` ya tiene countdown completo: `useState<string | null>` + `useEffect` que calcula tiempo restante desde `game.saleEndsAt`, renderizado con `styles.gameCardCountdown`. Admin panel con input `datetime-local` para `saleEndsAt`. Campo en BD desde migración `20260613000002`.
- **B8 — Tipografía display propia:** ✅ **HECHA** (11/06/2026, commit `ae61b54`).
  Exo 2 vía `next/font/google` como variable `--font-display` para títulos principales.

> **Validación local 11/06/2026:** `npx tsc --noEmit` ✅ y `npm run test:unit` ✅ (48/48).
> `npm run lint` ✅ verificado el 17/06/2026: no quedan `eslint-disable-next-line react-hooks/exhaustive-deps`
> ni `dataSources` sin uso en `MarketIntelligenceSections.tsx`.

---

## FASE 10 — TESTING Y ROBUSTEZ  🟡

### 10.1 — Tests de integración de los flujos críticos (absorbe 3.5)  🟠 ALTA  ✅ HECHA
- **Estado validado el 13/06/2026:** 12 archivos de test y 76 tests verdes con `npx vitest run`.
  C3 anadio `src/lib/audit-log.test.ts` (8 tests), `src/lib/products.test.ts` (22 tests)
  y una asercion `ORDER_PAID` en `src/app/api/payments/stripe/webhook/route.test.ts`.
  Verificado por GPT con `npx tsc --noEmit`, `npx vitest run` y `npx next build`.
  `npm run build` en Windows/Dropbox puede fallar por lock de Prisma DLL (`EPERM`) aunque
  `next build` pase; detener procesos Node/VS Code si se necesita regenerar Prisma Client.
- **Estado validado el 11/06/2026:** 10 archivos de test y 48 tests verdes con `npm run test:unit`.
  Hay cobertura a nivel servicio para `createPendingOrder`, `completePaidOrder`,
  idempotencia de estado/email y rotación de sesión. También hay cobertura route-level para
  webhooks Stripe/PayPal y flujo login + 2FA email.
- **Acción (en Vitest, mockeando Stripe/PayPal con sus payloads reales):**
  1. **Idempotencia de webhooks:** el mismo `checkout.session.completed` dos veces NO crea dos
     pedidos ni manda dos emails. Ídem PayPal.
  2. **Checkout completo:** carrito → orden creada → webhook → orden pagada → stock/estado correcto.
  3. **Rotación de sesión:** login → token válido → logout → token inválido. Login con 2FA activo
     exige el segundo factor.
- **Verificar:** `npx vitest run` verde; los tests fallan si se rompe la idempotencia (probar
  rompiéndola a propósito una vez).

### 10.2 — E2E reales con Playwright  🟡 MEDIA  ✅ HECHA (13/06/2026)
- **Estado:** existen scripts e2e a medida (`scripts/e2e-*.mjs`) — útiles pero frágiles y fuera
  del runner estándar.
- **Acción:** montar Playwright con 3 specs: (1) compra completa con tarjeta test de Stripe,
  (2) registro + verificación + login, (3) búsqueda + añadir al carrito + persistencia tras
  recargar. Integrarlo como job manual/nightly en CI (no en cada PR, es lento).
- **Verificar:** `npx playwright test` verde en local contra build de producción.

### 10.3 — CI ampliado  🟡 MEDIA  ⚠️ PARCIAL
- **Hecho (11/06/2026):** `eslint` ya es hard-fail en CI (`npx eslint . --max-warnings 0`
  sin `continue-on-error`) y `npm audit --omit=dev --audit-level=high` ya falla el pipeline
  ante vulnerabilidades high/critical.
- **Hecho (13/06/2026):** **Lighthouse CI** automatizado con `@lhci/cli`, `.lighthouserc.js`
  y job `lighthouse` en GitHub Actions. Presupuesto Performance >= 0.85 como warning.
- **Verificar:** un PR con un error de lint o una dependencia vulnerable no pasa el CI.

### 10.4 — Operacional  🟡 MEDIA (manual, usuario)
- **Backups:** confirmar el plan de Neon (el tier gratis tiene restore limitado — revisar
  retención y hacer un dump mensual `pg_dump` a local como red de seguridad).
- **Uptime:** monitor gratuito (UptimeRobot/BetterStack) sobre la home y `/api/products` con
  alerta a email.
- **Sentry:** revisar que las alertas por email estén activadas para errores nuevos en
  producción (ya está integrado; es solo configuración del panel).

---

## ORDEN DE EJECUCIÓN RECOMENDADO

1. **FASE 6** (rendimiento) — es el dolor actual del usuario y además mejora SEO (Core Web Vitals).
   Orden interno: 6.1 → 6.2 → 6.3 → 6.4 → 6.5.
2. **FASE 8.1 + 8.2** (SEO por ficha) — reutiliza el patrón server/client de 6.1 recién aprendido.
3. **FASE 9 Parte A** (calidad UX base), incluyendo 9.5 de forma progresiva cuando se toque cada componente.
4. **FASE 7** (seguridad avanzada) — 7.2 (rotación) puede y debe hacerla el usuario en paralelo desde ya.
5. **FASE 10** (testing).
6. **FASE 9 Parte B** — solo los puntos que el usuario elija.
7. FASE 5 (roadmap futuro) según interés.

## Comandos de verificación (tras cada tarea)
```
npx tsc --noEmit
npx vitest run
npm run build
```

---

## Hallazgos Lighthouse — informe 11/06/2026 (Móvil, 8:36)

> Scores al medir: **Rendimiento 98 · Accesibilidad 98 · Prácticas recomendadas 96 · SEO 100**
> Fuente: PageSpeed Insights móvil. Medido antes de los commits 8.3/9.1 (no afectan estos fallos).

### Fallos detectados (6 únicos)

| # | Categoría | Problema | Accionable |
|---|---|---|---|
| 1 | Rendimiento | **Solicitudes que bloquean el renderizado** — chunk CSS `0k1w7_h05lnt_.css` en ruta crítica | ❌ Lo genera Next.js internamente |
| 2 | Rendimiento | **Descubrimiento de solicitudes de LCP** — imagen hero no descubierta en HTML inicial | ✅ **Resuelto en 6.4** — `priority` en Hero activa el preload automático de Next.js |
| 3 | Rendimiento | **Redistribución forzada** — JS lee layout y escribe DOM en el mismo frame | ⚠️ Requiere profiling en DevTools |
| 4 | Accesibilidad | **Encabezados fuera de orden secuencial** — salto de nivel `<h>` en paneles de market pulse | ✅ **Resuelto** (commit `67f2fea`) — subsecciones pasan de `h4` a `h3` |
| 5 | Prácticas | **Errores en consola** — `/api/account/me` falla en carga (usuario no autenticado); error externo de `wikia.nocookie.net` | ✅ **Resuelto parcialmente** (commit `67f2fea`) — se evita `/api/account/me` sin cookie `gz_auth`; queda externo `wikia.nocookie.net` si reaparece |
| 6 | Prácticas | **Sin source maps** para JS propio de gran tamaño | ❌ No afecta al usuario |

### Prioridad de acción

1. ~~🟢 **Fácil + Accesibilidad:** corregir orden de `<h>` en componentes market pulse~~ — **resuelto** (commit `67f2fea`).
2. ~~🟢 **Fácil + Prácticas:** no llamar a `/api/account/me` si no hay cookie de sesión~~ — **resuelto** con cookie indicadora `gz_auth` (commit `67f2fea`).
3. ~~🟡 **Media:** añadir `<link rel="preload">` para la imagen LCP del hero~~ — **resuelto en 6.4**.
4. 🔴 **Alta complejidad:** redistribución forzada — solo abordar si el Rendimiento baja de 95.

---

---

## FASE 11 — BUGS CRÍTICOS (reportados por testers 18/06/2026) 🔴

### 11.1 — Se puede comprar gratis 🔴 CRÍTICO
- El flujo de checkout acepta órdenes sin validar que el importe > 0 o que el carrito tiene stock real.
- **Acción:** en `/api/checkout` y `/api/payments/stripe/create-session` verificar que `totalAmount > 0` y que todos los slugs existen y tienen stock antes de crear la sesión/orden.

### 11.2 — Faltan las claves de los juegos en el email de compra 🔴 CRÍTICO
- El email de confirmación no incluye la clave del juego, descripción breve ni enlace de vuelta.
- **Acción:** en el servicio de email post-pago añadir: logo de GameZone arriba, clave del juego, nombre + descripción corta, enlace a la ficha. Revisar `src/services/auth/email.ts` y el webhook de Stripe/PayPal.

### 11.3 — No se puede eliminar datos personales ni cuenta 🔴 CRÍTICO
- No existe endpoint `DELETE /api/account` ni forma de borrar campos opcionales (teléfono, dirección).
- **Acción:** crear `DELETE /api/account` con confirmación por contraseña; permitir enviar `null` en los campos opcionales del `PATCH /api/account/me`.

### 11.4 — Sin validación de formularios en datos de cuenta 🟠 ALTA
- Email sin validación de formato, código postal acepta texto, teléfono sin prefijo de país.
- **Acción:**
  1. Validar email con regex en frontend y backend (ya hay Zod, añadir `.email()`).
  2. Código postal: solo dígitos, longitud según país.
  3. Teléfono: prefijo automático según campo `country` (ej. España → +34), editable manualmente. Usar librería `libphonenumber-js` o prefijos hardcodeados por país.

---

## FASE 12 — UX ROTA (reportada por testers 18/06/2026) 🟠

### 12.1 — Nick de usuario no aparece — solo "Mi cuenta" 🟠 ALTA · ✅ VERIFICADO HECHO (18/06/2026)
- La cabecera de cuenta muestra "Mi cuenta" fijo en lugar del nick/nombre del usuario.
- **Acción:** en `AccountDashboard.tsx` leer `user.name` (o nick si se añade campo) desde `/api/account/me` y mostrarlo en el título. Añadir campo `username` a la BD si no existe.
- **Verificado en código:** `src/app/account/page.tsx` línea 32 — `sessionDisplayName = user?.name?.trim() || session.email`; línea 85 — `<h1 className="auth-title">{sessionDisplayName}</h1>`. "Mi cuenta" solo queda como kicker secundario (línea 84), el `<h1>` ya muestra el nombre real. No requiere acción.

### 12.2 — Buscador con scope incorrecto 🟠 ALTA (fallo grave) · ⚠️ PARCIAL
- Desde la página "Ver todos los juegos" (`/games`) el buscador lleva a las cards de la home en lugar de filtrar en `/games`.
- Sin panel de sugerencias al buscar desde ficha de detalle.
- **Acción:**
  1. Detectar ruta actual en el componente de búsqueda: si `pathname === "/"` filtrar en home; si `pathname === "/games"` filtrar en `/games`.
  2. Añadir dropdown de sugerencias (top 5 resultados) visible desde cualquier página, con link directo a la ficha.
- **Verificado en código:** `Header.tsx` línea 219 — la redirección a `/?q=` solo ocurre si `pathname !== "/" && pathname !== "/games"`; en `/games` usa el mismo `SearchContext` que lee `games/page.tsx`. **El punto 1 ya está resuelto.** El punto 2 (dropdown de sugerencias) sigue sin existir — no hay ningún componente de sugerencias en `Header.tsx`. Falta solo el dropdown.

### 12.3 — Botones PlayStation/Xbox/Nintendo/PC no filtran en cuenta ni pedidos 🟠 ALTA · ⚠️ PARCIAL
- Los chips de plataforma solo funcionan en la home. En historial de pedidos y en pedidos de admin no hacen nada.
- **Acción:** en `AccountDashboard` (historial de pedidos) y en `AdminOrdersPanel` añadir filtro por plataforma usando los mismos chips. Si se está en la home, navegar y filtrar las cards.
- **Verificado en código:** `AccountOrdersHistory.tsx` **ya filtra por plataforma** (usa `useSearch()`, mapea slug→platform, muestra "Filtrando por plataforma..."). Lado cuenta resuelto. `AdminOrdersPanel.tsx` no tiene ningún filtro de plataforma — sigue pendiente solo el lado admin.

### 12.4 — Panel de cuenta muy básico y lento 🟠 ALTA · ⚠️ PARCIAL
- Los datos tardan en cargar (sin caché), siempre hay inputs visibles, la foto ocupa demasiado.
- **Acción:**
  1. Cachear respuesta de `/api/account/me` en el cliente con `stale-while-revalidate` o `useSWR`.
  2. Modo visualización por defecto; inputs solo al pulsar icono "Editar".
  3. Reducir tamaño del avatar en el panel; mostrar nombre/nick/email en la cabecera.
- **Verificado en código:** punto 2 **ya hecho** — `AccountDashboard.tsx` tiene `isEditingDetails`/`isEditingProfile` (default `false`) con patrón `!isEditingProfile ? <vista> : <form>` (líneas 1001 y 1160). Punto 1 (SWR/caché) **no implementado**, sigue siendo `fetch` simple. Punto 3 (tamaño avatar) no verificado todavía.

### 12.5 — "También te puede interesar" siempre los mismos juegos 🟠 ALTA · ✅ MAYORMENTE HECHO
- La sección de recomendaciones en la ficha no cambia ni tiene en cuenta historial/categoría.
- **Acción:** en `GameDetailClient` ordenar sugerencias: 1º misma categoría que el juego actual, 2º vistos recientemente, 3º random. Excluir el juego actual.
- **Verificado en código:** `src/app/games/[slug]/page.tsx` líneas ~118-129 — ya construye `suggestions` como `byGenre` (misma categoría, ordenado por descuento, top 3) + `filler` aleatorio del resto que no esté en `byGenre`, recortado a 3. Falta solo el criterio "2º vistos recientemente" (usa random en su lugar) — mejora menor, no el bug grave reportado.

### 12.6 — Contador en Juegos Destacados llega a 0 y no rota 🟠 ALTA · ✅ APARENTA RESUELTO (verificar visualmente)
- El countdown de ofertas llega a 0 y no avanza al siguiente juego ni se resetea.
- **Acción:** en el componente de Juegos Destacados, cuando `timeLeft === 0` avanzar al siguiente item del carrusel y reiniciar el timer.
- **Verificado en código:** `FeaturedSection.tsx` (`DealsOfTheDay`) ya tiene `setInterval` que al llegar a `t<=1` hace `setActiveIndex((i) => (i+1) % games.length)` y resetea `timeLeft` a `DEAL_ROTATE_S` (8s). El carrusel de destacados rota correctamente. Posible confusión con el countdown individual de `GameCard.tsx` (campo `saleEndsAt` por producto): ese sí desaparece (`setTimeLeft(null)`) cuando la oferta caduca, lo cual es correcto si nadie actualiza la fecha — no es un bug de código, es dato de admin caducado. Recomendado confirmar con el tester a qué contador se refería antes de tocar nada.

### 12.7 — Pedidos de admin sin paginación ni filtros de plataforma 🟡 MEDIA · 🔴 PENDIENTE CONFIRMADO
- La auditoría de transacciones muestra todos los pedidos sin paginar.
- **Acción:** paginación de 20 por página + filtros por estado (pendiente/pagado/reembolsado) y pasarela (Stripe/PayPal/manual) en `AdminOrdersPanel`.
- **Verificado en código:** no hay rastro de paginación, `slice`, ni filtros de plataforma/estado en `AdminOrdersPanel.tsx`. Sigue pendiente en su totalidad.

### 12.8 — Logo G2A incorrecto en ficha de detalle 🟡 MEDIA · 🔴 PENDIENTE CONFIRMADO
- En la sección "Enlaces" de la ficha aparece un icono genérico en lugar del logo de G2A.
- **Acción:** usar el logo SVG correcto de G2A en `GameDetailClient` para los enlaces externos.
- **Verificado en código:** `GameDetailClient.tsx` líneas 323-338 — el enlace externo usa `<SteamIcon />` solo si `externalStoreLabel` contiene "steam"; para cualquier otra tienda (incluido G2A) cae al `<StoreIcon />` genérico. No existe `G2AIcon`. Confirmado pendiente.

### 12.9 — Formato de imágenes API mal recortado en PC 🟡 MEDIA · 🔴 PENDIENTE CONFIRMADO
- Las imágenes de la API (panorámicas 16:9) se recortan en la Sección Destacada en PC donde el contenedor es más alto que ancho.
- **Acción:** en `FeaturedSection` aplicar `object-fit: contain` o `object-position: top` en el breakpoint de escritorio para imágenes de API externa; reservar `cover` para imágenes propias.
- **Verificado en código:** `FeaturedSection.module.scss` línea 367 — solo se ajustó `object-position: top center !important` en `.featuredDealCover img`; no hay `object-fit: contain` ni distinción por breakpoint de escritorio. El recorte en PC sigue sin resolverse del todo.

---

## FASE 13 — FEATURES PENDIENTES (roadmap activo 18/06/2026) 🔵

### 13.1 — OAuth Google/Facebook/Twitter al registrarse
- Los botones de social login no están activos en el registro.
- **Acción:** activar los mismos providers OAuth que ya existen en login (`/api/auth/oauth/[provider]`) en la página de registro. Verificar que el flujo crea cuenta si no existe.

### 13.2 — Logos de API en las cards (Steam/G2A/Xbox)
- Las cards no indican de qué API proviene el precio.
- **Acción:** en `GameCard` añadir badge pequeño con logo de la fuente (Steam/G2A/Xbox) encima del precio según el campo `storeLabel` o `platform`.

### 13.3 — Comparador de precios entre APIs
- No hay comparación de precios entre Steam, G2A y Xbox para el mismo juego.
- **Acción (complejo):** en la ficha de detalle, sección "Mejor precio", llamar a las APIs disponibles con el slug/nombre del juego y mostrar los 3 mejores precios con logo de fuente.

### 13.4 — Sección Xbox
- No existe sección dedicada a juegos de Xbox en la home ni en el menú.
- **Acción:** añadir filtro Xbox al `PlatformBar` y una sección en la home similar a la de PlayStation/Nintendo.

### 13.5 — Sistema de planes Premium (estilo G2A Plus)
- Los testers proponen un modal de suscripción mensual/trimestral/anual con ventajas (descuentos, puntos).
- **Acción (futuro):** diseñar modelo de datos `Subscription` en Prisma + UI modal con planes 1/3/12 meses + integración Stripe recurring.

### 13.6 — Traducción via API (no hardcodeada)
- Los textos i18n están hardcodeados en ES/EN. No hay detección automática ni API de traducción.
- **Acción (complejo):** evaluar integración con DeepL API o i18next con archivos de traducción por locale. Eliminar los ternarios `lang === "en" ? ... : ...` progresivamente.

### 13.7 — Email de compra mejorado (ver 11.2)
- Ver tarea 11.2 — misma acción, se registra aquí como feature UX además de bug crítico.

---

## FASE 14 — INVENTARIO DE CLAVES DE JUEGO 🔴 CRUCIAL ANTES DE VENTA REAL

> **Contexto:** GameZone planea vender juegos reales en el futuro (modelo revendedor de claves,
> igual que G2A, Instant Gaming o Eneba). Sin este sistema el checkout con Stripe/PayPal procesa
> pagos reales pero no entrega nada al comprador. **No lanzar ventas reales sin esta fase.**
>
> **Nota sobre APIs de Steam/G2A/Xbox:** ninguna ofrece API pública de compra/reventa en tiempo
> real. El modelo correcto es comprar claves a distribuidores (Genba, Fanatical, etc.) y subirlas
> al sistema como inventario propio.

### 14.1 — Modelo de datos `GameKey` 🔴 CRÍTICO
- **Acción:** añadir al schema de Prisma:
  ```prisma
  model GameKey {
    id              String    @id @default(uuid())
    productSlug     String
    keyCode         String    @unique
    platform        String    @default("PC")
    assignedOrderId String?
    assignedItemId  String?
    assignedAt      DateTime?
    createdAt       DateTime  @default(now())
    product         Product   @relation(fields: [productSlug], references: [slug])
    @@index([productSlug, assignedOrderId])
  }
  ```
- Añadir `keys GameKey[]` a `model Product`.
- Migración: `npx prisma migrate dev --name add-game-keys`.

### 14.2 — Panel admin: gestión de claves 🔴 CRÍTICO
- En `AdminProductsPanel` añadir pestaña "Claves" por producto:
  - Ver stock de claves disponibles (count de `assignedOrderId IS NULL`)
  - Subir claves en bloque: textarea con una clave por línea o importación CSV
  - Ver claves asignadas con el pedido correspondiente
  - Eliminar claves no asignadas erróneas
- Endpoint: `POST /api/admin/products/[slug]/keys` (subir), `GET /api/admin/products/[slug]/keys` (listar), `DELETE /api/admin/keys/[id]` (borrar)

### 14.3 — Asignación automática en `completePaidOrder` 🔴 CRÍTICO
- En `src/services/checkout/order-service.ts`, dentro de `completePaidOrder`, tras marcar el pedido como pagado:
  1. Para cada `OrderItem`, buscar la primera `GameKey` disponible (`assignedOrderId IS NULL`) del `productSlug` correspondiente.
  2. Asignarla atómicamente dentro de la misma transacción Prisma (`updateMany` con condición `assignedOrderId IS NULL`).
  3. Si no hay claves disponibles para algún producto: marcar el pedido con `status: "paid_pending_key"` y enviar alerta por email al admin.
  4. Guardar `keyCode` en el `OrderItem` (añadir campo `gameKey String?` al modelo `OrderItem`).

### 14.4 — Mostrar clave en email de confirmación 🔴 CRÍTICO
- En `sendPurchaseConfirmationEmail` (`src/services/auth/email.ts`): añadir sección por cada ítem con:
  - Nombre del juego
  - **Clave de activación:** `XXXXX-XXXXX-XXXXX` (formato Steam/Xbox/etc.)
  - Instrucciones de activación según plataforma (Steam: ir a steam.com/activate, Xbox: redeem.microsoft.com, etc.)
  - Enlace a la ficha del juego

### 14.5 — Mostrar clave en panel de cuenta 🟠 ALTA
- En `AccountOrdersHistory` y en la vista de pedido individual: mostrar la clave asignada a cada ítem.
- La clave se puede copiar con un botón "Copiar clave".
- Solo visible para pedidos con `status: "paid"`.

### 14.6 — Alertas de stock bajo al admin 🟡 MEDIA
- Cuando queden menos de 3 claves disponibles para un producto, enviar email de alerta al admin.
- Se puede implementar como un cron diario o al momento de asignar la última clave.

### 14.7 — Validación pre-checkout de stock de claves 🟡 MEDIA
- Antes de redirigir a Stripe/PayPal, verificar que hay al menos 1 clave disponible por producto en el carrito.
- Si no hay: bloquear el checkout y mostrar "Sin stock de claves — contacta con soporte".

---

## Tecnologías a incorporar en esta v2 (resumen)
- **unstable_cache / revalidateTag** (Next.js, ya disponible) — caché del catálogo. Sin dependencias nuevas.
- **Playwright** — E2E estándar (sustituye gradualmente los scripts a medida).
- **Dependabot** — actualizaciones de seguridad automáticas. Sin código.
- **Lighthouse CI** — presupuesto de rendimiento en CI. Incorporado el 13/06/2026.
- **Cloudflare Turnstile** (opcional, diferido; solo si hay bots) — anti-bot sin fricción.
- **Upstash Redis** — incorporado el 17/06/2026 para rate limit distribuido con fallback PostgreSQL.

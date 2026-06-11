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
| 2.4 — Cabeceras de seguridad | ✅ hecho · ⚠️ CSP débil, ver tarea 7.1 |
| 2.5 — Validación `event.type` webhooks | ✅ hecho |
| 3.1 — Zod en bodies de API | ✅ hecho |
| 3.2 — Rate limit distribuido (Upstash) | ⬜ pendiente (opcional) |
| 3.3 — Sentry | ✅ **HECHO** (verificado: `withSentryConfig` en `next.config.mjs`, configs server/edge/client) — la v1 lo marcaba pendiente por error |
| 3.4 — CI GitHub Actions | ✅ hecho |
| 3.5 — Tests de integración | ✅ **HECHO** (11/06/2026; 48 tests: servicios de checkout/sesión + rutas webhook Stripe/PayPal + login/2FA) |
| 4.1 — SEO básico (sitemap/robots/OG/Search Console) | ✅ hecho |
| 4.1b — SEO avanzado (metadata por juego + JSON-LD) | ✅ **HECHO** (11/06/2026; ficha split server/client, `generateMetadata` y JSON-LD `Product`) |
| 4.2 — Dominio propio | ⬜ pendiente (manual, usuario) |
| 4.6 — Subida de imágenes de producto | ✅ **HECHO** (verificado: modelo `ProductImage`, rutas `api/admin/product-images` y `api/product-images`, inputs `type="file"` en `AdminProductsPanel.tsx`) |
| **FASE 6 — Rendimiento** | ⚠️ en curso — **6.1 ✅ 6.2 ✅ 6.3 ✅ 6.4 ✅** hechas; 6.5 ⚠️ baseline registrado (móvil 79/LCP 5.3s, PC 99/LCP 0.6s), pendiente nueva medición post-deploy |
| **FASE 7 — Seguridad avanzada** | ⬜ NUEVA |
| **FASE 8 — SEO avanzado** | ⚠️ en curso — **8.1/8.2/8.3 ✅ hechas**; 8.4 y 8.5 pendientes |
| **FASE 9 — UI/UX** | ⬜ NUEVA (parte obligatoria + parte opcional) |
| **FASE 10 — Testing y robustez** | ⚠️ en curso — **10.1 ✅ hecha el 11/06/2026** (48 tests verdes; webhooks Stripe/PayPal y login+2FA cubiertos); 10.2-10.4 pendientes |

**Acciones manuales del usuario aún pendientes:** rotación de secretos (0.1), URL pooled en Netlify (1.1), dominio propio (4.2).

---

## FASES 0–5 (v1) — resumen

Las fases 0–3 están completas salvo 3.2 (Upstash, opcional). 3.5 quedó cubierto y ampliado el 11/06/2026 con tests de servicios, sesión, webhooks Stripe/PayPal y login + 2FA; el resto de robustez continúa en FASE 10.
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
- **Pendiente:** `<link rel="preload">` para imagen LCP del hero (ver 6.5 punto 2).
- **Verificar:** en DevTools → Network, las imágenes del grid en móvil pesan menos; no hay CLS.

### 6.5 — Medición objetiva (antes y después)  🟡 MEDIA  ⚠️ PARCIAL
> **Baseline Lighthouse registrado el 11/06/2026:**
> - Móvil: Rendimiento **79**, LCP **5.3s**, Speed Index **3.7s**, FCP **0.9s**, CLS **0**, TBT **60ms**
> - PC: Rendimiento **99**, LCP **0.6s**, Speed Index **1.3s**, FCP **0.3s**, CLS **0.019**, TBT **10ms**
> - Principal problema identificado: imágenes sin optimizar en móvil (4657 KiB).
> - Pendiente: nueva medición tras deploy con 6.4 aplicado para confirmar mejora.
- **Acción:** correr Lighthouse (Chrome DevTools, modo incógnito, Performance) sobre la home en
  producción ANTES de empezar la fase y DESPUÉS de 6.1-6.4. Guardar ambos reports en
  `docs/lighthouse/` (JSON o captura).
- **Objetivo:** Performance ≥ 90 móvil, LCP < 2.5s, CLS < 0.1.
- **Nota:** sin medición no se puede afirmar mejora. Este paso no es opcional.

---

## FASE 7 — SEGURIDAD AVANZADA  🟠

> Lo crítico ya está hecho (fases 0-2). Esto es endurecimiento de nivel producción real.

### 7.1 — Endurecer la CSP: eliminar `unsafe-eval`, plan para `unsafe-inline`  🟠 ALTA
- **Problema:** `next.config.mjs:12` → `script-src 'self' 'unsafe-inline' 'unsafe-eval' ...`.
  `unsafe-eval` + `unsafe-inline` anulan gran parte de la protección XSS de la CSP: un atacante
  que logre inyectar HTML puede ejecutar scripts.
- **Acción (incremental, con cuidado):**
  1. Quitar `'unsafe-eval'` y probar el build de producción completo (Next en prod no necesita
     eval; el dev server sí — si rompe dev, condicionar la cabecera por `NODE_ENV`).
  2. Probar exhaustivamente Stripe y PayPal tras el cambio (son los terceros del `script-src`).
  3. `'unsafe-inline'` en `script-src`: dejarlo de momento (Next inyecta inline scripts);
     anotar como deuda la migración a CSP con nonce vía middleware cuando Next/Netlify lo
     soporten bien. NO intentar nonces ahora: alto riesgo de romper hidratación.
- **Verificar:** sin errores CSP en consola en: home, ficha, auth, checkout Stripe y PayPal
  completos en producción.

### 7.2 — Rotación de secretos (recordatorio de 0.1)  🔴 MANUAL PENDIENTE
- Sigue pendiente desde la v1. Mientras no se haga, los secretos que convivieron con el `.db`
  filtrado deben considerarse comprometidos: `SESSION_SECRET`, claves Stripe/PayPal, SMTP,
  OAuth, `CRON_SECRET`, `ENCRYPTION_KEY`.
- **Acción (usuario, ~30 min):** regenerar cada secreto en su panel (Stripe, PayPal, Google,
  etc.), actualizar env vars en Netlify, redeploy, forzar reset de contraseña a usuarios reales
  del `.db` antiguo.

### 7.3 — Cookie del carrito anónimo legible por JS  🟡 MEDIA
- **Problema:** `middleware.ts:65` crea `gamezone_cart_session` con `httpOnly: false`.
- **Acción:** comprobar si el código cliente lee esa cookie (`grep -rn "gamezone_cart_session" src/`).
  - Si NO la lee nadie en cliente → cambiar a `httpOnly: true`.
  - Si SÍ la lee → dejarla, pero documentar el porqué en un comentario en el middleware
    (decisión consciente, impacto bajo: solo identifica un carrito anónimo).
- **Verificar:** carrito anónimo sigue funcionando en pestañas nuevas/incógnito.

### 7.4 — Auditoría de dependencias automatizada  🟡 MEDIA
- **Acción:**
  1. Correr `npm audit --omit=dev` y resolver lo que salga high/critical.
  2. Añadir `npm audit --omit=dev --audit-level=high` como step del CI (que falle el build).
  3. Activar **Dependabot** en GitHub (`.github/dependabot.yml`, ecosistema npm, weekly).
- **Verificar:** CI falla si entra una dependencia con CVE high; PRs de Dependabot llegan.

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

### 8.4 — Idioma declarado vs idioma real  🟡 MEDIA
- **Problema:** `layout.tsx` fija `<html lang="es">` pero la UI tiene textos en/es vía
  `useLocale`. Para buscadores y lectores de pantalla el sitio declara solo español.
- **Acción (mínima, sin i18n de rutas):** decidir el idioma canónico (es) y mantenerlo, PERO
  unificar los textos visibles: hoy hay strings hardcodeados mezclados. Crear
  `src/lib/i18n.ts` con un diccionario simple `{ es: {...}, en: {...} }` y migrar los textos de
  los componentes principales (Header, Hero, GameGrid, CartDrawer, Footer). NO montar rutas
  `/en/*` todavía (eso es FASE 5 / futuro).
- **Verificar:** cambiar de idioma no deja textos mezclados en la home ni en la ficha.

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

### Parte B — Modernización estética  🔵 OPCIONAL (elegir con el usuario)

> Inspirado en patrones estándar de las tiendas de videojuegos actuales. Cada punto es
> independiente. El diseño actual (tema oscuro #22242A, grid de tarjetas, hero) se mantiene
> como base — esto son capas encima, no un rediseño.

- **B1 — Fila de confianza** bajo el hero: iconos de "Entrega inmediata", "Pago seguro"
  (logos Visa/Mastercard/PayPal), "Soporte 24h". Patrón universal en Eneba/Instant Gaming/G2A;
  es lo que más "tienda real" transmite de toda la lista. Coste: bajo (HTML+SCSS).
- **B2 — Chips de filtro** sobre el grid: género/plataforma/oferta como botones-píldora
  clicables, en lugar de solo búsqueda por texto. Coste: medio (los datos de género ya existen
  vía RAWG).
- **B3 — Micro-interacciones en tarjetas:** hover con `transform: translateY(-4px)` + sombra +
  zoom sutil de la imagen (`scale(1.05)` con `overflow: hidden`). Respetar
  `prefers-reduced-motion`. Coste: bajo.
- **B4 — CTA pegajoso en ficha móvil:** barra inferior fija con precio + "Añadir al carrito"
  al hacer scroll en la ficha (patrón Epic/Steam móvil). Coste: bajo-medio.
- **B5 — "Vistos recientemente":** carrusel al final de la home/ficha con los últimos 6 juegos
  visitados (localStorage, sin backend). Coste: bajo.
- **B6 — Wishlist visible:** ya existe `ProductLike` en el modelo — exponer los likes como
  "Mi lista" en el menú de cuenta y un corazón en las tarjetas. Coste: medio (la base ya está).
- **B7 — Cuenta atrás en ofertas:** si un producto tiene oferta con fecha fin, mostrar countdown
  en la tarjeta (urgencia, patrón Instant Gaming). Requiere campo `saleEndsAt` en Product.
  Coste: medio.
- **B8 — Tipografía display propia:** una fuente de título gaming (p. ej. una grotesk condensada)
  vía `next/font/local` solo para h1/h2/hero, manteniendo system-ui en el cuerpo (que es óptimo
  para rendimiento). Cambia mucho la personalidad con poco coste. Coste: bajo.

---

## FASE 10 — TESTING Y ROBUSTEZ  🟡

### 10.1 — Tests de integración de los flujos críticos (absorbe 3.5)  🟠 ALTA  ✅ HECHA
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

### 10.2 — E2E reales con Playwright  🟡 MEDIA
- **Estado:** existen scripts e2e a medida (`scripts/e2e-*.mjs`) — útiles pero frágiles y fuera
  del runner estándar.
- **Acción:** montar Playwright con 3 specs: (1) compra completa con tarjeta test de Stripe,
  (2) registro + verificación + login, (3) búsqueda + añadir al carrito + persistencia tras
  recargar. Integrarlo como job manual/nightly en CI (no en cada PR, es lento).
- **Verificar:** `npx playwright test` verde en local contra build de producción.

### 10.3 — CI ampliado  🟡 MEDIA
- **Acción:** al workflow actual (tsc + vitest + build) añadir: `eslint`, `npm audit
  --audit-level=high` (de 7.4), y opcionalmente **Lighthouse CI** contra el deploy preview de
  Netlify con presupuesto (Performance ≥ 85) para que una regresión de rendimiento falle el PR.
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
| 2 | Rendimiento | **Descubrimiento de solicitudes de LCP** — imagen hero no descubierta en HTML inicial | ✅ Añadir `<link rel="preload">` en `page.tsx` |
| 3 | Rendimiento | **Redistribución forzada** — JS lee layout y escribe DOM en el mismo frame | ⚠️ Requiere profiling en DevTools |
| 4 | Accesibilidad | **Encabezados fuera de orden secuencial** — salto de nivel `<h>` (ej. h1→h3) en Hero/GameGrid | ✅ Fácil — revisar jerarquía `<h>` |
| 5 | Prácticas | **Errores en consola** — `/api/account/me` falla en carga (usuario no autenticado); error externo de `wikia.nocookie.net` | ✅ Suprimir fetch si no hay sesión |
| 6 | Prácticas | **Sin source maps** para JS propio de gran tamaño | ❌ No afecta al usuario |

### Prioridad de acción

1. 🟢 **Fácil + Accesibilidad:** corregir orden de `<h>` en componentes Hero/GameGrid (tarea 9.3).
2. 🟢 **Fácil + Prácticas:** no llamar a `/api/account/me` si no hay cookie de sesión — evita el error de consola.
3. 🟡 **Media:** añadir `<link rel="preload">` para la imagen LCP del hero en `page.tsx`.
4. 🔴 **Alta complejidad:** redistribución forzada — solo abordar si el Rendimiento baja de 95.

---

## Tecnologías a incorporar en esta v2 (resumen)
- **unstable_cache / revalidateTag** (Next.js, ya disponible) — caché del catálogo. Sin dependencias nuevas.
- **Playwright** — E2E estándar (sustituye gradualmente los scripts a medida).
- **Dependabot** — actualizaciones de seguridad automáticas. Sin código.
- **Lighthouse CI** (opcional) — presupuesto de rendimiento en CI.
- **Cloudflare Turnstile** (opcional, solo si hay bots) — anti-bot sin fricción.
- **Upstash Redis** (opcional, hereda de 3.2) — rate limit distribuido si crece el tráfico.

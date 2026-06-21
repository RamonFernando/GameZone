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
| **P1 — Ofertas del día** | ✅ RESUELTO 20/06/2026 — verificado visualmente por Ramón. Commit 9769a95. |
| **FASE 11 — Bugs críticos** | ✅ 11.1/11.3 ✅; 11.2 ✅ (claves en email cubiertas por Fase 14); 11.4 ⚠️ parcial (prefijo país + postal específica por país pendientes) |
| **FASE 12 — UX rota** | ⚠️ en curso · 🔴 **REABIERTOS por testing de Ramón 20/06**: 12.1 (falta Nick real), 12.2 (sin mergear a main), 12.6 (countdown a cero sigue roto), 12.4 (pedidos lentos/"no funcionan"). 12.5/12.8/12.9 ✅; 12.3/12.7 ✅ (GPT, sin mergear). Ver sección "FEEDBACK DE TESTING". |
| **FASE 14 — Claves de juego** | ⚠️ en curso — **14.0b/14.1/14.2/14.3/14.4/14.5/14.6 ✅**; 14.7 ⬜ (validación pre-checkout, requiere flag o inventario real) |
| **FASE 15 — Cards y plataformas** | ⬜ FUTURO — 15.1 comparador de precios en card, 15.2 formato portrait, 15.3 roadmap de APIs (GOG, Epic, Eneba, EA, PlayStation, Nintendo…) |
| **FASE 16 — Reestructuración MVC** | ⬜ PENDIENTE — 160 estilos inline a erradicar, paneles cuenta/admin sin módulo CSS, archivos de 1600-1800 L a trocear. Reorganización sin cambio de comportamiento. |
| **FASE 17 — Sistema de diseño** | ⬜ DISEÑO — primitivos reutilizables + rediseño de card/header/footer/carrusel/secciones/comparador/cuenta/pedidos/admin. Ramón elige variantes A/B/C. |

**Acciones manuales del usuario aún pendientes:** rotación de secretos (0.1), URL pooled en Netlify (1.1), dominio propio (4.2).

---

## ✅ PROBLEMAS PRIORITARIOS RESUELTOS

### P1 — "Ofertas del día": la carta de Age of Empires (panel izquierdo/Steam) no cambia a su 2º juego · ✅ RESUELTO (20/06/2026)

**Síntoma (reportado por Ramón, 19/06/2026):** en `FeaturedSection` → `DealsOfTheDay`, los paneles central (G2A) y derecho (Xbox) sí rotan y muestran su 2º juego, pero el panel izquierdo (Steam/Age of Empires) parece quedarse siempre en el mismo juego.

**Causa raíz (confirmada inspeccionando localhost:3000 en vivo):** la rotación recorre los paneles de derecha a izquierda y solo un panel está "activo" a la vez (una sola barra). Los paneles que ya pasaron su turno se quedan mostrando su 2º juego; pero el panel izquierdo es el **último** de la cola, así que solo muestra su 2º juego durante 1 slot y enseguida el ciclo se reinicia al primer juego. No tiene "tiempo de después" para mantenerlo, por eso parece que nunca cambia. Además, con menos de 6 ofertas el último slot puede no alcanzarse nunca (`activeSlot % games.length` + `PANEL_SIZE` fijo).

**Intentos realizados (todos revertidos por efectos secundarios):**
- Rotación independiente por panel → aparecían **2 barras** a la vez (rechazado).
- Invertir dirección a izquierda→derecha → Ramón quiere mantener el salto **derecha→izquierda** (rechazado).
- Rotación por slot-real + memoria por panel (`shown`) para que cada carta mantenga su último juego → lógicamente correcto pero **no verificable** y dejó la rotación inconsistente.

**Bloqueo de verificación (importante para quien lo retome):** no se pudo confirmar ningún fix en vivo porque (a) el dev server lleva corriendo desde antes de las ediciones, en carpeta **Dropbox**, y recompila de forma irregular (sirve chunks cacheados/stale), y (b) la pestaña de automatización va en segundo plano (`document.hidden`), donde el navegador limita los `setInterval` y congela la rotación. **Verificación fiable = reiniciar limpio el dev server (`Ctrl+C` + `npm run dev`) y probar en una pestaña en primer plano.**

**Archivo:** `src/components/features/FeaturedSection.tsx` (componente `DealsOfTheDay` y `PlatformPanel`).
**Restricciones de Ramón:** mantener una sola barra, salto derecha→izquierda, no tocar el resto del diseño.
**Estado:** ✅ RESUELTO — verificado visualmente por Ramón (20/06/2026). Commit 9769a95.

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

### 11.1 — Se puede comprar gratis 🔴 CRÍTICO · ✅ HECHO (18/06/2026)
- El flujo de checkout acepta órdenes sin validar que el importe > 0 o que el carrito tiene stock real.
- **Acción:** en `/api/checkout` y `/api/payments/stripe/create-session` verificar que `totalAmount > 0` y que todos los slugs existen y tienen stock antes de crear la sesión/orden.
- **Implementado/verificado en código:** la validación vive en `src/services/checkout/order-service.ts`, no duplicada en cada ruta. `normalizeOrderItemsFromDb()` exige carrito no vacío, slugs activos existentes, cantidad entera entre 1 y 5, consolidación de duplicados y stock suficiente; `createPendingOrder()` bloquea `totalAmount <= 0`. Aplica a manual, Stripe y PayPal porque las tres rutas llaman a este servicio.

### 11.2 — Faltan las claves de los juegos en el email de compra 🔴 CRÍTICO · ⚠️ PARCIAL (18/06/2026)
- El email de confirmación no incluye la clave del juego, descripción breve ni enlace de vuelta.
- **Acción:** en el servicio de email post-pago añadir: logo de GameZone arriba, clave del juego, nombre + descripción corta, enlace a la ficha. Revisar `src/services/auth/email.ts` y el webhook de Stripe/PayPal.
- **Implementado:** `sendPurchaseConfirmationEmail()` añade logo opcional (`MAIL_LOGO_URL`), enlace a la ficha por cada juego (`/games/[slug]`) y CTA "Ver pedido en mi cuenta"; `completePaidOrder()` pasa `baseUrl`.
- **Pendiente real:** claves de activación y stock de claves no existen todavía en el modelo de datos. Se cubre en FASE 14 (`GameKey`, asignación automática y mostrar clave en email/panel). No marcar como completo hasta implementar esa fase.

### 11.3 — No se puede eliminar datos personales ni cuenta 🔴 CRÍTICO · ✅ VERIFICADO HECHO (18/06/2026)
- `DELETE /api/account` existe en `src/app/api/account/route.ts` con confirmación por contraseña y cascade completo.
- `PATCH /api/account/me` ya acepta `null` en todos los campos opcionales (phone, addressLine1, city, postalCode, country, province).
- UI tiene diálogo de borrado con campo contraseña (`AccountDashboard.tsx` líneas 136-139, 742, 1664).
- No requiere acción.

### 11.4 — Sin validación de formularios en datos de cuenta 🟠 ALTA · ⚠️ PARCIAL (18/06/2026)
- Email sin validación de formato, código postal acepta texto, teléfono sin prefijo de país.
- **Acción:**
  1. Validar email con regex en frontend y backend (ya hay Zod, añadir `.email()`).
  2. Código postal: solo dígitos, longitud según país.
  3. Teléfono: prefijo automático según campo `country` (ej. España → +34), editable manualmente. Usar librería `libphonenumber-js` o prefijos hardcodeados por país.
- **Implementado:** backend `PATCH /api/account/me` valida email con `.email()` solo si cambia; frontend valida postal y teléfono antes de guardar. Teléfono exige formato internacional con `+`.
- **Pendiente:** prefijo automático por país y validación postal específica por país no están implementados; el postal permite letras/números/guiones para soportar países no españoles.

---

## FASE 12 — UX ROTA (reportada por testers 18/06/2026) 🟠

### 12.1 — Nick de usuario no aparece — solo "Mi cuenta" 🟠 ALTA · ✅ VERIFICADO HECHO (18/06/2026)
- La cabecera de cuenta muestra "Mi cuenta" fijo en lugar del nick/nombre del usuario.
- **Acción:** en `AccountDashboard.tsx` leer `user.name` (o nick si se añade campo) desde `/api/account/me` y mostrarlo en el título. Añadir campo `username` a la BD si no existe.
- **Verificado en código:** `src/app/account/page.tsx` línea 32 — `sessionDisplayName = user?.name?.trim() || session.email`; línea 85 — `<h1 className="auth-title">{sessionDisplayName}</h1>`. "Mi cuenta" solo queda como kicker secundario (línea 84), el `<h1>` ya muestra el nombre real. No requiere acción.

### 12.2 — Buscador con scope incorrecto 🟠 ALTA (fallo grave) · ✅ HECHO (19/06/2026)
- Desde la página "Ver todos los juegos" (`/games`) el buscador lleva a las cards de la home en lugar de filtrar en `/games`.
- Sin panel de sugerencias al buscar desde ficha de detalle.
- **Acción:**
  1. Detectar ruta actual en el componente de búsqueda: si `pathname === "/"` filtrar en home; si `pathname === "/games"` filtrar en `/games`.
  2. Añadir dropdown de sugerencias (top 5 resultados) visible desde cualquier página, con link directo a la ficha.
- **Implementado:** punto 1 resuelto previamente (18/06/2026). Punto 2 (dropdown de sugerencias) implementado por GPT en `Header.tsx` + `Header.module.scss` — commit `07d9443` (rama `dev-19062026-gpt`, pendiente merge a main).
- **Nota:** merge a main pendiente para que los cambios de GPT (12.2 + 12.3/12.7) lleguen a producción.

### 12.3 — Botones PlayStation/Xbox/Nintendo/PC no filtran en cuenta ni pedidos 🟠 ALTA · ✅ HECHO (19/06/2026)
- Los chips de plataforma solo funcionan en la home. En historial de pedidos y en pedidos de admin no hacen nada.
- **Acción:** en `AccountDashboard` (historial de pedidos) y en `AdminOrdersPanel` añadir filtro por plataforma usando los mismos chips. Si se está en la home, navegar y filtrar las cards.
- **Implementado:** lado cuenta (`AccountOrdersHistory.tsx`) resuelto previamente (18/06/2026). Lado admin (`AdminOrdersPanel.tsx`) resuelto por GPT — commit `4286231` (rama `dev-19062026-gpt`, pendiente merge a main).

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

### 12.7 — Pedidos de admin sin paginación ni filtros de plataforma 🟡 MEDIA · ✅ HECHO (19/06/2026)
- La auditoría de transacciones muestra todos los pedidos sin paginar.
- **Acción:** paginación de 20 por página + filtros por estado (pendiente/pagado/reembolsado) y pasarela (Stripe/PayPal/manual) en `AdminOrdersPanel`.
- **Implementado:** paginación, `statusFilter`, `providerFilter`, controles de página — 18/06/2026. Filtro por plataforma añadido por GPT (commit `4286231`, pendiente merge a main junto con 12.3). Tarea completa.

### 12.8 — Logo G2A incorrecto en ficha de detalle 🟡 MEDIA · ✅ HECHO (18/06/2026)
- En la sección "Enlaces" de la ficha aparece un icono genérico en lugar del logo de G2A.
- **Acción:** usar el logo SVG correcto de G2A en `GameDetailClient` para los enlaces externos.
- **Implementado:** `public/iconos_platforms/icon-g2a.svg` añadido y `GameDetailClient.tsx` usa `G2AIcon` con `next/image` cuando `externalStoreLabel` contiene "g2a". Steam mantiene su icono específico y el resto de tiendas siguen cayendo al icono genérico.
- **Verificado:** `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` y `npm run build` verdes el 18/06/2026.

### 12.9 — Formato de imágenes API mal recortado en PC 🟡 MEDIA · ✅ HECHO (18/06/2026)
- Las imágenes de la API (panorámicas 16:9) se recortan en la Sección Destacada en PC donde el contenedor es más alto que ancho.
- **Acción:** en `FeaturedSection` aplicar `object-fit: contain` o `object-position: top` en el breakpoint de escritorio para imágenes de API externa; reservar `cover` para imágenes propias.
- **Implementado:** la sección de ofertas destacadas pasa de una lista vertical a paneles de plataforma con contenedor 16:9, dots internos y barra de progreso por panel. Esto evita el contenedor alto que forzaba recorte agresivo en imágenes panorámicas de APIs externas.
- **Verificado:** `FeaturedSection.tsx` selecciona hasta 6 ofertas y las reparte en paneles Steam/G2A/Xbox; `FeaturedSection.module.scss` define `featuredDealPlatformGrid`, `featuredDealPanel` y logo superpuesto. Verificación técnica verde: lint, tsc, unit tests y build.

---

## FASE 13 — FEATURES PENDIENTES (roadmap activo 18/06/2026) 🔵

### 13.1 — OAuth Google/Facebook/Twitter al registrarse
- Los botones de social login no están activos en el registro.
- **Acción:** activar los mismos providers OAuth que ya existen en login (`/api/auth/oauth/[provider]`) en la página de registro. Verificar que el flujo crea cuenta si no existe.

### 13.2 — Logos de API en las cards (Steam/G2A/Xbox) ✅ HECHO (18/06/2026)
- Las cards no indican de qué API proviene el precio.
- **Acción:** en `GameCard` añadir badge pequeño con logo de la fuente (Steam/G2A/Xbox) encima del precio según el campo `storeLabel` o `platform`.
- **Implementado:** `GameCard.tsx` muestra iconos Steam/G2A/Xbox en el pill de tienda según `storeLabel`; `MarketIntelligenceSections.tsx` usa el mismo set visual en las tarjetas de fuentes de mercado; `icon-steam.svg` se normalizó y se añadieron `icon-g2a.svg` e `icon-xbox.svg`.
- **Verificado:** sin errores de lint/TypeScript/tests/build. Queda como mejora futura el comparador real entre APIs (13.3), que no se implementó en esta tanda.

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

### 14.1 — Modelo de datos `GameKey` 🔴 CRÍTICO · ✅ HECHO (19/06/2026)
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

### 14.2 — Panel admin: gestión de claves 🔴 CRÍTICO · ✅ HECHO (19/06/2026)
- En `AdminProductsPanel` añadir pestaña "Claves" por producto:
  - Ver stock de claves disponibles (count de `assignedOrderId IS NULL`)
  - Subir claves en bloque: textarea con una clave por línea o importación CSV
  - Ver claves asignadas con el pedido correspondiente
  - Eliminar claves no asignadas erróneas
- Endpoint: `POST /api/admin/products/[slug]/keys` (subir), `GET /api/admin/products/[slug]/keys` (listar), `DELETE /api/admin/keys/[id]` (borrar)

### 14.3 — Asignación automática en `completePaidOrder` 🔴 CRÍTICO · ✅ HECHO (19/06/2026)
- En `src/services/checkout/order-service.ts`, dentro de `completePaidOrder`, tras marcar el pedido como pagado:
  1. Para cada `OrderItem`, buscar la primera `GameKey` disponible (`assignedOrderId IS NULL`) del `productSlug` correspondiente.
  2. Asignarla atómicamente dentro de la misma transacción Prisma (`updateMany` con condición `assignedOrderId IS NULL`).
  3. Si no hay claves disponibles para algún producto: marcar el pedido con `status: "paid_pending_key"` y enviar alerta por email al admin.
  4. Guardar `keyCode` en el `OrderItem` (añadir campo `gameKey String?` al modelo `OrderItem`).

### 14.0b — Fix: conflicto de segmentos dinámicos en ruta admin/keys · ✅ HECHO (20/06/2026)
- La ruta `src/app/api/admin/products/[slug]/keys/route.ts` colisionaba con el segmento dinámico `[slug]` existente en el árbol de rutas de Next.js.
- **Implementado:** renombrado el segmento a `[id]` (`src/app/api/admin/products/[id]/keys/route.ts`). Sin cambios de lógica — commit `9dadbb8`.

### 14.4 — Mostrar clave en email de confirmación 🔴 CRÍTICO · ✅ HECHO (19/06/2026)
- En `sendPurchaseConfirmationEmail` (`src/services/auth/email.ts`): añadir sección por cada ítem con:
  - Nombre del juego
  - **Clave de activación:** `XXXXX-XXXXX-XXXXX` (formato Steam/Xbox/etc.)
  - Instrucciones de activación según plataforma (Steam: ir a steam.com/activate, Xbox: redeem.microsoft.com, etc.)
  - Enlace a la ficha del juego

### 14.5 — Mostrar clave en panel de cuenta 🟠 ALTA · ✅ HECHO (20/06/2026)
- En `AccountOrdersHistory` y en la vista de pedido individual: mostrar la clave asignada a cada ítem.
- La clave se puede copiar con un botón "Copiar clave".
- Solo visible para pedidos con `status: "paid"`.
- **Implementado (commit `903378c`):** `AccountOrdersHistory.tsx` ahora tipa `gameKey` en `OrderItem`/`PurchaseRow`,
  lo mapea desde `/api/orders` (que ya lo devolvía vía `include: { items: true }`) y, solo cuando
  `orderStatus === "paid"` y hay clave, la muestra en la celda del juego en bloque monoespacio verde con botón
  **Copiar/Copiada** (`navigator.clipboard`, feedback 2s, `aria-label` i18n ES/EN). Estilos en `account.scss`
  (`.account-order-key*`), sin estilos inline. tsc + 76/76 tests + `next build` verdes.
- **Pendiente menor:** el rediseño completo en burbuja de detalles vive en 17.7 (FASE 17); esto es la versión
  mínima funcional sobre la tabla actual.
- ⚠️ **PENDIENTE verificación visual de Ramón** (necesita un pedido `paid` con clave asignada en el navegador).
  Lógica cubierta por tsc + tests + build; falta la comprobación en runtime.

### 14.6 — Alertas de stock bajo al admin 🟡 MEDIA · ✅ HECHO (20/06/2026, commit `8e3b81c`)
> **Implementado:** tras ganar el claim de pago en `completePaidOrder`, para cada producto del pedido se cuenta
> `gameKey` disponibles (`assignedOrderId: null`) y, si quedan `<= LOW_KEY_STOCK_THRESHOLD` (3) o cero, se envía
> `sendLowKeyStockAlert` al admin (`MASTER_ADMIN_EMAIL`, fallback al `SUPER_ADMIN` de BD). Es **best-effort**
> (try/catch, nunca bloquea el pago) y solo se dispara en la llamada ganadora (no duplica con webhooks
> repetidos). Nuevo email en `email.ts` con asunto distinto para "stock bajo" vs "agotado". Test dedicado en
> `order-service.test.ts`. tsc + **77/77** + `next build` verdes. ⚠️ **PENDIENTE verificación en runtime** de Ramón
> (configurar `MASTER_ADMIN_EMAIL` y comprobar el correo con un pedido real de bajo stock).
- Para productos digitales el "stock" es el conteo de `GameKey` con `assignedOrderId IS NULL`, no el campo físico
  `stock: Int`. Cubre ambos casos: **umbral bajo** (`<= 3`) y **agotado** (`= 0`), este último ya además marcaba
  `paid_pending_key` + `logger.warn`.

### 14.7 — Validación pre-checkout de stock de claves 🟡 MEDIA · ⬜ PENDIENTE
- Antes de redirigir a Stripe/PayPal, verificar que hay al menos 1 clave disponible por producto en el carrito.
- Si no hay: bloquear el checkout y mostrar "Sin stock de claves — contacta con soporte".
- **Verificado (20/06/2026):** ni `stripe/create-session/route.ts` ni `paypal/create-order/route.ts` comprueban disponibilidad de `GameKey` antes de crear la sesión. La asignación ocurre solo en `completePaidOrder` (post-pago). Sin esta validación, se puede cobrar sin entregar clave (el pedido queda en `paid_pending_key`).

---

## FASE 15 — REDISEÑO DE CARDS Y COMPARADOR DE PRECIOS 🔵 FUTURO

> Inspirado en el diseño de G2A, Instant Gaming y Eneba (capturas referencia: 20/06/2026).
> Las tres mejoras son independientes entre sí — pueden implementarse por separado.

### 15.1 — Precio mínimo del mercado en la card + icono de plataforma 🔵 FUTURO

**Objetivo:** dar al usuario transparencia de precio — si otra plataforma vende más barato, mostrarlo; si GameZone es la más barata, resaltarlo.

**Diseño propuesto (referencia capturas Ramón):**

```
Desde 20,00 € -50%
──────────────────────────────────────────
  10,00 €  [logo GameZone]   ← nuestro precio (siempre visible)
   8,00 €  [logo Steam]      ← siguiente precio disponible (siempre visible, sea mayor o menor)
```

**Reglas de visualización:**
- El precio de GameZone se muestra **siempre** con nuestro logo.
- El siguiente precio externo disponible se muestra **siempre** con el logo de su plataforma — no se filtra por si es mayor o menor. El usuario ve la comparativa y saca sus propias conclusiones.
  - Si es **menor** → el usuario ve que hay opción más barata (transparencia).
  - Si es **mayor** → el usuario ve que GameZone es la opción más barata (argumento de venta).
- Se usa el precio de la plataforma más cercana al nuestro en la lista ordenada de fuentes (no necesariamente el más barato del mercado).
- El precio "Desde X€ -Y%" de la cabecera refleja el precio de referencia oficial (PVP).
- El logo de plataforma aparece a la derecha del precio (igual que en G2A).

**Implementación:**
- El precio externo más bajo viene de las APIs ya integradas (Steam, G2A, Xbox). Usar el campo `externalPrice` / `storeLabel` que ya existe en el modelo de producto.
- En `GameCard.tsx`: añadir una fila secundaria de precio con `externalMinPrice` y `externalStoreLabel`.
- En `src/lib/products.ts` o `src/lib/market/`: calcular `externalMinPrice` al sincronizar precios de mercado.
- No requiere nueva llamada a API en tiempo de render — el precio externo se almacena en BD al sincronizar.

**Archivos afectados:** `GameCard.tsx`, `GameCard.module.scss`, `src/lib/products.ts`, posiblemente `src/services/market/`.

---

### 15.2 — Formato de imagen de card: portada vertical (ratio 3:4) 🔵 FUTURO

**Objetivo:** adoptar el formato estándar de portada de videojuego (vertical, tipo "box art") en lugar de imágenes panorámicas, que es el formato dominante en G2A, Instant Gaming y Eneba.

**Cambios:**
- Ratio de la imagen en `GameCard`: cambiar de horizontal/cuadrado a **3:4** (portrait).
- Buscar/usar únicamente imágenes de portada oficial para cada juego:
  - Steam: `https://cdn.akamai.steamstatic.com/steam/apps/{appId}/library_600x900.jpg` (ya usado puntualmente en FeaturedSection side cards).
  - RAWG: campo `background_image` tiende a ser landscape — usar `screenshots` o buscar portada vertical alternativa.
  - Fallback: imagen panorámica con `object-position: top` si no hay portrait disponible.
- En el admin panel: al subir imagen de producto, indicar que se prefiere formato portrait 600×900.
- `GameCard.module.scss`: ajustar `.gameCardImage` al nuevo ratio y eliminar reglas de recorte agresivo.

**Restricción:** no cambiar el diseño de otras secciones que usan `GameCard` (FeaturedSection, búsqueda) sin revisar impacto visual primero.

**Restricción de contenido (Ramón, 20/06/2026):** el cambio a portrait es **solo de formato**. ⚠️ NO se elimina
ninguna información de la card actual — es deliberadamente completa (cashback, countdown, pill de tienda,
subtítulo, región, "Desde X -Y%", precio final, likes, acciones). Reorganizar el layout para que quepa todo en
portrait; nunca recortar info "para que se parezca a G2A". Las referencias externas son inspiración de formato,
no de contenido.

---

### 15.3 — Conexiones con plataformas y marketplaces (roadmap completo) 🔵 FUTURO

> **Priorización:** conectar primero las que tienen API pública documentada y claves de distribución accesibles. Las tiendas oficiales (Steam, Epic, etc.) NO venden mediante API — solo se puede hacer scraping o usar sus APIs de información (precios, fichas), no de compra.

#### Tiendas y APIs de información de precio (lectura de precios/fichas)

| Plataforma | API disponible | Notas |
|---|---|---|
| **Steam** | ✅ `store.steampowered.com/api/appdetails` | Ya integrada. Precio, descuento, fichas. |
| **G2A** | ✅ API pública (ya integrada) | Precios de revendedor. |
| **Xbox / Microsoft Store** | ⚠️ API no oficial | Precios consultables, sin SDK oficial para terceros. |
| **Epic Games Store** | ⚠️ API no oficial | `store-site-backend-static.ak.epicgames.com` — no oficial pero estable. |
| **GOG** | ✅ API pública | `api.gog.com` — fichas y precios. Sin DRM, catálogo clásico. |
| **Humble Bundle** | ⚠️ Sin API oficial | Solo bundles web, scraping frágil. |
| **EA App** | ⚠️ Sin API pública | Solo mediante cliente EA. Integración compleja. |
| **Ubisoft Connect** | ⚠️ Sin API pública | Solo cliente Ubisoft. |
| **PlayStation Store** | ⚠️ API no oficial | `store.playstation.com` — datos de precio consultables. |
| **Nintendo eShop** | ⚠️ API no oficial | `api.ec.nintendo.com` — región EU disponible. |

#### Distribuidores de claves con API para revendedores (compra/inventario)

| Plataforma | Modelo | Notas |
|---|---|---|
| **Instant Gaming** | Afiliación / scraping | No tiene API pública de compra. Afiliados web. |
| **Eneba** | ✅ API para vendedores | Marketplace europeo. Requiere cuenta vendedor. |
| **CDKeys** | Sin API | Solo afiliación web. |
| **Green Man Gaming** | Afiliación | Programa de afiliados, sin API de inventario. |
| **Genba Digital** | ✅ API B2B | Distribuidor mayorista de claves — requiere acuerdo comercial. Recomendado para inventario real. |
| **Fanatical** | Afiliación | Sin API de compra directa. |

#### Marketplaces digitales (productos digitales / apps)

| Plataforma | Notas |
|---|---|
| **Google Play** | API de desarrollador disponible — para apps/juegos móviles, no consola. |
| **Apple App Store** | API de desarrollador. Mismo caso que Google Play. |

#### Orden de implementación recomendado

1. **GOG** — API pública, catálogo clásico, diferenciador de valor (sin DRM).
2. **Epic Games Store** — API no oficial pero estable; catálogo de exclusivas.
3. **Eneba** — marketplace europeo con API para vendedores; amplía inventario de claves.
4. **Genba Digital** — si se busca inventario mayorista real para reventa.
5. **EA App / Ubisoft Connect** — complejidad alta; diferir hasta tener las anteriores.
6. **PlayStation Store / Nintendo eShop** — APIs no oficiales; útiles para comparativa de precios de consola.

**Nota de arquitectura:** todas las conexiones de precio externo deben pasar por `src/services/market/` y almacenarse en BD al sincronizar (cron o on-demand), nunca hacer fetch en tiempo de render de la card.

---

## FASE 16 — REESTRUCTURACIÓN DE ARCHIVOS BAJO EL PATRÓN MVC 🟠 ESTRUCTURAL

> **Origen:** petición de Ramón (20/06/2026). "El style debería contener los estilos del SCSS de los
> componentes y no tener que buscarlos entre los archivos de TypeScript; están mal ordenados y mezclados."
>
> **Regla de oro de esta fase (3.1 — no romper lo existente):** es una reorganización **sin cambio de
> comportamiento**. Cada extracción debe dejar la app idéntica en pantalla y en tests. Un componente por
> commit, verificación visual desktop/móvil + `tsc` + `vitest` + `build` tras cada uno. NADA de mezclar
> rediseño visual (FASE 17) con esta fase: primero ordenar, luego rediseñar.

### Diagnóstico verificado contra el código (20/06/2026)

| Problema | Dato real medido |
|---|---|
| **Estilos inline mezclados en TSX** | **160 `style={{…}}`** repartidos en **18 archivos** |
| **Peor infractor** | `AdminProductsPanel.tsx` → **1604 líneas y 86 estilos inline**, sin `.module.scss` |
| **Segundo** | `AccountDashboard.tsx` → **1813 líneas**, 9 inline, sin `.module.scss` |
| **Resto de paneles sin módulo** | `AdminOrdersPanel.tsx` (320 L, 25 inline) · `AdminUsersPanel.tsx` (199 L, 15 inline) · `AccountOrdersHistory.tsx` (199 L) |
| **SCSS global sobrecargado** | `globals.scss` **837 L** · `auth.scss` 415 L · `account.scss` 349 L |
| **Asimetría de la migración 9.5** | features/ y ui/ ya tienen CSS Modules; **cuenta/admin se quedaron fuera** (justo los archivos más grandes) |

**Conclusión:** la migración a CSS Modules (9.5) cubrió los componentes fáciles pero dejó sin tocar los
paneles pesados de cuenta y admin, que concentran el 90% de los estilos inline y los archivos kilométricos.
Esta fase termina ese trabajo y reordena las capas MVC.

### Objetivo de capas (alineado con `CLAUDE.md`)

```
Controller → app/**/route.ts + page.tsx delgados (solo orquestación, sin lógica de negocio)
View       → components/**/*.tsx  → SOLO JSX + estado de UI + handlers. CERO estilos inline.
Estilos    → components/**/*.module.scss  → todo el SCSS del componente vive aquí, junto al TSX.
Service    → services/**  → lógica de negocio (ya está razonablemente separada)
Infra      → lib/**       → prisma, logger, validación, acceso a datos
```

### 16.1 — Erradicar estilos inline → CSS Modules 🟠 ALTA · ⬜ PENDIENTE
- **Acción:** migrar los 160 `style={{…}}` a clases en `*.module.scss` co-locado con cada componente.
  Excepción legítima: valores **dinámicos calculados en runtime** (ej. `style={{ width: \`${pct}%\` }}` de
  una barra de progreso) → se quedan inline o pasan a CSS custom properties (`style={{ "--w": pct }}`).
- **Prioridad por impacto:** `AdminProductsPanel` (86) → `AdminOrdersPanel` (25) → `AdminUsersPanel` (15)
  → `AccountDashboard` (9) → resto.
- **Verificar:** parità visual antes/después por componente; `grep -rn "style={{" src` baja de 160 a solo
  los dinámicos justificados.

### 16.2 — Co-locar `.module.scss` en los paneles de cuenta/admin 🟠 ALTA · ⬜ PENDIENTE
- **Acción:** crear `AccountDashboard.module.scss`, `AdminProductsPanel.module.scss`,
  `AdminOrdersPanel.module.scss`, `AdminUsersPanel.module.scss`, `AccountOrdersHistory.module.scss`.
  Mover a cada uno las reglas que hoy viven en `account.scss`/`globals.scss` y que solo usa ese panel.
- **Verificar:** `account.scss` adelgaza; cada panel se ve igual; sin clases huérfanas.

### 16.3 — Trocear los componentes kilométricos 🟠 ALTA · ⬜ PENDIENTE
- **Problema:** `AccountDashboard.tsx` (1813 L) y `AdminProductsPanel.tsx` (1604 L) son inmantenibles —
  mezclan datos, formularios, modales y vistas en un solo archivo.
- **Acción (sin cambiar comportamiento):** extraer subcomponentes con responsabilidad única. Ejemplos:
  - `AccountDashboard` → `ProfileView` / `ProfileEditForm` / `AvatarUploader` / `SecuritySection` / `DangerZone`.
  - `AdminProductsPanel` → `ProductCreateModal` / `ProductEditModal` / `ProductRow` / `KeysModal` / `ProductFormFields` (compartido crear/editar).
- Carpeta por dominio: `components/auth/account/…` y `components/auth/admin/…` para no inflar `components/auth/`.
- **Verificar:** mismos flujos (crear/editar/borrar/claves/perfil) funcionando; `tsc` + 76 tests + build verdes.

### 16.4 — Adelgazar `globals.scss` 🟡 MEDIA · ⬜ PENDIENTE
- **Acción:** dejar en `globals.scss` solo reset, tokens, tipografía base, `html/body` y utilidades
  realmente globales. Lo que pertenezca a un componente concreto se va a su módulo (resultado natural de
  16.1–16.3). Documentar arriba del archivo qué tipo de regla puede vivir aquí.
- **Verificar:** `globals.scss` baja claramente de 837 L; nada se rompe visualmente.

### 16.5 — Auditoría de orden de carpetas 🟡 MEDIA · ⬜ PENDIENTE
- **Acción:** revisar archivos "mezclados" fuera de su capa. Mover lo que esté mal ubicado (helpers de UI en
  `lib/`, lógica de negocio en componentes, etc.) respetando el mapa de `CLAUDE.md`. Actualizar imports.
- **Regla:** mover, no reescribir. Un PR de movimientos + ajuste de imports, sin tocar lógica.

> **Definition of Done de la FASE 16:** `grep -rn "style={{" src` solo devuelve dinámicos justificados ·
> ningún componente de cuenta/admin sin su `.module.scss` · ningún `.tsx` de vista > ~400 líneas ·
> `tsc` + `vitest` (76/76) + `build` verdes · revisión visual desktop/móvil sin regresiones.

---

## FASE 17 — SISTEMA DE DISEÑO POR COMPONENTES 🔵 DISEÑO

> **Origen:** petición de Ramón (20/06/2026). "Apartado de diseño — diseño por componentes, muy importante
> para que sea reutilizable. Diferentes propuestas para cards, header, layouts, footer, carrusel, secciones,
> comparador (muy precario), panel de cuenta, panel de juegos e historial."
>
> **Referencias visuales:** capturas de G2A / Instant Gaming / Eneba aportadas por Ramón + sus capturas
> propias de cards, selector de idioma y botones de admin. *(Nota de honestidad: G2A no se pudo cargar en
> vivo —timeout por su peso de JS—; las propuestas se basan en esas capturas, en los patrones conocidos de
> esas tiendas y en el código actual, no en una inspección en vivo de g2a.com.)*
>
> **Filosofía (lo que pidió Ramón): primero los primitivos reutilizables, luego componerlos.** Cada pieza
> visual debe salir de un set pequeño de primitivos con tokens compartidos, no de CSS suelto por pantalla.
> Esto depende de la FASE 16: no se construye el design system encima de estilos inline.

### 17.0 — Fundamentos: tokens + primitivos reutilizables 🔵 BASE (hacer primero)
- **Tokens** (en `globals.scss` como CSS custom properties, fuente única de verdad): paleta (base `#22242A`,
  superficies, acentos naranja/violeta de marca), espaciado (escala 4/8), radios, sombras, tipografía
  (Exo 2 display ya integrada en B8), z-index, breakpoints, duraciones de animación.
- **Primitivos** (en `components/ui/`, cada uno con su `.module.scss` y props tipadas):
  `Button` (primary/ghost/icon) · `Badge` (descuento/cashback/plataforma) · `PriceTag` (precio + tachado +
  logo de tienda) · `IconButton` · `Modal` (overlay + foco atrapado + Escape) · `Popover`/`Bubble`
  (el recuadro burbuja de detalles) · `Tooltip` · `Switch` (toggle admin) · `Tabs` · `Thumbnail` ·
  `Dropdown` (selector de idioma) · `CardShell`.
- **Por qué:** hoy hay 160 estilos inline y botones replicados a mano en cada panel. Con primitivos, los
  rediseños siguientes son composición, no copia-pega.
- **Verificar:** un mini-catálogo (página interna `/admin/ui` o Storybook ligero, opcional) que renderice
  cada primitivo en sus variantes.

### 17.1 — Card de juego (3 propuestas) 🔵 — liga con 15.1/15.2
> Estado actual (`GameCard.tsx`): imagen con `objectFit: contain` (inline), badges cashback/descuento/
> countdown, pill de tienda, "Desde X -Y%", precio final, like, ver-detalles/añadir. Una sola tienda.

- **Propuesta A — "G2A clásica" (portrait):** imagen de portada vertical 3:4 que llena el marco
  (`object-fit: cover`), badges flotando sobre la imagen, cuerpo compacto con `PriceTag` doble
  (GameZone + siguiente tienda con su logo, ver 15.1). La más cercana a las capturas de Ramón.
- **Propuesta B — "Comparador-first":** misma portada, pero el bloque de precio se expande mostrando 2–3
  fuentes (GameZone + Steam + G2A) con mini-logos y la más barata resaltada. Vende transparencia.
- **Propuesta C — "Minimal hover":** card limpia; el detalle de precios externos y el countdown aparecen en
  un `Popover` al hover/focus para no recargar la rejilla. Buena para móvil.
- **Reutiliza:** `CardShell`, `Badge`, `PriceTag`, `Thumbnail`. **Decisión de Ramón:** elegir A/B/C.

### 17.2 — Header + selector de idioma (fix del "precario") 🟠 — incluye bug visual real
> **Verificado:** el selector es un `<select>` HTML nativo (`navLocaleSelect`, `Header.tsx` líneas 367 y 494)
> con opciones "ES · EUR" / "EN · USD". Ese render nativo es el dropdown **oscuro y básico** de la captura.
> El popup blanco limpio "Español / EUR · English / USD" de la home es un dropdown **custom** — ese es el target.

- **Acción inmediata (mientras no exista 17.12):** sustituir los dos `<select>` nativos por el primitivo
  `Dropdown` con el estilo del popup blanco de la home (tarjeta blanca, ítems "Español / EUR", chip
  globo "ES / EUR ▲"). Unifica desktop + móvil. Es un fix de CSS/markup contenido, sin tocar la lógica de
  cookie `uiLocale` (`handleUiLocaleChange`).
- **Propuestas de header (elegir):** A — sticky compacto con búsqueda central (estado actual mejorado);
  B — header de dos filas (marca+acciones arriba, `PlatformBar` integrada abajo); C — header con mega-menú
  por plataforma al hover.

### 17.3 — Layout / Shell, Footer y Carrusel (propuestas) 🔵
- **Layout/Shell:** contenedor max-width consistente + grid de secciones reutilizable. Propuestas:
  A — ancho fijo centrado; B — full-bleed con secciones a sangre y contenido centrado.
- **Footer (efectos, elegir):** A — gradiente sutil + columnas con hover de iconos (estado actual pulido);
  B — footer con onda/borde superior animado; C — footer "mega" con newsletter + métodos de pago (liga con B1).
- **Carrusel (elegir):** A — scroll-snap nativo con flechas y dots (ligero, accesible); B — carrusel con
  autoplay pausable + peek de la siguiente card; C — grid que colapsa a carrusel solo en móvil.
  Aplica a "Vistos recientemente" (B5), destacados y secciones de plataforma.

### 17.4 — Secciones de la home 🔵
- Unificar las secciones (destacados, por plataforma, market intelligence) bajo un componente `Section`
  reutilizable: cabecera con título display + "ver todos", cuerpo intercambiable (grid/carrusel). Reduce el
  CSS duplicado entre secciones. Propuestas A — tarjetas por plataforma; B — pestañas por plataforma.

### 17.5 — Comparador de precios (UI "muy precaria" → rediseño) 🟠
> `MarketIntelligenceSections` es el componente con más SCSS (~1500 L de módulo). Ramón lo califica de
> precario. Liga con 15.1 (precios en card) y 15.3 (más fuentes).

- **Propuestas:** A — **tabla comparativa** por juego (tienda · precio · descuento · logo · CTA), la más
  legible y "seria"; B — **fila de chips de precio** horizontal con la más barata resaltada; C — **panel
  expandible** en la ficha ("Mejor precio") que despliega las fuentes ordenadas.
- **Reutiliza:** `PriceTag`, `Badge`, logos de plataforma ya existentes en `/iconos_platforms/`.

### 17.6 — Panel de cuenta (más visible + navegación) 🟠
- **Navegación pegajosa (pedido explícito de Ramón):** barra superior fija dentro de la cuenta con
  accesos **"Ver panel de pedidos"** y **"Volver a mi cuenta"**, para no tener que bajar cada vez (mejora de
  experiencia del trabajador/usuario). Mismo patrón en el área admin.
- **Vista por defecto** (ya hecho en 12.4 punto 2) + **avatar más contenido** (12.4 punto 3, pendiente):
  reducir tamaño del avatar y mostrar nombre/nick/email en cabecera.
- **Propuestas de layout de cuenta:** A — sidebar de secciones (perfil/pedidos/lista/seguridad); B — pestañas
  superiores; C — dashboard de tarjetas.

### 17.7 — Pedidos de sistema / Historial de juegos (especificación concreta de Ramón) 🟠
> Hoy `AccountOrdersHistory.tsx` es una tabla plana (Juego / Fecha / Precio / Estado) y aún **no muestra la
> clave** (liga con 14.5).

- **Rediseño de fila (lo que pidió Ramón):** cada pedido muestra **miniatura · nombre · precio · fecha · icono
  de reembolso** (un icono, *no* la palabra "reembolso"). 
- **Detalles en burbuja:** botón "Detalles" → abre un `Popover`/`Bubble` con **toda la información restante**
  (estado completo, método de pago, id de pedido, **clave de activación** con botón copiar (14.5), enlace a la
  ficha). Nada de saltar de página.
- **Reutiliza:** `Thumbnail`, `PriceTag`, `IconButton` (reembolso), `Popover`, `Tabs`.

### 17.8 — Admin: Crear producto, Usuarios y navegación (especificaciones de Ramón) 🟠
> **Verificado:** "Crear producto" es un **formulario inline siempre visible** (`AdminProductsPanel.tsx`
> línea 758) — poco visual. Ya existe un **modal de edición** (`modalDraft`, líneas 735/1352) reutilizable.

- **17.8a — Crear producto en modal:** botón **"+ Crear producto"** (con icono de crear) que abre un `Modal`
  con todos los inputs, reutilizando el `ProductFormFields` que saldrá de 16.3. El campo `saleEndsAt`
  (`datetime-local`, ya existe) se presenta con **icono de fecha de fin de oferta**. Quita el formulario
  permanente de la vista.
- **17.8b — Usuarios, toggle admin (mejora pedida):** ⚠️ **versión sencilla HECHA (20/06/2026, commit
  `9c78a48`)** — el botón ya no dice "Hacer/Quitar admin"; muestra el **estado** ("Admin" / "No admin") como
  toggle (`aria-pressed`, `title` que aclara la acción, color verde cuando es admin), y la columna Rol usa
  etiqueta legible ("Usuario"/"Admin"/"Super admin") en vez del enum. **Pendiente FASE 17:** el primitivo
  `Switch` visual real (interruptor) y, opcionalmente, control segmentado **USER | ADMIN**. ⚠️ Verificación
  visual de Ramón pendiente.
- **17.8c — Navegación admin pegajosa:** mismos accesos rápidos arriba ("Ver panel de pedidos" / "Volver a mi
  cuenta") que en 17.6.
- **17.8d — Iconos de acción** (ya existen: 🔑 claves / ✏️ editar / 🗑️ borrar): formalizarlos como
  `IconButton` con `aria-label` y tooltip, no emojis sueltos.

### 17.9 — Idiomas: traducción por API + fix del selector 🔵 (liga con 13.6)
- **Mientras no haya API (corto plazo):** retoque CSS del `<select>` nativo aplicado (20/06/2026, commit
  `61ca789`): flecha/caret visible, opciones con fondo blanco limpio, padding y contraste. ⚠️ **Limitación
  conocida:** con un `<select>` nativo el popup desplegable lo pinta el navegador/SO y no se puede clonar el
  popup blanco custom de la captura de Ramón; eso requiere el **dropdown custom** de 17.2 (pendiente).
- **Medio plazo (propuesta):** conectar una **API de traducción** (DeepL API o `i18next` + archivos por
  locale) para traducir toda la página de forma centralizada, eliminando los ternarios
  `lang === "en" ? … : …` repartidos por los componentes. Evaluar coste DeepL vs catálogos i18next estáticos.
  Se detalla en 13.6; aquí queda enlazado como parte del sistema de diseño/contenido.

> **Definition of Done de la FASE 17:** primitivos en `components/ui/` con módulo y tests de render ·
> cada componente rediseñado compone primitivos (sin CSS suelto duplicado) · variantes elegidas por Ramón
> antes de implementar · `tsc` + `vitest` + `build` verdes · revisión visual desktop/móvil.

---

## SPLIT DE IMPLEMENTACIÓN — FASES 16 y 17 (propuesta 20/06/2026)

> Reparto pensado para **evitar colisiones de merge**: cada IA es dueña de archivos/áreas distintas.
> Orden obligatorio: **FASE 16 antes que FASE 17** (no se rediseña sobre estilos inline).
> Ramón elige las variantes de diseño (A/B/C) antes de que se implemente cada componente de la FASE 17.

| Bloque | Claude (tareas C) | GPT (tareas G) |
|---|---|---|
| **FASE 16 — MVC** | 16.1+16.2+16.3 en **cuenta/admin** (`AccountDashboard`, `Admin*Panel`, `AccountOrdersHistory`) — los archivos grandes | 16.1 en **features/ui** restantes + 16.4 (adelgazar `globals.scss`) + 16.5 (auditoría de carpetas) |
| **FASE 17 — primitivos** | 17.0 primitivos base (`Button`, `Badge`, `PriceTag`, `Modal`, `Popover`, `Switch`, `IconButton`, `Dropdown`) | — (consume los primitivos de Claude) |
| **FASE 17 — vistas** | 17.7 pedidos/historial · 17.8 admin (crear producto modal, toggle usuarios, nav) · 17.6 cuenta | 17.1 card · 17.2 header+selector idioma · 17.3 footer/carrusel · 17.4 secciones · 17.5 comparador |

**Dependencia clave:** los primitivos (17.0, Claude) bloquean las vistas de ambos. Hacer 17.0 primero y
publicarlo en `dev-DDMMYYYY` para que GPT construya encima. Hasta entonces, GPT avanza la FASE 16 en su área.

**Tests a añadir/actualizar en este split:**
- Render tests (Vitest + Testing Library) de cada primitivo nuevo de 17.0.
- Tests de los subcomponentes extraídos en 16.3 (que el flujo crear/editar/borrar/perfil sigue intacto).
- E2E Playwright: añadir un spec de "abrir detalles de pedido en burbuja muestra la clave" cuando 17.7 + 14.5 estén.
- Guard de regresión: mantener 76/76 verdes en cada commit; no fusionar nada que baje la cuenta.

---

## FEEDBACK DE TESTING — "MEJORAS A FUTURO" (Ramón, 20/06/2026) 🔴 IMPORTANTE

> **Origen:** documento "MEJORAS A FUTURO — GAME ZONE" de Ramón (22 puntos) + capturas de referencia de
> G2A (ficha de Forza Horizon 5, G2A Plus, bestsellers, idea de card portrait Elden Ring). **Esto es
> planificación, no implementación** — Ramón pidió expresamente "no se escribe nada, solo planificar".
>
> **Dato crítico que explica varios "fallos":** las tareas 12.2 (buscador) y 12.3/12.7 (filtros admin) las
> hizo GPT pero **viven en `dev-19062026-gpt`, sin mergear a `main`**. Ramón las ve rotas porque su versión
> en ejecución no las tiene aún. **Acción previa a todo: mergear esa rama.**

### Mapa de los 22 puntos → fase y estado real

| # | Punto de Ramón | Fase | Estado honesto |
|---|---|---|---|
| 1 | Validación datos: email, postal numérico, teléfono con prefijo país (España → +34) | 11.4 | ⚠️ parcial — prefijo país y postal por país pendientes |
| 2 | Quitar prefijo si estás en otro país; faltan claves; "compro gratis con postal sin número" | 11.4 + 14 | ⚠️ revisar postal opcional; claves = FASE 14 |
| 3 | Registro sin Google/Facebook/Twitter; Nick no se ve (sale "Mi cuenta") | 13.1 + 12.1 | 🔴 REABIERTO — no hay campo `username`; OAuth registro pendiente |
| 4 | Botones plataforma deben filtrar también en historial/cuenta (buscador global) | 12.3 | ⚠️ cuenta hecha; admin y comportamiento home→cards por revisar |
| 5 | Buscador: en "ver todos" filtra en esa página, no te lleva a la principal; falta panel sugerencias | 12.2 | 🔴 REABIERTO — hecho por GPT pero **sin mergear a main** |
| 6 | Botón idiomas → API de idioma + API de traducción (hoy hardcodeado, "muy malo") | 13.6 + 17.9 | ⚠️ retoque CSS del selector hecho (commit `61ca789`); API de traducción y dropdown custom pendientes |
| 7 | Comparador: filtra precios entre todas las APIs y devuelve los 3 mejores | 13.3 + 15.3 + 17.5 | ⬜ pendiente |
| 8 | Crear cuenta con Google/Facebook/Twitter (+Xbox futuro) | 13.1 | ⬜ pendiente |
| 9 | Cards: nuestro precio + precio de la API con su logo, en pequeño encima | 15.1 | ⬜ pendiente (idea card portrait confirmada) |
| 10 | Logo G2A correcto en "enlaces" de detalles (web oficial sale con icono raro) | 12.8b | ✅ hecho (commit `5ace357`, falta verif. visual) |
| 11 | Formato fotos Xbox/API: en PC se recortan a los lados (portrait vs 16:9) | 12.9 + 15.2 | ⚠️ revisar caso PC |
| 12 | Cuenta tarda en cargar; "pedidos de sistema tampoco funcionan" | 12.4 | 🔴 REABIERTO — verificar flujo en runtime |
| 13 | Admin transacciones: filtros estado/pasarela + paginación 20/página | 12.7 | ✅ hecho (GPT) **sin mergear** |
| 14 | Revisar reembolsos; email compra con clave, descripción, enlace, logo arriba | 11.2 + 14.4 | ⚠️ verificar reembolsos; email ya hecho |
| 15 | "También te puede interesar": preferidos/vistos/categoría, no siempre los mismos | 12.5 | ⚠️ falta criterio "vistos recientemente" |
| 16 | Datos de cuenta en caché (no recargar siempre) | 12.4 | ⬜ pendiente (SWR) |
| 17 | Mostrar nombre + email + Nick arriba en "Mi cuenta" | 12.1 + 17.6 | ⚠️ falta Nick |
| 18 | Icono "Editar" en vez de inputs siempre visibles | 12.4 | ✅ hecho (pulir en 17.6) |
| 19 | Cuenta: la foto ocupa demasiado espacio | 12.4 + 17.6 | ⬜ pendiente |
| 20 | Mejora sustancial de colores / más profesional, tipo G2A | **NUEVO 17.0b** | ⬜ nuevo (design system) |
| 21 | Countdown a cero no cambia los juegos en Destacados | 12.6 | 🔴 REABIERTO — sigue roto |
| 22 | Secciones g2a/Steam/Motor de mercado "muy pobre"; ficha de detalle estilo G2A | 17.5 + **NUEVO 17.10** | ⬜ ficha rica (vídeo/reseñas/ediciones/vendedores) |
| 23 | Barra de menú móvil con iconos de plataformas junto a "Digital Store / GameZone Edition" | **NUEVO 17.11** | ⬜ pendiente de discutir enfoque |
| 24 | Rediseño completo de la experiencia móvil (mínimo 50% de la home móvil) | **NUEVO 17.12** | ⬜ pendiente de plan visual antes de código |

### 🔴 Reabiertos (Ramón los reporta rotos en runtime — re-verificar antes de cerrar)

- **12.1 / punto 3,17 — Nick de usuario:** el `<h1>` muestra `name || email`, pero **no existe campo `username`**
  en el modelo `User`. Acción: añadir `username String?` a Prisma + mostrar Nombre + Email + Nick en la cabecera
  de cuenta. Sin Nick, la tarea NO está completa.
- **12.2 / punto 5 — Buscador:** **mergear `dev-19062026-gpt` a main**. Si tras el merge sigue fallando el
  scope en "ver todos" o falta el panel de sugerencias en detalles, reabrir como bug de código.
- **12.6 / punto 21 — Countdown a cero:** verificar en vivo que al llegar a 0 el carrusel de Destacados avanza
  de juego y reinicia el timer. La auditoría lo tenía como "aparenta resuelto" sin confirmar.
- **12.4 / punto 12 — Pedidos de sistema "no funcionan" + carga lenta:** verificar el flujo completo de
  `/api/orders` y la carga de `/api/account/me`. Posible causa: sin caché (SWR) + fetch `no-store`.

### 🆕 Items nuevos (no existían en el plan)

- **12.8b — Logo G2A en la sección "Enlaces / web oficial" de la ficha (punto 10):** ✅ **HECHO (20/06/2026,
  commit `5ace357`).** El enlace "Web oficial" usaba un emoji `🌐` fijo; ahora aplica la misma detección que el
  enlace de tienda (si `website` incluye "steam"/"g2a" → `SteamIcon`/`G2AIcon`, ya definidos en el archivo;
  resto → `🌐`). Reutiliza estilos `gameDetailLinkSteam/G2A` existentes. tsc + 76/76 + `next build` verdes.
  ⚠️ **PENDIENTE verificación visual de Ramón** (confirmar que era ese el "icono raro" y no otro).
- **17.0b — Revisión profesional de paleta de color (punto 20):** propuesta de paleta más profesional y
  actual (referencia G2A: superficies oscuras frías, acentos vivos contenidos, jerarquía de contraste). Se
  integra en los tokens de 17.0. **Respetar la restricción guardada de Ramón: nada de negro puro; oscuros
  permitidos `#22242A`.** Entregar 2–3 propuestas de paleta para elegir.
- **17.10 — Ficha de detalle estilo G2A (puntos 22 + "tiene vídeo, reseñas"):** enriquecer la ficha hasta el
  nivel de la referencia G2A (capturas de Forza). Bloques:
  1. **Galería con vídeo** (trailer reproducible) + miniaturas + "+N".
  2. **Reseñas y valoración**: estrellas, nº de reseñas, "% recomienda".
  3. **Selector de ediciones** (Standard / Deluxe / Premium) si aplica.
  4. **Comparativa de vendedores/fuentes** ("Ver ofertas de N vendedores") — liga con 17.5 y 15.1.
  5. **Secciones inferiores**: "Ofertas de paquetes" (bundles), "Amplía con DLC", "También te puede interesar"
     con la lógica del punto 15.
  - Es la pieza más grande de diseño; debe componerse de los primitivos de 17.0, no de CSS suelto.
- **Idea de card (captura Elden Ring) — SOLO referencia visual de formato, NO de contenido:** la captura
  inspira el **formato portrait 3:4** y la jerarquía de precio, nada más. ⚠️ **No se elimina ninguna info de la
  card actual de Ramón, que es deliberadamente completa** (cashback, countdown de oferta, pill de tienda,
  subtítulo "Código digital oficial", región, "Desde X -Y%", precio final, likes, ver-detalles/añadir). El
  portrait (15.2) y el multi-precio (15.1) son **aditivos**: se reorganiza el formato, se conserva todo el
  contenido. Es una **idea para valorar**, no un diseño cerrado.
- **G2A Plus (captura "implementar este efecto"):** modal/sección de suscripción premium → mapea a **13.5
  (planes Premium)**. Ubicación sugerida: acceso desde el área de cuenta + un slot promocional en home/ficha.
- **17.11 — Barra de menú móvil con iconos de plataformas:** pendiente de discutir cómo integrarlo sin saturar
  el header. Idea base de Ramón: en móvil, junto o debajo de `DIGITAL STORE / GameZone Edition`, mostrar accesos
  visuales a **PlayStation, Xbox, Nintendo y PC** con sus iconos. Opciones a valorar antes de escribir código:
  A — fila compacta de iconos bajo el subtítulo del header; B — carrusel horizontal de plataformas debajo del
  header; C — panel desplegable desde el menú hamburguesa con iconos grandes y etiquetas. Debe mantener tap targets
  cómodos, no tapar el logo ni el botón de menú, y filtrar/navegar de forma coherente con los filtros de plataforma
  existentes.
- **17.12 — Rediseño completo de la página para móvil:** mejora mayor de UX móvil pendiente de plan visual antes
  de código. Alcance mínimo propuesto: rediseñar al menos **50% de la home móvil**, incluyendo sistema de cards para
  móviles, sección de destacados, "Explorar por género", Hero, carruseles/ofertas y jerarquía de precios. Objetivo:
  reducir scroll innecesario, evitar imágenes mal recortadas, priorizar compra rápida, hacer cards compactas tipo
  tienda digital y separar claramente bloques de descubrimiento (Hero/destacados/géneros/ofertas). Antes de implementar
  se debe discutir el plan: wireframe móvil, orden de secciones, ratios de imagen, número de columnas por breakpoint,
  qué información conserva cada card y qué se mueve a ficha/detalle.

### Reconciliación de ESTADO GLOBAL

Los puntos 5/12.2, 3·17/12.1, 21/12.6 y 12/12.4 **dejan de contar como cerrados** hasta re-verificación tras el
merge de `dev-19062026-gpt`. El resto de los puntos ya tienen fase asignada arriba; los nuevos (12.8b,
17.0b, 17.10, 17.11, 17.12) entran en el backlog de diseño/bugs.

---

## Tecnologías a incorporar en esta v2 (resumen)
- **unstable_cache / revalidateTag** (Next.js, ya disponible) — caché del catálogo. Sin dependencias nuevas.
- **Playwright** — E2E estándar (sustituye gradualmente los scripts a medida).
- **Dependabot** — actualizaciones de seguridad automáticas. Sin código.
- **Lighthouse CI** — presupuesto de rendimiento en CI. Incorporado el 13/06/2026.
- **Cloudflare Turnstile** (opcional, diferido; solo si hay bots) — anti-bot sin fricción.
- **Upstash Redis** — incorporado el 17/06/2026 para rate limit distribuido con fallback PostgreSQL.

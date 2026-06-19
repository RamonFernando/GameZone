# Historial de trabajo — GameZone (GameStopV4)

> **Memoria operativa del proyecto.** Cuando algo falle, este es el primer sitio donde mirar:
> qué se hizo, quién lo hizo y en qué commit. Funciona offline — no necesita el repo remoto.
>
> **Formato:** una sección por día (`## DD-MM-YYYY (rama dev-DDMMYYYY)`) con una subsección
> por actor. **Cada IA escribe SOLO en su subsección** — así el archivo nunca genera
> conflictos de merge entre las sub-ramas.
>
> **Formato de entrada:** `- [<ID-tarea> ✅] <descripción en 1 línea> — commit <hash-corto>`
> Para encontrar un commit: `git show <hash-corto>` o buscar el hash en `git log --oneline`.

---

## 25-06-2026 (rama dev-25062026-sonnet)

### Sonnet (auditoría + implementación)

- [audit ✅] Auditoría de apertura (sesión 1): REGLAS-IA, HISTORIAL y git revisados. Working tree limpio, última jornada 21-06-2026.
- [17.x ✅] Modal "Crear producto": formulario inline de AdminProductsPanel (~14 inputs siempre visibles) sustituido por botón `+ Crear producto` → abre `CreateProductModal`. Escape + scroll-lock + reset al cancelar/crear. "Fin de oferta" como toggle opcional dentro del modal. CreateProductModal.tsx + CreateProductModal.module.scss creados. tsc + 77/77 — commits en rama (ver git log 25062026)
- [17.x ✅] Modal "Crear administrador": formulario inline de AdminUsersPanel (3 campos) sustituido por botón `+ Crear administrador` → abre modal inline. Mismo patrón (Escape, scroll-lock, reset). tsc + 77/77 — commits en rama (ver git log 25062026)
- [audit ✅] Auditoría de apertura (sesión 2): REGLAS-IA, HISTORIAL y git revisados. 20 commits de sesión 1 verificados en rama. Rama renombrada dev-21062026-sonnet → dev-25062026-sonnet. Sistema 3.1 verificado operativo — commit f2c5f0e
- [fix ✅] Botones plataforma (PlayStation/Xbox/Nintendo/PC) en header no hacían scroll a las cards. Causa: setPlatform() sin scrollToSearchResults(). Fix: añadido scroll en handlers desktop + móvil; scroll-margin-top: 70px en #game-results para no quedar tapado por el header sticky. tsc + 77/77 — commit b2ffbfd

---

## 21-06-2026 (rama dev-21062026-sonnet)

### Sonnet (auditoría + inicio jornada)

- [audit ✅] Auditoría de apertura: REGLAS-IA, HISTORIAL y git revisados. 4 cambios sin commitear de la jornada anterior sellados en rama nueva — commit 13a1564
- [17.11 📋] Nueva tarea registrada en plan: barra de menú móvil con iconos de plataformas. Pendiente de discutir enfoque (opciones A/B/C documentadas en PLAN-MEJORAS-AUDITORIA.md)
- [17.12 📋] Nueva tarea registrada en plan: rediseño completo experiencia móvil (mínimo 50% home). Pendiente plan visual antes de código
- [responsive ✅] FeaturedSection mobile: grid 2 columnas en 720px, aspect-ratio 3:4, `sizes` responsive en SideCard, tipografía compacta, badges ajustados — commit 13a1564
- [16.1 ✅] AdminUsersPanel: 15 inline styles → AdminUsersPanel.module.scss. tsc + 77/77 — commit 5336de9
- [16.1 ✅] AdminOrdersPanel: 25 inline styles → AdminOrdersPanel.module.scss. tsc + 77/77 — commit efba5f4
- [16.1 ✅] AccountOrdersHistory: 1 inline style → AccountOrdersHistory.module.scss. tsc + 77/77 — commit 202ab36
- [16.1 ✅] AccountDashboard: 9 inline styles → AccountDashboard.module.scss. tsc + 77/77 — commit 170df28
- [16.1 ✅] AdminProductsPanel: 86 inline styles → AdminProductsPanel.module.scss. tsc + 77/77 — commit e7009db
- [16.3 ✅] AdminProductsPanel split: 3 modales + toasts extraídos a components/auth/admin/ (ProductEditModal, DeleteProductModal, KeysModal, AdminToastList + types.ts). Archivo reducido de ~1604L a ~880L. tsc + 77/77 — commit 79eea59
- [16.2 ✅] AccountOrdersHistory: 6 clases account-orders-*/account-order-key-* migradas de account.scss → AccountOrdersHistory.module.scss. tsc + 77/77 — commit contenido en ea88acb
- [16.2 ✅] AccountDashboard: account-tabs, account-tab/active, auth-divider-rule, account-details-*, account-recovery-*, account-pending-payment-* migradas de account.scss → AccountDashboard.module.scss (19 clases, ~31 referencias). account.scss queda solo con account-avatar-*. tsc + 77/77 — commit ea88acb
- [16.5 ✅] Auditoría de carpetas: portrait-cover.ts movido de lib/ (INFRA) a components/features/ (VIEW) — único consumer es FeaturedSection.tsx. store.ts (15 deps, mezcla data+BL) y co-locación de Client Components en app/ dejados intencionalmente. tsc + 77/77 — commit pendiente

---

## 20-06-2026 (rama dev-20062026)

### Sonnet/Opus (planificación + auditoría)

- [17.8b ⚠️] Botón de rol en Usuarios: ya no muestra la acción cruda "Hacer/Quitar admin"; comunica estado ("Admin"/"No admin") como toggle con `aria-pressed`, `title` que aclara la acción y color verde si es admin; columna Rol con etiqueta legible. Versión sencilla; el `Switch` visual completo queda para FASE 17. tsc + 77/77 + `next build` verdes. ⚠️ Falta verificación visual — commit 9c78a48
- [punto 6 ⚠️] Retoque CSS del selector de idioma (`Header.module.scss`, `.navLocaleSelect`, afecta desktop+móvil): flecha/caret SVG visible, opciones con fondo blanco y padding, contraste mejorado. Limitación: el popup nativo no se puede clonar al 100% (eso es el dropdown custom de 17.2). API de traducción sigue pendiente. tsc + 77/77 + `next build` verdes — commit 61ca789
- [14.6 ✅] Alerta al admin de stock bajo de claves: tras ganar el claim de pago en `completePaidOrder`, cuenta `gameKey` libres por producto y, si `<= 3` o `0`, envía `sendLowKeyStockAlert` (nuevo en `email.ts`) al `MASTER_ADMIN_EMAIL` (fallback `SUPER_ADMIN`). Best-effort (no bloquea pago), solo en la llamada ganadora. Test dedicado. tsc + 77/77 + `next build` verdes. ⚠️ Falta verificación runtime — commit 8e3b81c
- [12.8b ✅] Logo G2A/Steam en el enlace "Web oficial" de la ficha: `GameDetailClient.tsx` aplica al link de `website` la misma detección que el enlace de tienda (steam/g2a → icono SVG, resto → 🌐), reutilizando `SteamIcon`/`G2AIcon` y estilos existentes. tsc + 76/76 + `next build` verdes. ⚠️ Falta verificación visual de Ramón — commit 5ace357
- [14.5 ✅] Clave de activación en historial de pedidos: `AccountOrdersHistory.tsx` tipa y mapea `gameKey` desde `/api/orders`, la muestra (solo pedidos `paid`) en bloque monoespacio verde con botón Copiar/Copiada (`navigator.clipboard`, i18n ES/EN, `aria-label`); estilos `.account-order-key*` en `account.scss` (sin inline). tsc + 76/76 + `next build` verdes — commit 903378c
- [P1 ✅] "Ofertas del día": marcado RESUELTO en auditoría — verificado visualmente por Ramón. Commit 9769a95.
- [audit ✅] Auditoría sincronizada con el repo: 12.2 (dropdown sugerencias, GPT commit `07d9443`) y 12.3/12.7 (filtro plataforma admin, GPT commit `4286231`) marcados HECHOS pero **pendientes de merge a main** (viven en `dev-19062026-gpt`). 14.0b (fix segmento `[slug]→[id]`, commit `9dadbb8`) registrado. 14.5/14.6/14.7 verificados como pendientes con matices.
- [14.6 ✅ matiz] Documentado que para productos digitales el "stock" es el conteo de `GameKey` libres, no un campo físico; la alerta debe notificar al admin por umbral bajo y por agotado.
- [FASE 15 ✅ plan] Añadida al plan: rediseño de card con precio mínimo de mercado + logo de plataforma (15.1), formato portrait 3:4 (15.2) y roadmap de conexiones a tiendas/APIs —Steam, G2A, GOG, Epic, Eneba, EA, Ubisoft, PlayStation, Nintendo, marketplaces— (15.3).
- [FASE 16 ✅ plan] Añadida: **Reestructuración MVC**. Diagnóstico medido contra el código (160 estilos inline en 18 archivos; `AdminProductsPanel` 1604 L/86 inline; `AccountDashboard` 1813 L; paneles cuenta/admin sin `.module.scss`; `globals.scss` 837 L). Reorganización sin cambio de comportamiento.
- [FASE 17 ✅ plan] Añadida: **Sistema de diseño por componentes**. Primitivos reutilizables + propuestas A/B/C para card, header, footer, carrusel, secciones, comparador, cuenta, pedidos (miniatura/nombre/precio/fecha/icono reembolso + burbuja de detalles) y admin (crear producto en modal, toggle admin con Switch, nav pegajosa). Fix del selector de idioma (`<select>` nativo → dropdown custom como la home).
- [split ✅] Definido el reparto C/G de las FASES 16 y 17 sin colisiones (Claude: cuenta/admin + primitivos; GPT: features/ui + card/header/footer/comparador). FASE 16 antes que 17.
- [nota] G2A no se pudo inspeccionar en vivo (timeout por peso de JS); propuestas basadas en capturas de Ramón, patrones conocidos del sector y código actual.

## 19-06-2026 (rama dev-19062026)

### Sonnet (implementador)

- [14.1 ✅] Modelo `GameKey` en `prisma/schema.prisma` + campo `gameKey String?` en `OrderItem` + `keys GameKey[]` en `Product`. Migración `20260619215057_add_game_keys` aplicada a Neon. 76/76 tests verdes — commit 293e6fb
- [14.2 ✅] Panel admin de claves: botón 🔑 por producto en `AdminProductsPanel.tsx` abre modal con stock disponible, textarea para subida en bloque, listado con estado (disponible/asignada), borrado de claves no asignadas. Endpoints `GET/POST /api/admin/products/[slug]/keys` y `DELETE /api/admin/keys/[id]`. 76/76 tests — commit ea62d4a
- [14.3 ✅] Asignación automática atómica en `completePaidOrder` (`order-service.ts`): `tx.gameKey.updateMany` con condición `assignedOrderId IS NULL` dentro de la misma transacción Prisma. Si faltan claves → `status: "paid_pending_key"` + `logger.warn`. Keys asignadas reflejadas en `OrderItem.gameKey`. Test mock actualizado con `gameKey`/`orderItem` — commit 3ad166f
- [14.4 ✅] Clave de activación en email de compra (`email.ts`): cada ítem muestra la clave en bloque verde monoespacio, instrucciones de activación por plataforma (Steam/Xbox/PlayStation) e indicador "pendiente" si no hay clave — commit 3ad166f
- [branch ⚠️] NOTA: el commit 14.1 aterrizó accidentalmente en `dev-19062026-gpt` antes de ser cherry-picked a `dev-19062026-sonnet`. Al mergear, tratar el commit duplicado en la rama GPT como redundante (puede ignorarse o rebased fuera).

### Opus (modelo superior / escritorio)

- [P1 ⚠️] Rotación "Ofertas del día": `gameIdx` en `FeaturedSection.tsx` (`DealsOfTheDay`) cambiado para que un panel inactivo conserve su último juego (`PANEL_SIZE - 1`) en vez de resetear a juego 0 al reiniciar el ciclo. Así el panel izquierdo (Steam/Age of Empires) deja de quedarse congelado. Sin tocar orden/cantidad/nº de barras ni timing. tsc + 76/76 tests verdes. **PENDIENTE verificación visual** en dev server reiniciado limpio (pestaña en primer plano) — commit 9769a95
- [OG ✅] Tarjeta Open Graph con el logo real de GameZone (disco + icono PlayStation + wordmark "GameZone" con Z naranja + "DIGITAL STORE / GameZone Edition"), renderizada con Playwright desde el HTML+CSS del Header (`scripts/make-og-card.cjs`) a `public/Recursos/og-card.png` (1200×630, fondo slate). `layout.tsx` actualiza `og:image`/`twitter:image`. Arregla la "M" recortada al compartir el enlace. **PENDIENTE deploy a Netlify + re-scrape de caché** (Sharing Debugger) para verla en WhatsApp — commit c1641b6

### GPT

- [12.2 ✅] Dropdown de sugerencias en el buscador del Header: top 5 productos desde `/api/products`, enlaces directos a `/games/[slug]`, cierre con click fuera y Escape; `npx tsc --noEmit` + `npx.cmd vitest run` verdes — commit pendiente
- [12.3/12.7 ✅] Filtro por plataforma en pedidos admin: chips PlayStation/Xbox/Nintendo/PC integrados con filtros de estado, pasarela y paginación local en `AdminOrdersPanel`; `npx.cmd tsc --noEmit` + `npx.cmd vitest run` verdes — commit pendiente

## 18-06-2026 (rama dev-18062026)

### GPT

- [12.8 ✅] Logo G2A en ficha de detalle: `icon-g2a.svg` añadido y `GameDetailClient` renderiza G2A con `next/image` cuando el enlace externo es G2A — commit este commit
- [12.9 ✅] Ofertas destacadas: paneles Steam/G2A/Xbox con contenedor 16:9, dots y progreso por panel para evitar recortes agresivos de imágenes panorámicas API en PC — commit este commit
- [13.2 ✅] Logos de API en cards y market intelligence: badges Steam/G2A/Xbox por `storeLabel`/fuente, `icon-steam.svg` normalizado e `icon-xbox.svg` añadido — commit este commit
- [audit ✅] Auditoría actualizada en `PLAN-MEJORAS-AUDITORIA.md`: 11.1 hecho, 11.2 parcial por claves pendientes, 11.4 parcial, 12.7 parcial, 12.8/12.9/13.2 hechos — commit este commit
- [verify ✅] Verificación completa: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` (76/76) y `npm run build` verdes; para el build se pararon procesos locales de Next/Playwright que bloqueaban el DLL de Prisma — commit este commit

## 17-06-2026 (ramas dev-17062026-claude / dev-17062026-gpt)

### Claude (VS Code)

- [fix ✅] auth/account split corregido: auth.module.scss+account.module.scss (falsos CSS Modules con :global()) → auth.scss+account.scss (estilos de dominio globales correctos); 11 imports actualizados; tsc+76/76 tests verdes — commit previo
- [9.5 ✅] Auth layout components CSS Modules: AuthShell/AuthCard/AuthFormPanel/AuthMediaPanel creados en components/auth/layout/ con sus *.module.scss; 11 páginas actualizadas; tsc limpio + 76/76 tests — commit previo
- [MVC ✅] Reorganización MVC: components/layout, ui, features; services/auth, cart, checkout, market, payments; 97 imports actualizados; CLAUDE.md + docs/REGLAS-IA.md creados — sin commit único (sesión anterior)
- [9.3 ✅] Accesibilidad: prefers-reduced-motion para .card-hover, .button-primary, .game-card-actions .button-primary (badge-gradient-sweep), .card.game-card-plus:hover, .game-card-like-icon — en globals.scss + responsive-refinements.scss
- [9.5 ✅] CSS Modules GameCard, GameGrid, GameDetailClient, Header, MarketIntelligenceSections — commits varios
- [Netlify ✅] Deploy bloqueado en ramas distintas de main: netlify.toml ignore="node -e process.exit(...)"
- [perf ✅] HomeClient: FeaturedSection y PromoAppBanner convertidos a next/dynamic (code splitting) — commit sesión actual
- [perf ✅] Cache-Control headers en netlify.toml: /iconos_platforms/* immutable, /Recursos/* 7d, /manifest.json 1d — commit sesión actual
- [perf ✅] Animaciones no-compositadas (49 elementos Lighthouse): eliminados box-shadow/background/border-color/color de todos los transition en 11 archivos SCSS — commit 588ced4
- [perf ✅] will-change: transform en .card-hover, .button-primary, .button-ghost, hero-thumb, footer-icon — commit ecd9c6f
- [perf ✅] Preconnect steam cdn + rawg; dns-prefetch stripe + paypal en layout.tsx — commit b3637ff

### GPT

- [9.5 ✅] CSS Modules FeaturedSection: FeaturedSection.module.scss creado, featured-* extraídos de globals.scss, BADGE_CLASS map y featuredGenreChipActive migrados — commit 3d4384d
- [9.5 ✅] CSS Modules PromoAppBanner: PromoAppBanner.module.scss creado, promo/promo-store/promo-phone/promo-qr extraídos de globals.scss, is-filled preservado como global — commit 3d4384d
- [9.5 ✅] CSS Modules auth split: auth.module.scss + account.module.scss, imports actualizados en 11 pages; auth/checkout separado de account/admin — commit 1927cc1
- [3.2 ✅] Upstash Redis rate limit distribuido: enforceRateLimit usa Upstash si hay env vars y fallback PostgreSQL si faltan o falla Redis — commit 83be33f
- [perf ✅] Reduced motion libera capas GPU: `will-change: auto` añadido a card/button/hero/footer en bloques `prefers-reduced-motion` — commit 7195188
- [fix ✅] ESLint MarketIntelligenceSections verificado: sin `dataSources` sin uso ni disables `react-hooks/exhaustive-deps`; nota de auditoría actualizada — commit este commit

## 13-06-2026 (rama dev-13062026)

### Claude (VS Code)

- [C1 ✅] Audit log: modelo `AuditLog` en Prisma + migración SQL + `logAudit()` + 18 puntos en 14 rutas. Migración aplicada en Neon — commit 5b30d6c
- [C2 ✅] E2E Playwright: `playwright.config.ts` + 3 specs (register-login, search-cart, stripe) con mocked API — commit 9f95d8b
- [C3 ✅] Tests unitarios: `audit-log.test.ts` (8 tests, cubre logAudit completo) + `products.test.ts` (22 tests, cubre clamps y precios) + audit log mock en stripe webhook test — 76/76 pasando — commit 0cc8c40
- [9.5 ✅] Footer migrado a CSS Modules: `Footer.module.scss`, `Footer.tsx`, limpieza de estilos globales y validación visual local — commit 4d1bf0b

### GPT

- [G1 ✅] Lighthouse CI automatizado con `@lhci/cli`, `.lighthouserc.js` y job `lighthouse` en GitHub Actions — commit dc5bf61
- [9.5 ✅] Hero migrado a CSS Modules: `Hero.module.scss`, `Hero.tsx`, limpieza de estilos `hero*` en globales y validación con tsc/vitest/build — commit 0b375f7

## 12-06-2026 (rama dev-12062026)

### Ramón + modelo superior (escritorio)

- [U1 ✅] PAYPAL_WEBHOOK_ID configurado: webhook sandbox `5WD229960R154935L` → `.env` + Netlify env vars (Production)
- [docs ✅] Sistema de trabajo IA creado: REGLAS-IA.md (v2 pulida con jerarquía, DoD, economía de tokens, seguridad operacional), HISTORIAL-TRABAJO.md, CLAUDE.md y AGENTS.md en raíz, secciones FUTURAS MEJORAS y SOLICITUDES DE AUDITORÍA en auditoría, plantilla portable para futuros proyectos
- [docs ✅] Auditoría v3: sección REPARTO DE IMPLEMENTACIÓN con tareas C/G/U/Bloqueado y falso positivo de magic bytes en avatar corregido — commit e1ee6e9 (todo el sistema de docs)

### Claude (VS Code)

- (sin entradas aún)

### GPT

- [9.2 ✅] Estado vacío de búsqueda con sugerencias en games/page y GameGrid — commits c03d077 + d3f2454
- [G5 ✅] CORS explícito en rutas `/api/*` con `Access-Control-Allow-Origin` desde `APP_BASE_URL` — commit b2eb426
- [G7 ✅] PWA manifest.json y enlace de manifest en layout — commit 9bfe327

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

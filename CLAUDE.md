# CLAUDE.md — GameZoneV4

> Carga automática de reglas para agentes Claude al arrancar en este repo.
> Fuente de verdad: `docs/REGLAS-IA.md`. Este archivo es el bootstrap rápido.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Prisma · PostgreSQL (Neon) · SCSS · Netlify · Sentry

## Arquitectura MVC

```
src/
├── app/              CONTROLLER — route handlers (app/api/**/route.ts) + páginas delgadas
├── components/       VIEW — UI organizado por tipo
│   ├── layout/       Header, Footer, SiteShell, PlatformBar, ScrollToTop
│   ├── ui/           GameCard, GameGrid
│   ├── features/     Hero, CartDrawer, FeaturedSection, MarketIntelligenceSections, PromoAppBanner
│   └── auth/         AccountDashboard, AdminPanel, LogoutButton, SessionRefresher…
├── services/         SERVICE LAYER — lógica de negocio por dominio
│   ├── auth/         sesiones, OAuth, 2FA, rate-limit, email
│   ├── cart/         carrito persistente
│   ├── checkout/     órdenes, progreso de pago
│   ├── market/       catálogo externo, deals, trending, pulse, RAWG
│   └── payments/     Stripe, PayPal
├── lib/              INFRA + DATA ACCESS — utilidades y acceso a datos
│   ├── prisma.ts     cliente Prisma
│   ├── logger.ts     logger estructurado
│   ├── env.ts        variables de entorno validadas
│   ├── games.ts      queries de juegos
│   ├── products.ts   queries de productos
│   ├── home-data.ts  datos de la home
│   ├── audit-log.ts  log de auditoría
│   ├── validation.ts esquemas Zod
│   ├── crypto/       TOTP / crypto utilities
│   └── …otros utils (i18n, geo-format, public-price)
├── contexts/         CartContext, SearchContext
├── hooks/            useLocale, useRecentlyViewed, useScrollMemory
├── styles/           globals.scss, auth.scss, responsive-refinements.scss
└── types/            product.ts, global.d.ts
```

## Reglas obligatorias (Sistema 3.1 APD)
1. NO romper auth, carrito ni pagos existentes
2. Mínimo cambio viable — no refactorizar lo que no pide la tarea
3. Tras cada tarea: `npx tsc --noEmit` + `npx vitest run` + `npm run build` limpios
4. Un commit por tarea · formato: `tipo: descripción en minúsculas sin punto DDMMYYYY`
5. NUNCA commitear `.env` ni `prisma/dev.db*`

## Commits
```
feat: descripción 17062026
fix:  descripción 17062026
docs: descripción 17062026
```

## Comandos habituales
```bash
npm run dev          # desarrollo local
npx tsc --noEmit     # verificar tipos
npx vitest run       # tests unitarios
npm run build        # build producción
npx prisma migrate dev  # migración local (parar dev server primero)
```

## Documentos clave
- `docs/REGLAS-IA.md` — protocolo completo Sistema 3.1 / trabajo paralelo IA
- `docs/HISTORIAL-TRABAJO.md` — qué/quién/commit por día
- `docs/PLAN-MEJORAS-AUDITORIA.md` — backlog de mejoras
- `docs/NETLIFY-DEPLOY.md` — checklist de deploy

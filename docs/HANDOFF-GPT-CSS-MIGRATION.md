# HANDOFF GPT — GameZoneV4 CSS Migration continuación

> Documento de traspaso. Claude completó 8 de 11 migraciones CSS Modules.
> Este doc es autosuficiente — no necesitas contexto previo.

---

## 1. Contexto del proyecto

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma, PostgreSQL (Neon), SCSS puro (sin Tailwind), Netlify  
**Rama activa:** `dev-17062026-claude`  
**Deploy:** BLOQUEADO intencionalmente en todas las ramas que no sean `main` (ver `netlify.toml`). No hacer deploy.  
**Verificación obligatoria tras cada tarea:** `npx tsc --noEmit` (debe salir sin output) + `npx vitest run` (debe mostrar 76/76 passed)

---

## 2. Qué es el patrón CSS Modules que se sigue

Cada componente tiene su propio archivo `.module.scss`. Los estilos se importan y se usan como objeto:

```tsx
// Al inicio del .tsx — SIEMPRE primera línea tras los imports de React/Next
import styles from "./ComponentName.module.scss";

// Clase estática simple
<div className={styles.miClase}>

// Clase condicional
<div className={`${styles.base}${activo ? ` ${styles.baseActivo}` : ""}`}>

// Dos clases siempre presentes
<div className={`${styles.claseA} ${styles.claseB}`}>

// Clase global + clase de módulo en el mismo elemento
// (cuando la clase global es un selector compartido que NO se puede mover)
<button className={`button-primary ${styles.miBoton}`}>
```

### Conversión de nombres: kebab-case → camelCase

```
market-pulse-source-panel      → marketPulseSourcePanel
market-pulse-carousel--compact → marketPulseCarouselCompact   (-- = mayúscula)
market-pulse-catalog-card__body → marketPulseCatalogCardBody  (__ = mayúscula)
featured-genre-chip--active    → featuredGenreChipActive
featured-side-card__badge--purple → featuredSideCardBadgePurple
```

### Compound selectors dentro del módulo

```scss
/* En el .module.scss — ambas clases son del módulo */
.marketPulseCatalogCard .marketPulseCardLink { grid-template-rows: auto 1fr; }

/* Clase del módulo + clase global (que DEBE quedarse global) */
.marketPulseCardCart:global(.game-detail-cart-button) {
  position: absolute;
  right: 0.72rem;
  bottom: 0.72rem;
}
```

### Clases globales que NUNCA se mueven a módulos

Estas clases son compound selectors compartidos entre varios componentes y deben permanecer en los archivos globales:
- `button-ghost`, `button-primary`, `btn-padding-site`
- `card`, `card-hover`
- `section-title`, `section-subtitle`, `section-header`
- `cart-icon-button`, `game-detail-cart-button`, `game-suggestion-cart-button`

Cuando un elemento usa una de estas junto con una clase del módulo, se escribe:
```tsx
// La global va como string literal, la del módulo con styles.xxx
className={`game-detail-cart-button ${styles.marketPulseCardCart}`}
```

---

## 3. Estado actual — Lo que YA está hecho

| Commit | Tarea | Módulo creado |
|--------|-------|---------------|
| `4d1bf0b` | Footer | `src/components/layout/Footer.module.scss` |
| `0b375f7` | Hero | `src/components/features/Hero.module.scss` |
| `6b313a1` | GameCard + GameGrid | `src/components/ui/GameCard.module.scss` + `GameGrid.module.scss` |
| `4396a46` | CartDrawer | `src/components/features/CartDrawer.module.scss` |
| `9435b0f` | GameDetailClient | `src/app/games/[slug]/GameDetailClient.module.scss` |
| `11857b0` | Header | `src/components/layout/Header.module.scss` |
| `0fcea97` | MarketIntelligenceSections | `src/components/features/MarketIntelligenceSections.module.scss` |

---

## 4. Estado actual de los ficheros de estilos globales

### `src/styles/globals.scss` (1789 líneas tras las migraciones)

Estructura actual:
- **Líneas 1–807:** Variables `:root`, reset, `html/body`, `.site-shell`, `.main-wrapper`, `.card`, `.card-hover`, `.button-primary`, `.button-ghost`, `.btn-padding-site`, `.badge-soft`, `.chip`, `.legal-page-*`, `.scroll-to-top`, `.error-boundary`, `.game-grid-skeleton`, `.recently-viewed`, `h1 / .section-title { font-family }`, `@media prefers-reduced-motion`. **NO tocar.**
- **Líneas 808–1287:** ⬜ TODO el bloque `featured-*` — PENDIENTE → va a `FeaturedSection.module.scss`
- **Líneas 1288:** Comentario de migración market-intel (ya migrado)
- **Líneas 1289–1789:** ⬜ TODO el bloque `promo-app-*` — PENDIENTE → va a `PromoAppBanner.module.scss`

### `src/styles/responsive-refinements.scss` (76 líneas — mayormente comentarios de migración)

Lo que queda son reglas GLOBALES PERMANENTES (no tocar):
```scss
.game-detail-cart-button img, .game-suggestion-cart-button img { opacity / filter }
.cart-icon-button, .game-suggestion-cart-button, .game-detail-cart-button { estilos botón circular }
.cart-icon-button:hover, .game-suggestion-cart-button:hover, .game-detail-cart-button:hover { ... }
.game-detail-cart-button { position: static; }
@media (max-width: 640px) { .main-wrapper { padding } }
@media (hover: none) { .scroll-to-top:hover { ... } }
```

### `src/styles/auth.scss` (952 líneas — intacto, pendiente de split)

Importado directamente (no como módulo) en 11 archivos page.tsx. El split consistirá en crear dos módulos y actualizar los imports.

---

## 5. TAREA 1 — FeaturedSection CSS Module

### Archivo TSX

`src/components/features/FeaturedSection.tsx`

### Crear

`src/components/features/FeaturedSection.module.scss`

### Clases a migrar (todas vienen de globals.scss líneas 808–1287)

```
featured-section
featured-grid
featured-center
featured-side-card             (tiene &:hover anidado en SCSS)
featured-side-card__media
featured-side-card__img
featured-side-card__overlay
featured-side-card__info
featured-side-card__badge
featured-side-card__badge--purple
featured-side-card__badge--orange
featured-side-card__name
featured-side-card__price-row
featured-side-card__discount
featured-side-card__price
featured-genres
featured-genres-label
featured-genres-row            (tiene @media breakpoints anidados)
featured-genre-chip            (tiene &:hover, &:active, &--active anidados)
featured-genre-icon            (tiene svg nested con .featured-genre-chip:hover & selector)
featured-genre-name
featured-deal
featured-deal__header
featured-deal__fire
featured-deal__title
featured-deal__countdown
featured-deal__cd-block
featured-deal__cd-num
featured-deal__cd-unit
featured-deal__cd-sep
featured-deal__list
featured-deal__row             (tiene &:hover anidado)
featured-deal__cover           (tiene img nested)
featured-deal__info
featured-deal__name
featured-deal__price-row
featured-deal__badge
featured-deal__price
featured-deal__original
```

**Más los bloques responsive** (globals.scss líneas 1198–1287):
```scss
@media (max-width: 1100px) { .featured-grid, .featured-center, .featured-side-card, .featured-side-card__media, .featured-deal__list }
@media (max-width: 720px)  { .featured-section, .featured-grid, .featured-side-card, .featured-side-card__media, .featured-genres, .featured-deal, .featured-genres-row, .featured-genre-chip, .featured-deal__header, .featured-deal__countdown, .featured-deal__list, .featured-deal__row, .featured-deal__cover }
@media (max-width: 420px)  { .featured-side-card, .featured-side-card__media, .featured-side-card__info, .featured-deal__price-row }
```

### Clases dinámicas en el TSX que necesitan lookup

**Badge lateral** — el TSX usa:
```tsx
// ACTUAL (línea 115):
<span className={`featured-side-card__badge ${badgeClass}`}>{badge}</span>
// donde badgeClass = "featured-side-card__badge--purple" | "featured-side-card__badge--orange"
```
→ Solución: crear un mapa constante y aplicar:
```tsx
const BADGE_CLASS: Record<string, string> = {
  "featured-side-card__badge--purple": styles.featuredSideCardBadgePurple,
  "featured-side-card__badge--orange": styles.featuredSideCardBadgeOrange,
};
// En JSX:
<span className={`${styles.featuredSideCardBadge} ${BADGE_CLASS[badgeClass] ?? ""}`}>{badge}</span>
```

**Genre chip activo** — el TSX usa:
```tsx
// ACTUAL (línea 227):
className={`featured-genre-chip${filterGenre === genre ? " featured-genre-chip--active" : ""}`}
```
→ Cambiar a:
```tsx
className={`${styles.featuredGenreChip}${filterGenre === genre ? ` ${styles.featuredGenreChipActive}` : ""}`}
```

### Selector complejo a preservar en el módulo

El `.featured-genre-icon` tiene un selector `svg` con referencia al padre:
```scss
/* ORIGINAL en globals.scss */
.featured-genre-icon {
  svg {
    .featured-genre-chip:hover & {
      transform: scale(1.12);
    }
  }
}
```
→ En CSS Modules se convierte a:
```scss
.featuredGenreIcon {
  svg {
    .featuredGenreChip:hover & {
      transform: scale(1.12);
    }
  }
}
```

### Variable CSS inline a preservar

El componente inyecta `--genre-color` como style inline:
```tsx
style={{ "--genre-color": color } as React.CSSProperties}
```
Las referencias `var(--genre-color)` en el CSS deben preservarse exactamente igual en el módulo. No cambiar esas variables.

### Paso final para FeaturedSection

Después de crear el módulo y actualizar el TSX:
1. Eliminar líneas 808–1287 de `globals.scss` (todo el bloque `featured-*`)
2. Reemplazarlas con un comentario: `/* featured-* migrado a FeaturedSection.module.scss */`
3. `npx tsc --noEmit` → sin errores
4. `npx vitest run` → 76/76
5. Commit: `feat: css modules featuredsection 17062026 — hecho por GPT`

---

## 6. TAREA 2 — PromoAppBanner CSS Module

### Archivo TSX

`src/components/features/PromoAppBanner.tsx`

### Crear

`src/components/features/PromoAppBanner.module.scss`

### Clases usadas en el JSX

El componente solo referencia **2 clases** en JSX. El resto son selectores de hijos directos (elemento HTML, sin className):
```
promo-app-banner        → styles.promoAppBanner
promo-app-banner__image → styles.promoAppBannerImage
```

### Clases a incluir en el módulo (todas de globals.scss líneas 1289–1789)

Aunque el TSX solo use 2 clases, TODO el bloque de CSS debe moverse al módulo para que los selectores de hijos funcionen correctamente:
```
promo-app-banner
promo-app-stripe
promo-app-blue-cut
promo-app-copy
promo-app-kicker
promo-app-title
promo-app-subtitle
promo-app-actions
promo-app-code
promo-app-phone         (con ::before y ::after)
promo-app-qr
promo-app-qr span
promo-app-qr span.is-filled   ← atención: .is-filled es estado global
promo-app-banner__image
```

**Más todos los bloques `@media`** que contienen reglas `promo-app-*` (hay varios breakpoints en esas líneas).

### Para `promo-app-qr span.is-filled`

El selector `.promo-app-qr span.is-filled` — `.is-filled` es una clase de estado añadida dinámicamente. En el módulo:
```scss
.promoAppQr span:global(.is-filled) {
  /* estilos */
}
```

### JSX changes

Solo hay 2 cambios:
```tsx
// ANTES:
<div className="promo-app-banner">
<Image className="promo-app-banner__image" ...>

// DESPUÉS:
<div className={styles.promoAppBanner}>
<Image className={styles.promoAppBannerImage} ...>
```

### Paso final para PromoAppBanner

1. Crear el módulo con TODO el CSS del bloque 1289–1789
2. Actualizar el TSX (solo 2 classNames)
3. Eliminar líneas 1289–1789 de `globals.scss`
4. Reemplazar con: `/* promo-app-* migrado a PromoAppBanner.module.scss */`
5. `npx tsc --noEmit` → sin errores
6. `npx vitest run` → 76/76
7. Commit: `feat: css modules promoappbanner 17062026 — hecho por GPT`

---

## 7. TAREA 3 — auth.scss split en dos módulos

### Contexto

`src/styles/auth.scss` (952 líneas) se importa directamente en 11 archivos:
```
src/app/auth/page.tsx
src/app/auth/register/page.tsx
src/app/auth/forgot-password/page.tsx
src/app/auth/reset-password/page.tsx
src/app/auth/verify/page.tsx
src/app/account/page.tsx
src/app/account/orders/page.tsx
src/app/admin/control/page.tsx
src/app/admin/orders/page.tsx
src/app/checkout/page.tsx
src/app/checkout/success/page.tsx
```

### División

**Parte 1 — Estilos de login/registro + checkout** → `src/styles/auth.module.scss`
Clases: `.auth-shell`, `.auth-card`, `.auth-grid`, `.auth-form-panel`, `.auth-image-panel`, `.auth-field`, `.auth-input`, `.auth-label`, `.auth-submit`, `.auth-oauth-strip`, `.auth-divider`, `.auth-links`, `.auth-totp-*`, `.auth-error-msg`, `.auth-tab-*`, `.checkout-*`, `.form-*`, etc.

Nota verificada por GPT: no partir únicamente por líneas 1–363, porque las reglas `checkout-*` están al final del archivo actual (`checkout-login-*`, `checkout-status-*`, `checkout-progress-*`, `checkout-account-button`, `@keyframes checkout-status-spin` y tablas dentro de `.auth-shell .auth-form`). `src/app/checkout/page.tsx` y `src/app/checkout/success/page.tsx` dependen de ellas.

**Parte 2 — Dashboard/cuenta/admin** → `src/styles/account.module.scss`
Clases: `.account-orders-table*`, `.account-tabs`, `.account-tab`, `.account-avatar-*`, `.account-details-*`, `.account-recovery-panel`, `.account-pending-payment*`, `.admin-*`, etc.

### Estrategia de importación

Como estas clases se usan directamente en page.tsx (no en un componente con módulo), la estrategia más segura es:

**Opción A (recomendada):** Mantener los archivos como CSS plano pero separados:
```tsx
// En los pages de auth:
import "@/styles/auth.module.scss"; // sigue siendo import global, solo está separado

// En los pages de checkout y checkout/success:
import "@/styles/auth.module.scss";

// En los pages de account/admin:
import "@/styles/account.module.scss";
```

**Opción B:** Convertir a CSS Modules reales y actualizar todos los `className` en los componentes afectados (AccountDashboard.tsx, AdminPanel.tsx, etc.)

La Opción A es mínima y segura. La Opción B es más limpia pero requiere revisar muchos más archivos.

### Paso final para auth split

1. Crear `src/styles/auth.module.scss` con los estilos `auth-*`, `checkout-*`, `form-*` y reglas dependientes de `.auth-shell`
2. Crear `src/styles/account.module.scss` con los estilos `account-*`, `admin-*` y reglas responsive asociadas
3. Actualizar imports en los 11 page.tsx afectados
4. Eliminar `src/styles/auth.scss` solo cuando todos los imports estén actualizados y verificados
5. `npx tsc --noEmit` + `npx vitest run` 76/76
6. Commit: `feat: css modules auth split 17062026 — hecho por GPT`

---

## 8. TAREA 4 — Upstash Redis rate limit distribuido (ítem 3.2 de auditoría)

### Por qué

El rate limit actual está en memoria del proceso Node. Si Netlify levanta múltiples instancias o reinicia el proceso, el contador se resetea. Para producción real necesita ser distribuido.

### Qué instalar

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Variables de entorno a añadir

```env
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```
Añadir también en el panel de Netlify → Environment variables.

### Archivos a modificar

- `src/services/auth/rate-limit.ts` — reemplazar la implementación en memoria por `Ratelimit` de `@upstash/ratelimit`

### Implementación de referencia

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 intentos en 15 min
  analytics: false,
});

export const registerRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"), // 3 registros por hora por IP
  analytics: false,
});
```

### Uso en las rutas API

```typescript
const { success } = await loginRateLimit.limit(ip);
if (!success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
```

Afecta a:
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/forgot-password/route.ts`

---

## 9. TAREA 5 — Cloudflare Turnstile anti-bot en registro (ítem 7.5 de auditoría)

> Solo implementar si hay registros basura reales. Es opcional.

### Qué es

Widget anti-bot invisible (sin CAPTCHA visual). Gratis en Cloudflare. Sin fricción para el usuario.

### Variables de entorno

```env
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...   # pública, en el frontend
TURNSTILE_SECRET_KEY=...             # privada, solo en el servidor
```

### Archivos a modificar

- `src/app/auth/register/page.tsx` — añadir el widget de Turnstile
- `src/app/api/auth/register/route.ts` — verificar el token en el servidor antes de crear la cuenta

### Implementación del widget (frontend)

```tsx
// En el formulario de registro:
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}></div>
<input type="hidden" name="cf-turnstile-response" />
```

### Verificación en el servidor

```typescript
const token = formData.get("cf-turnstile-response");
const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  }),
});
const { success } = await verifyRes.json();
if (!success) return NextResponse.json({ error: "Bot detectado" }, { status: 403 });
```

---

## 10. Formato de commits (obligatorio)

```
feat: css modules featuredsection 17062026 — hecho por GPT
feat: css modules promoappbanner 17062026 — hecho por GPT
feat: css modules auth split 17062026 — hecho por GPT
feat: upstash redis rate limit 17062026 — hecho por GPT
feat: cloudflare turnstile registro 17062026 — hecho por GPT
```

---

## 11. Reglas de seguridad operacional (no negociables)

- **NUNCA** commitear `.env` ni `prisma/dev.db*`
- **NO** hacer push a `main` ni triggear deploy de Netlify
- **NO** romper auth, carrito ni pagos existentes
- **NO** mover las clases globales listadas en el apartado 2
- **NO** refactorizar código que no pide la tarea
- Tras cada tarea: `npx tsc --noEmit` limpio + `npx vitest run` 76/76

---

## 12. Historial de trabajo (actualizar tras cada commit)

Añadir entradas en `docs/HISTORIAL-TRABAJO.md` bajo la sección `## 17-06-2026` → `### GPT`:

```markdown
- [9.5 ✅] CSS Modules FeaturedSection: FeaturedSection.module.scss creado, featured-* extraídos de globals.scss (808-1287), BADGE_CLASS map, featuredGenreChipActive — commit XXXXXXX
- [9.5 ✅] CSS Modules PromoAppBanner: PromoAppBanner.module.scss creado, promo-app-* extraídos de globals.scss (1289-1789) — commit XXXXXXX
- [9.5 ✅] CSS Modules auth split: auth.module.scss + account.module.scss, imports actualizados en 11 pages — commit XXXXXXX
- [3.2 ✅] Upstash Redis rate limit distribuido — commit XXXXXXX
- [7.5 ✅] Cloudflare Turnstile anti-bot en registro — commit XXXXXXX
```

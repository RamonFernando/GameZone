# GameZone / Next Gaming Store

Proyecto e-commerce con Next.js (App Router), Prisma/PostgreSQL (Neon), autenticación con sesiones persistentes, RBAC y checkout con pasarelas de pago.

Documentación de pruebas centralizada en: `TESTING.md`.

## Índice

### Empezar

- [Requisitos](#requisitos)
- [Variables de entorno](#variables-de-entorno)
- [Arranque rapido](#arranque-rapido)

### Documentación

- [Metadata de juegos con RAWG](#metadata-de-juegos-con-rawg)
- [Datos externos y market intelligence](#datos-externos-y-market-intelligence)
- [Comando unico de recuperacion (Windows)](#comando-unico-de-recuperacion-windows)
- [Configuracion OAuth social (sin errores de callback)](#configuracion-oauth-social-sin-errores-de-callback)
- [Prueba E2E de checkout (sin UI)](#prueba-e2e-de-checkout-sin-ui)
- [Pagos y webhooks](#pagos-y-webhooks)
- [Seguridad de pagos aplicada](#seguridad-de-pagos-aplicada)
- [Despliegue en Netlify](#despliegue-en-netlify)
- [Registro y páginas legales](#registro-y-páginas-legales)
- [Comandos de tests (ejecucion rapida)](#comandos-de-tests-ejecucion-rapida)
- [Información del proyecto](#información-del-proyecto)

### Changelog

- [Novedades recientes (11-06-2026)](#novedades-recientes-11-06-2026)
- [Novedades recientes (10-06-2026)](#novedades-recientes-10-06-2026)
- [Novedades recientes (09-06-2026)](#novedades-recientes-09-06-2026)

## Requisitos

- Node.js 18+
- npm
- Stripe CLI (opcional, recomendado para pruebas de webhook)

## Variables de entorno

Copia `.env.example` a `.env` y completa al menos:

- `DATABASE_URL`
- `APP_BASE_URL`
- `SESSION_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (se obtiene con Stripe CLI o desde Dashboard)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` (`sandbox` o `live`)
- `PAYPAL_WEBHOOK_ID`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `MAIL_BRAND_NAME`, `MAIL_SUPPORT_EMAIL`, `MAIL_LOGO_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- `RAWG_API_KEY` (opcional, para enriquecer fichas de juegos con metadata externa)

## Arranque rapido

```bash
npm install
npm run db:migrate
npm run dev
```

## Novedades recientes (11-06-2026)

### SEO básico (posicionamiento en Google)

- **Metadatos de producción** en `src/app/layout.tsx`: `metadataBase`, `title.template`, descripción, keywords, Open Graph y Twitter Card. Base sobre `APP_BASE_URL`.
- **`src/app/robots.ts`**: permite crawlers en rutas públicas, bloquea `/api/`, `/admin/`, `/account/`, `/checkout/`, `/auth/`; declara el sitemap.
- **`src/app/sitemap.ts`** (dinámico, `force-dynamic`): rutas estáticas + todos los productos `isActive` leídos de Prisma (slug + `updatedAt`). Fallback a rutas estáticas si la BD falla.
- **Favicon** `src/app/icon.svg`.
- **Google Search Console:** propiedad verificada vía etiqueta meta (`verification.google` en `layout.tsx`). **No borrar esa etiqueta** o se pierde la verificación. Sitemap enviado.
- **SEO avanzado por ficha de juego:** `src/app/games/[slug]/page.tsx` es Server Component, lee el producto con Prisma mediante `getActiveProductBySlug`, usa `notFound()` para slugs inexistentes y delega la UI interactiva en `GameDetailClient`.
- **Metadata por juego:** `generateMetadata` genera `title`, `description`, Open Graph con `coverImage` y canonical propio para cada ficha.
- **JSON-LD Product:** cada ficha inyecta schema.org `Product` con nombre, imagen, descripción, oferta en EUR, disponibilidad segun stock y `aggregateRating` cuando hay rating + conteo.

### Subida de imágenes de producto desde el equipo

- Tabla `ProductImage` (`Bytes` en PostgreSQL), mismo patrón que `UserAvatar` (compatible con Netlify serverless, sin filesystem).
- **Subida:** `POST /api/admin/product-images` (permiso `admin.products.write`): valida *magic bytes* (JPEG/PNG/WebP), límite 5 MB, normaliza a WebP con `sharp` y guarda los bytes en BD. Devuelve `{ url: /api/product-images/<id> }`.
- **Servir:** `GET /api/product-images/[id]` (público, cache inmutable) devuelve los bytes.
- Input de archivo en el panel admin (`AdminProductsPanel.tsx`), tanto en **crear** como en **editar** producto: al subir, rellena el campo `coverImage` automáticamente.
- Nota: la URL del campo imagen debe apuntar a un archivo de imagen real (no a una página); los dominios externos permitidos están en `remotePatterns` de `next.config.mjs`.

### Fix appId de Steam en market pulse

- `src/lib/market/pulse.ts`: el appId de **Marathon** estaba mal (`2453150`, que es otro juego). Corregido a `3065800` (Marathon de Bungie) para que el widget muestre la portada real.

## Novedades recientes (10-06-2026)

### Migración a PostgreSQL (Neon) y avatares en BD

- **Base de datos SQLite → PostgreSQL (Neon):** `schema.prisma` usa `provider = "postgresql"` con `directUrl`. Esquema migrado y datos copiados (67 productos, 5 usuarios, 58 pedidos, etc.) con conteos verificados. El script de copia (`scripts/migrate-data-to-postgres.cjs`) usó dos clientes Prisma para conversión de tipos segura. Backup del SQLite en `prisma/dev.db.backup-pre-postgres-*` y migraciones antiguas en `prisma/_migrations_sqlite_backup/`.
  - **Producción Netlify:** usar la URL **pooled** (`-pooler`) en `DATABASE_URL`; la directa solo para `prisma migrate` (`DATABASE_URL_UNPOOLED`).
- **Avatares en la base de datos:** ya no se usa `fs.writeFile` (incompatible con Netlify serverless). El avatar se guarda como `Bytes` en la tabla `UserAvatar` y se sirve desde `GET /api/account/avatar/[userId]`. La subida (`POST /api/account/avatar`) valida tamaño máximo (2 MB) y *magic bytes* reales, y redimensiona a 256×256 WebP con `sharp`.

### Auditoría de seguridad y preparación Netlify (Fase 1 + Fase 2 parcial)

- **Geo en middleware sin fetch externo:** `middleware.ts` ya no llama a `ipapi.co`. Lee la cabecera `x-nf-geo-country` que Netlify inyecta; fallback `ES/EUR/es-ES` en local.
- **Netlify deploy:** creados `netlify.toml` (build command, plugin `@netlify/plugin-nextjs`) y `netlify/functions/sync-catalogs.mts` (Scheduled Function que reemplaza el cron de `vercel.json`, dispara a las 05:00 UTC).
- **Cabeceras HTTP de seguridad:** `next.config.mjs` añade en todas las rutas `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS` y `Content-Security-Policy`.
- **Tolerancia TOTP reducida:** `epochTolerance` bajado de 30 a 1 periodo (±30 s) en `totp/enable` y `totp/verify`.
- **Rate limit en 2FA/TOTP:** 5 intentos / 10 min por IP en `/api/auth/2fa/verify` y `/api/auth/totp/verify`.
- **Validación de tipo de evento en webhooks:** Stripe y PayPal retornan 200 inmediatamente para tipos no gestionados; el cast a `Checkout.Session` ocurre solo tras verificar `event.type`.
- **CI en GitHub Actions:** `.github/workflows/ci.yml` ejecuta `tsc + vitest + build` en cada push/PR a `main`.

## Novedades recientes (09-06-2026)

### Boton flotante "Volver al inicio"

- Componente `ScrollToTop` (`src/components/ScrollToTop.tsx`): aparece al bajar 400 px, lleva al inicio con scroll suave.
- Disponible en todas las paginas: integrado en `SiteShell` (páginas con Header/Footer) y en la home page directamente.
- Estilos en `globals.scss` (clase `.scroll-to-top`): posicion fija, radio completo, fondo indigo, responsive (se achica en movil).

### Pagina de catalogo completo (`/games`)

- Nueva ruta `src/app/games/page.tsx`: muestra todos los productos con filtros de busqueda y plataforma activos.
- `GameGrid` recibe prop `isFiltered` para mostrar todos los resultados sin limite cuando hay filtro activo.
- Limite de tarjetas en home: 40 en escritorio, 20 en movil. Enlace "Ver todos →" aparece si hay mas juegos.

### Sincronizacion del carrito entre pestanas y dispositivos

- `BroadcastChannel("gamezone-cart")` sincroniza el carrito en tiempo real entre pestanas abiertas del mismo navegador.
- Para usuarios autenticados: `visibilitychange` y `focus` resincronizan desde la BD al volver a la pestana.
- Escrituras incrementales al servidor (`POST /api/cart/items`, `PATCH /api/cart/items/[slug]`, `DELETE /api/cart/items/[slug]`) en lugar de reemplazar todo el carrito.
- Cookie anonima preestablecida en el middleware para evitar race conditions con el carrito anonimo.

### Corrección de layout hero en movil (Surface Duo 549x720)

- Hero a `100svh` en movil para que ocupe pantalla completa.
- `padding-top` del contenido interno ajustado por rango de breakpoint para evitar solapamiento con el header:
  - `< 481px`: `calc(2.5rem + 4.25rem)` (header 1 fila).
  - `481px – 1023px`: `12rem` (header 3 filas).
  - `>= 1024px`: valor por defecto.

## Registro y páginas legales

- **Registro** (`/auth/register`): checkbox obligatorio de aceptación de [Términos y condiciones](/terms); checkbox opcional para recibir correos con novedades y ofertas.
- **Términos y condiciones**: `/terms`.
- **Política de privacidad**: `/privacy`.

## Comandos de tests (ejecucion rapida)

Con el servidor corriendo (`npm run dev`), puedes ejecutar:

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
npx vitest run src/app/api/payments/stripe/webhook/route.test.ts
npx vitest run src/app/api/payments/paypal/webhook/route.test.ts
npx vitest run src/app/api/auth/login-2fa-flow.test.ts
npm run e2e:all
npm run e2e:all:continue
npm run e2e:checkout
npm run e2e:stripe
npm run e2e:paypal
```

- `lint`: revisa el codigo con ESLint (`eslint .`).
- `tsc --noEmit`: comprueba TypeScript sin generar archivos.
- `test:unit`: ejecuta pruebas unitarias/integración ligera con Vitest. Actualmente cubre 48 tests en 10 archivos, incluyendo servicios de checkout, webhooks Stripe/PayPal y login + 2FA.
- `build`: genera la build de produccion; incluye `prisma generate`.
- `npx vitest run src/app/api/payments/stripe/webhook/route.test.ts`: ejecuta solo los tests route-level del webhook Stripe.
- `npx vitest run src/app/api/payments/paypal/webhook/route.test.ts`: ejecuta solo los tests route-level del webhook PayPal.
- `npx vitest run src/app/api/auth/login-2fa-flow.test.ts`: ejecuta solo el flujo login + 2FA email.
- `e2e:all`: ejecuta los 3 tests en secuencia.
- `e2e:all:continue`: ejecuta los 3 tests aunque uno falle y muestra resumen final.
- `e2e:checkout`: login + compra manual + verificacion en panel admin.
- `e2e:stripe`: login + creacion de sesion Stripe (devuelve checkout URL).
- `e2e:paypal`: login + creacion de orden PayPal (devuelve checkout URL).

## Metadata de juegos con RAWG

El proyecto puede enriquecer los productos locales con informacion externa de RAWG:
descripcion larga, desarrollador, editor, fecha de lanzamiento, generos, plataformas,
capturas, rating, requisitos y web oficial.

### Configurar RAWG

1. Crea o revisa tu API key en RAWG:
   - `https://rawg.io/apidocs`
1. En `.env`, agrega:

```env
RAWG_API_KEY=tu_api_key
```

No subas `.env` al repositorio. Si una key queda visible en una captura o chat,
usa `Refresh Key` en RAWG y reemplazala.

### Probar sin guardar cambios

Antes de guardar metadata, prueba siempre con `--dry-run`.

Un juego concreto:

```bash
npm run enrich:games -- --slug destroy-all-humans-2-reprobed --dry-run
```

Primeros 3 juegos del catalogo:

```bash
npm run enrich:games -- --limit 3 --dry-run
```

El resultado debe mostrar que el juego local apunta al juego correcto de RAWG.
Si RAWG empareja mal un juego, no ejecutes el guardado todavia.

### Guardar metadata

Guardar un juego concreto:

```bash
npm run enrich:games -- --slug destroy-all-humans-2-reprobed
```

Guardar los primeros 3 juegos:

```bash
npm run enrich:games -- --limit 3
```

Guardar todo el catalogo activo:

```bash
npm run enrich:games
```

Despues de guardar, recarga la ficha del juego, por ejemplo:

```text
http://localhost:3000/games/destroy-all-humans-2-reprobed
```

### Anadir juegos nuevos

Puedes seguir anadiendo productos nuevos sin metadata RAWG. La ficha funciona con
los datos basicos del producto:

- nombre
- slug
- descripcion corta
- imagen principal
- precio
- plataforma
- region
- tienda
- tipo de producto

La metadata RAWG es opcional. Para enriquecer un juego nuevo, primero prueba el
emparejamiento sin guardar:

```bash
npm run enrich:games -- --slug slug-del-juego --dry-run
```

Si RAWG devuelve el juego correcto, guarda la metadata:

```bash
npm run enrich:games -- --slug slug-del-juego
```

Si RAWG devuelve un juego equivocado, agrega un override en
`scripts/rawg-overrides.json` y repite el `--dry-run`.

### Overrides de RAWG

Si RAWG devuelve un juego equivocado, usa `scripts/rawg-overrides.json`.
Ejemplo:

```json
{
  "god-of-war-ragnarok": {
    "rawgSlug": "god-of-war-ragnarok"
  }
}
```

Tambien se puede usar `rawgId` si el ID es mas fiable:

```json
{
  "mi-slug-local": {
    "rawgId": 123456
  }
}
```

Despues de editar overrides, vuelve a probar con `--dry-run`.

## Datos externos y market intelligence

GameZone prepara rutas internas para consumir datos externos sin llamar APIs de terceros
directamente desde los componentes del frontend.

### Ofertas de mercado

Primera ruta implementada:

```text
GET /api/market/deals
GET /api/market/deals?limit=4
```

Para que sirve:

- Consulta CheapShark por titulo de producto.
- Cruza las ofertas encontradas con productos activos de GameZone.
- Normaliza `title`, `image`, `store`, `dealPrice`, `normalPrice`, `gameZonePrice`, `saving`, `sourceId`, `sourceUrl` y `catalogMatch`.
- Si CheapShark falla o no encuentra coincidencias, usa fallback del catalogo interno.
- Usa cache de 30 minutos para reducir dependencia de la API externa.

Pendiente inmediato:

- Conectar `MarketIntelligenceSections` a `/api/market/deals` y reemplazar los mocks visuales de precios. Hecho; conserva fallback local si la API falla.

### Metadata de mercado

Rutas implementadas:

```text
GET /api/market/games
GET /api/market/games/{slug}
```

Para que sirve:

- `/api/market/games` devuelve resumenes del catalogo preparados para metadata.
- `/api/market/games/{slug}` cruza el producto local con RAWG usando `RAWG_API_KEY`.
- Si RAWG no responde o no hay clave, la ruta devuelve fallback de GameZone.
- Normaliza campos como `title`, `slug`, `cover`, `genres`, `platforms`, `released`, `rating`, `tags`, `stores`, `developer`, `publisher` y `source`.

### Tendencias de mercado

Ruta implementada:

```text
GET /api/market/trending
GET /api/market/trending?limit=3
```

Para que sirve:

- Usa RAWG como primera fuente de tendencias.
- Cruza cada resultado con el catalogo local de GameZone por titulo.
- Devuelve `rank`, `title`, `image`, `platform`, `signal`, `source`, `trendScore`, `gameZoneMatch` y `catalogMatch`.
- Si RAWG falla o no hay clave, responde con fallback basado en productos activos de GameZone.
- `MarketIntelligenceSections` ya consume esta ruta para sustituir los mocks de tendencias.

### Pulso de mercado por fuente

Ruta implementada:

```text
GET /api/market/pulse
```

Para que sirve:

- Separa G2A, Steam y RAWG para no mezclar ventas, actividad y metadata.
- Devuelve G2A populares, G2A mas vendidos, Steam top sellers, Steam mas jugados y RAWG radar.
- Cruza cada item con el catalogo GameZone y marca `En catalogo` u `Oportunidad de inventario`.
- Usa cache y snapshots de respaldo si una fuente publica bloquea o cambia el HTML.
- `MarketIntelligenceSections` ya consume esta ruta en el tablero Market Intelligence v2.

#### G2A Integration API

G2A se consulta mediante la Integration API con cabecera:

```text
Authorization: G2A_API_HASH, G2A_API_KEY
```

Variables necesarias en `.env`:

```env
G2A_API_BASE_URL=https://sandboxapi.g2a.com
G2A_API_HASH=tu_client_id_o_hash
G2A_API_KEY=tu_api_key
```

Notas:

- El sandbox sirve para probar integracion, pero devuelve productos de prueba.
- Para catalogo real hay que usar credenciales de produccion.
- No subas `.env` al repositorio.
- Si las credenciales quedan expuestas, rotalas antes de pasar a produccion.

La capa de G2A filtra productos no deseados como random keys, gift cards, cash cards,
wallets, accounts, bundles/packs y regiones raras antes de alimentar las cards o la BD.

### Sincronizacion de productos desde mercado

Endpoint admin:

```text
GET /api/admin/products/sync-market
POST /api/admin/products/sync-market
POST /api/admin/products/sync-market?dryRun=1
POST /api/admin/products/sync-market?force=1
```

Para que sirve:

- `GET` devuelve la ultima sincronizacion, si hay una en curso y si se puede ejecutar hoy.
- `dryRun=1` previsualiza creados, actualizados y omitidos sin escribir en BD.
- Sin `dryRun`, actualiza productos existentes y crea oportunidades nuevas.
- `force=1` solo funciona para `SUPER_ADMIN` y permite saltar el limite de 24 horas.
- El endpoint exige permiso `admin.catalog.sync`, asignado por defecto a `ADMIN` y `SUPER_ADMIN`.
- La ejecucion queda registrada en `CatalogSyncRun` con estado, origen, conteos y errores.
- Hay bloqueo anti-duplicado: si una sincronizacion reciente sigue `running`, no arranca otra.
- La sincronizacion admin consume G2A, Steam y RAWG desde `listMarketPulse()`.
- G2A solo actualiza un producto existente si el match de catalogo es fuerte (`matchScore >= 80`).
- Si el match es debil, se crea/omite por slug para evitar cruces falsos.

Cron diario protegido:

```text
GET /api/cron/sync-catalogs
POST /api/cron/sync-catalogs
```

- Requiere `Authorization: Bearer ${CRON_SECRET}`.
- En Vercel queda programado en `vercel.json` para ejecutarse cada dia a las `05:00 UTC`.
- Vercel invoca cron con `GET`; `POST` queda disponible para cron externo o pruebas manuales.
- Si ya hubo una sincronizacion de escritura exitosa en las ultimas 24 horas, responde `409`.

Variable necesaria:

```env
CRON_SECRET=un_secreto_largo_y_aleatorio
```

Tambien hay scripts locales:

```bash
npm.cmd run market:sync:dry
npm.cmd run market:sync
npm.cmd run market:sync:dry -- --all
npm.cmd run market:sync -- --all
```

- `market:sync:dry`: previsualiza sincronizacion G2A sin escribir.
- `market:sync`: escribe en la BD local usando los datos filtrados de G2A.
- `--all`: incluye todas las fuentes del pulso de mercado: G2A, Steam y RAWG.
- Ambos scripts esperan el servidor dev levantado, porque consumen `GET /api/market/pulse`.
- El boton admin y el cron usan `runCatalogSync()` directamente y piden datos frescos a G2A, Steam y RAWG; la ruta publica `GET /api/market/pulse` conserva cache para lecturas del dashboard.

### Cruce con catalogo GameZone

Las rutas de mercado comparten una capa de matching en:

```text
src/lib/market/catalog-match.ts
```

Para que sirve:

- Normaliza titulos externos y productos GameZone.
- Calcula `matchScore`.
- Devuelve `catalogMatch` consistente en deals, metadata y tendencias.
- Expone senales preparadas para recomendaciones: `priceSignal`, `trendSignal` y `metadataSignal`.

### Fallback y cache

Todas las rutas de market devuelven un bloque `meta`:

```json
{
  "externalSource": "RAWG",
  "fallbackUsed": false,
  "cachedForSeconds": 3600
}
```

Para que sirve:

- `externalSource`: indica la fuente externa principal (`CheapShark`, `RAWG` o `GameZone`).
- `fallbackUsed`: indica si la respuesta uso fallback local.
- `cachedForSeconds`: indica durante cuantos segundos se cachea el fetch externo.

### Recomendaciones

Ruta implementada:

```text
GET /api/recommendations
GET /api/recommendations?limit=6
```

Para que sirve:

- Combina catalogo GameZone, descuentos, popularidad y tendencias.
- Devuelve `score`, `reason`, `catalogMatch`, `priceSignal`, `trendScore` y `nextAction`.
- Usa RAWG trending como senal externa cuando esta disponible.
- Si RAWG falla, sigue recomendando con senales del catalogo local.
- `MarketIntelligenceSections` ya consume esta ruta y muestra recomendaciones visibles en la home.

## Comando unico de recuperacion (Windows)

Si vuelve a aparecer un error de runtime en desarrollo como `components.ComponentMod.handler is not a function`, ejecuta este comando:

```bash
npm run dev:reset
```

Para que sirve:

- Cierra procesos colgados que esten escuchando en los puertos `3000` y `3001`.
- Limpia la cache de Next (`.next`) para evitar artefactos inconsistentes.
- Vuelve a levantar `next dev` desde cero.

Cuando usarlo:

- Cuando el proyecto ya compila (`npm run build` OK) pero en `npm run dev` sigues viendo errores viejos.
- Cuando hay overlays persistentes de Turbopack/Next despues de cambios grandes.
- Cuando detectas que hay mas de un servidor dev activo en paralelo.

## Configuracion OAuth social (sin errores de callback)

### Google

1. Crea proyecto en Google Cloud Console y habilita OAuth consent + credentials.
1. Crea un OAuth Client tipo Web Application.
1. Agrega redirect URI:
   - `http://localhost:3000/api/auth/oauth/google/callback`
1. Copia en `.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
1. Opcional: fija `GOOGLE_REDIRECT_URI` si usas otro dominio/puerto.

### Facebook

1. Crea app en Meta for Developers.
1. Agrega producto Facebook Login.
1. En Valid OAuth Redirect URIs agrega:
   - `http://localhost:3000/api/auth/oauth/facebook/callback`
1. Copia en `.env`:
   - `FACEBOOK_CLIENT_ID`
   - `FACEBOOK_CLIENT_SECRET`
   - `FACEBOOK_CONFIG_ID` si tu app usa Facebook Login con configuracion/caso de uso.
1. Opcional: fija `FACEBOOK_REDIRECT_URI` si usas otro dominio/puerto.

### Twitter/X

1. Crea proyecto/app en Twitter Developer Portal.
1. Activa OAuth 2.0 Authorization Code + PKCE.
1. Configura callback URL:
   - `http://localhost:3000/api/auth/oauth/twitter/callback`
1. Copia en `.env`:
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`
1. Opcional: fija `TWITTER_REDIRECT_URI` si usas otro dominio/puerto.

### Checklist rapido

- `APP_BASE_URL` debe coincidir con tu dominio real (o localhost).
- El callback registrado en proveedor debe ser exacto (incluye protocolo, puerto y path).
- Si sale `oauthError=state`, limpia cookies y vuelve a intentar.
- Si sale `oauthError=config`, revisa variables de entorno faltantes.

### Probar cada boton en 1 minuto

Con el servidor levantado (`npm run dev`), abre estas URLs en el navegador:

- Google:
  - `http://localhost:3000/api/auth/oauth/google/start?next=/account`
- Facebook:
  - `http://localhost:3000/api/auth/oauth/facebook/start?next=/account`
- Twitter/X:
  - `http://localhost:3000/api/auth/oauth/twitter/start?next=/account`

Resultado esperado:

- Debe redirigirte al proveedor para autorizar.
- Al aceptar, vuelves a `/account` con sesión iniciada.
- Si algo falla, vuelves a `/auth?oauthError=...` y revisas el checklist anterior.

## Prueba E2E de checkout (sin UI)

Con el servidor corriendo, puedes validar login + compra + verificacion en panel admin:

```bash
npm run e2e:checkout
```

El script:

- hace login en `POST /api/auth/login`
- ejecuta compra en `POST /api/checkout` (modo manual)
- verifica que el pedido aparezca en `GET /api/admin/orders?status=paid&provider=manual`

Variables opcionales para el script:

- `E2E_BASE_URL` (default `http://localhost:3000`)
- `E2E_IDENTIFIER` (default `admin@local.test`)
- `E2E_PASSWORD` (default `admin`)

Ejemplo:

```bash
$env:E2E_BASE_URL="http://localhost:3001"; $env:E2E_IDENTIFIER="admin@local.test"; $env:E2E_PASSWORD="admin"; npm run e2e:checkout
```

## Pagos y webhooks

### Endpoints implementados

- Stripe checkout: `POST /api/payments/stripe/create-session`
- Stripe finalize retorno cliente: `POST /api/payments/stripe/finalize`
- Stripe webhook servidor: `POST /api/payments/stripe/webhook`
- PayPal checkout: `POST /api/payments/paypal/create-order`
- PayPal finalize retorno cliente: `POST /api/payments/paypal/finalize`
- PayPal webhook servidor: `POST /api/payments/paypal/webhook`

### Prueba rapida de Stripe webhook (5 minutos)

1. Inicia la app:

```bash
npm run dev
```

1. En otra terminal, inicia listener y reenvio:

```bash
npm run stripe:webhook:listen
```

1. Copia el `whsec_...` que muestra Stripe CLI y colocalo en `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

1. Dispara eventos de prueba:

```bash
npm run stripe:webhook:test:checkout
npm run stripe:webhook:test:async
```

1. Verifica resultados:

- Debes ver `200` en el listener de Stripe.
- Si el `metadata.orderId/userId` existe en la sesion, el pedido se marca como `paid`.
- Puedes revisar en `/admin/orders` con filtro `paid`.

### Configuracion de Stripe webhook en produccion

1. En Stripe Dashboard crea endpoint:
   - URL: `https://tu-dominio.com/api/payments/stripe/webhook`
2. Suscribe eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
3. Guarda el signing secret en:
   - `STRIPE_WEBHOOK_SECRET`

### Configuracion de PayPal webhook en produccion

1. En PayPal Developer crea webhook endpoint:
   - URL: `https://tu-dominio.com/api/payments/paypal/webhook`
2. Suscribe eventos recomendados:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
3. Copia el Webhook ID en:
   - `PAYPAL_WEBHOOK_ID`
4. Usa credenciales correctas segun ambiente:
   - Sandbox -> `PAYPAL_ENV=sandbox`
   - Live -> `PAYPAL_ENV=live`

### Emails de confirmacion de compra

Cuando un pedido pasa a `paid`, la app envia un email de confirmacion al correo
del usuario que hizo la compra. El email incluye el nombre de la tienda, numero
de pedido, enlace a la cuenta, productos comprados, cantidades, subtotales y
total.

Para enviar a correos reales, configura SMTP en `.env`:

```env
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=tu_usuario
SMTP_PASS=tu_password_o_app_password
SMTP_FROM=no-reply@tudominio.com
MAIL_BRAND_NAME=GameZone Store
MAIL_SUPPORT_EMAIL=soporte@tudominio.com
MAIL_LOGO_URL=
```

Si no hay SMTP real, la app usa Ethereal de prueba. En ese modo el email no
llega a Gmail/Outlook: revisa la consola del servidor y abre la URL que aparece
como `Vista previa email de compra: https://ethereal.email/message/...`.

## Seguridad de pagos aplicada

- El pedido nace en estado `pending`.
- Se marca `paid` solo tras confirmacion del proveedor (finalize o webhook).
- Se guarda referencia de pago (`paymentReference`) y proveedor (`paymentProvider`).
- El email de confirmacion se envia despues de confirmar pago.
- Webhooks permiten completar pago aunque el cliente cierre la pestaña.

## Despliegue en Netlify

- **Build command:** `npm run build` (incluye `prisma generate`). Configurado en `netlify.toml`.
- **Plugin:** `@netlify/plugin-nextjs` declarado en `netlify.toml` y en `devDependencies`.
- **Cron:** `netlify/functions/sync-catalogs.mts` reemplaza `vercel.json`; se dispara a las 05:00 UTC.
- **Variables de entorno:** ver el checklist completo en `docs/NETLIFY-DEPLOY.md`. Incluye `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (directa), `SESSION_SECRET`, `CRON_SECRET`, `STRIPE_*`, `PAYPAL_*`, `SMTP_*`, `APP_BASE_URL`, OAuth y RAWG/G2A.

### Base de datos en producción

Ya migrada a **PostgreSQL (Neon)**. En Netlify, `DATABASE_URL` debe usar la URL **pooled** (host con `-pooler`) y `DATABASE_URL_UNPOOLED` la **directa** (sin `-pooler`, solo para `prisma migrate`). Detalle y checklist en `docs/NETLIFY-DEPLOY.md`.

## Información del proyecto

Datos útiles para conocer el tamaño aproximado del proyecto, sus estilos y las tecnologías principales usadas.

```text
┌──────────────────────────────┬──────────┬──────────┐
│ Categoría                    │ Archivos │ Líneas   │
├──────────────────────────────┼──────────┼──────────┤
│ Código app sin tests         │ 162      │ 23.316   │
├──────────────────────────────┼──────────┼──────────┤
│ Tests                        │ 10       │ 1.206    │
├──────────────────────────────┼──────────┼──────────┤
│ Estilos SCSS/CSS             │ 3        │ 6.401    │
├──────────────────────────────┼──────────┼──────────┤
│ Documentación                │ 8        │ 1.970    │
├──────────────────────────────┼──────────┼──────────┤
│ Config JSON/YAML/TOML        │ 9        │ 10.162   │
├──────────────────────────────┼──────────┼──────────┤
│ Total contado                │ 192      │ 43.055   │
└──────────────────────────────┴──────────┴──────────┘
```

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Resumen útil                 │ Valor                                        │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Código + tests + estilos     │ 30.923 líneas                                │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Solo código app              │ 23.316 líneas                                │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ SCSS actual                  │ 6.401 líneas en 3 archivos                   │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

```text
┌──────────────────────────────┬──────────────────────────────────────────────┐
│ Categoría                    │ Tecnologías                                  │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Frontend                     │ Next.js 16, React 19, TypeScript             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Backend                      │ API Routes, Server Components, Route Handlers│
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Base de datos                │ PostgreSQL, Neon                             │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ ORM                          │ Prisma                                       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Estilos                      │ SCSS, Sass, CSS                              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Autenticación                │ Sesiones propias, OAuth, RBAC                │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Seguridad                    │ 2FA, TOTP, HMAC, AES-256-GCM                 │
│                              │ CSP, rate limit                              │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Pagos                        │ Stripe, PayPal                               │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Testing                      │ Vitest, Vite, scripts E2E                    │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Deploy / CI                  │ Netlify, Netlify Functions, GitHub Actions   │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Observabilidad               │ Sentry                                       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ APIs externas                │ RAWG, CheapShark, G2A, Steam                 │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ SEO                          │ Metadata dinámica, Open Graph, JSON-LD       │
├──────────────────────────────┼──────────────────────────────────────────────┤
│ Total aproximado             │ 25+ tecnologías principales                  │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

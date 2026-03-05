# GameZone / Next Gaming Store

Proyecto e-commerce con Next.js (App Router), Prisma/SQLite, autenticación con sesiones persistentes, RBAC y checkout con pasarelas de pago.

Documentación de pruebas centralizada en: `TESTING.md`.

## Registro y páginas legales

- **Registro** (`/auth/register`): checkbox obligatorio de aceptación de [Términos y condiciones](/terms); checkbox opcional para recibir correos con novedades y ofertas.
- **Términos y condiciones**: `/terms`.
- **Política de privacidad**: `/privacy`.

## Comandos de tests (ejecucion rapida)

Con el servidor corriendo (`npm run dev`), puedes ejecutar:

```bash
npm run test:unit
npm run e2e:all
npm run e2e:all:continue
npm run e2e:checkout
npm run e2e:stripe
npm run e2e:paypal
```

- `test:unit`: ejecuta pruebas unitarias con Vitest.
- `e2e:all`: ejecuta los 3 tests en secuencia.
- `e2e:all:continue`: ejecuta los 3 tests aunque uno falle y muestra resumen final.
- `e2e:checkout`: login + compra manual + verificacion en panel admin.
- `e2e:stripe`: login + creacion de sesion Stripe (devuelve checkout URL).
- `e2e:paypal`: login + creacion de orden PayPal (devuelve checkout URL).

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
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`

## Arranque rapido

```bash
npm install
npm run db:migrate
npm run dev
```

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

## Seguridad de pagos aplicada

- El pedido nace en estado `pending`.
- Se marca `paid` solo tras confirmacion del proveedor (finalize o webhook).
- Se guarda referencia de pago (`paymentReference`) y proveedor (`paymentProvider`).
- El email de confirmacion se envia despues de confirmar pago.
- Webhooks permiten completar pago aunque el cliente cierre la pestaña.

## Despliegue en Netlify

- **Build command:** `npm run build` (incluye `prisma generate`).
- **Variables de entorno:** definir al menos `DATABASE_URL` y las que use la app (sesión, Stripe, PayPal, OAuth, etc.) en el panel de Netlify.

### Base de datos en producción

La app usa SQLite por defecto (`prisma/dev.db`). En Netlify tienes dos opciones:

1. **Incluir la base de datos en el repo (solo para pruebas):** quitar `prisma/dev.db` del `.gitignore`, hacer commit de `dev.db` y en Netlify poner `DATABASE_URL=file:./prisma/dev.db`. En entornos serverless SQLite puede tener limitaciones (escritura/lectura).
2. **Usar una base de datos en la nube (recomendado):** usar un servicio como Supabase, Neon, PlanetScale o Postgres de Netlify, configurar Prisma para ese proveedor y definir `DATABASE_URL` en Netlify con la URL del servicio. Así la web en producción tendrá datos persistentes y correctos.

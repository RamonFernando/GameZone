# TESTING

Guia central de comandos de pruebas y verificacion para `GameZoneV4`.

## Requisitos Previos

- Instalar dependencias: `npm install`
- Generar cliente Prisma: `npm run db:generate`
- Migrar base de datos local si hace falta: `npm run db:migrate`
- Tener `.env` configurado con `DATABASE_URL` (PostgreSQL/Neon), `SESSION_SECRET`, credenciales de pagos/OAuth si se van a probar esos flujos.
- Tener servidor activo para E2E/OAuth/webhooks: `npm run dev`

> Nota: el proyecto usa **PostgreSQL (Neon)**, no SQLite. En local, `DATABASE_URL` apunta al endpoint directo de Neon. Para producción (Netlify) se usa la URL pooled; ver `docs/NETLIFY-DEPLOY.md`.

## Validacion Recomendada

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

- `npm run lint`: ejecuta ESLint sobre el proyecto completo.
- `npx tsc --noEmit`: comprueba TypeScript sin generar archivos.
- `npm run test:unit`: ejecuta unit/integration tests ligeros con Vitest. Estado validado: 10 archivos y 48 tests.
- `npm run build`: genera Prisma Client y compila Next para produccion.

## Suite Completa

```bash
npm run test:all
```

Equivale a:

```bash
npm run test:unit
npm run build
npm run e2e:all
```

Nota: `test:all` necesita servidor y credenciales listas para los E2E de checkout, Stripe y PayPal.

## Unit Tests

```bash
npm run test:unit
npm run test:unit:watch
```

- `test:unit`: corre `vitest run`.
- `test:unit:watch`: abre Vitest en modo watch.
- Configuracion: `vitest.config.ts`.
- Patron actual: `src/**/*.test.ts`.
- Entorno actual: `node`.

### Tests Criticos Por Archivo

Para validar solo los flujos criticos añadidos en la auditoria:

```bash
npx vitest run src/app/api/payments/stripe/webhook/route.test.ts
npx vitest run src/app/api/payments/paypal/webhook/route.test.ts
npx vitest run src/app/api/auth/login-2fa-flow.test.ts
```

- `route.test.ts` de Stripe cubre firma ausente/invalida, evento no manejado, `checkout.session.completed`, `checkout.session.expired` y `checkout.session.async_payment_failed`.
- `route.test.ts` de PayPal cubre JSON invalido, firma invalida, errores logueados, evento no manejado, `CHECKOUT.ORDER.APPROVED` y `PAYMENT.CAPTURE.COMPLETED`.
- `login-2fa-flow.test.ts` cubre credenciales validas -> segundo factor por email -> verificacion correcta -> sesion creada, y codigo incorrecto sin sesion.
- Estos tests son mocks route-level: no sustituyen los E2E reales, pero protegen la logica de integracion de pagos/auth sin depender de Stripe, PayPal ni SMTP reales.

## E2E

```bash
npm run e2e:checkout
npm run e2e:stripe
npm run e2e:paypal
npm run e2e:all
npm run e2e:all:continue
```

- `e2e:checkout`: login, checkout manual y verificacion en `/api/admin/orders`.
- `e2e:stripe`: login y creacion de sesion Stripe; valida que devuelve `checkoutUrl`.
- `e2e:paypal`: login y creacion de orden PayPal; valida que devuelve `checkoutUrl`.
- `e2e:all`: ejecuta checkout, Stripe y PayPal; se detiene al primer fallo.
- `e2e:all:continue`: ejecuta checkout, Stripe y PayPal aunque alguno falle; muestra resumen final.

El checkout manual, Stripe y PayPal envian email de confirmacion cuando el
pedido queda `paid`. Con SMTP real configurado, el correo llega al usuario. Sin
SMTP real, revisar la consola del servidor y abrir la URL `Vista previa email de
compra: https://ethereal.email/message/...`.

## Variables E2E

Defaults:

- `E2E_BASE_URL=http://localhost:3000`
- `E2E_IDENTIFIER=admin` en `e2e:checkout`
- `E2E_IDENTIFIER=admin@local.test` en `e2e:stripe` y `e2e:paypal`
- `E2E_PASSWORD=admin`

Ejemplo PowerShell:

```powershell
$env:E2E_BASE_URL="http://localhost:3000"
$env:E2E_IDENTIFIER="admin@local.test"
$env:E2E_PASSWORD="admin"
npm run e2e:checkout
```

## Pagos

### Stripe E2E

```bash
npm run e2e:stripe
```

Requiere en `.env`:

- `STRIPE_SECRET_KEY`

### Stripe Webhooks

```bash
npm run stripe:webhook:listen
npm run stripe:webhook:test:checkout
npm run stripe:webhook:test:async
```

- `stripe:webhook:listen`: escucha eventos Stripe y los reenvia a `localhost:3000/api/payments/stripe/webhook`.
- `stripe:webhook:test:checkout`: dispara `checkout.session.completed`.
- `stripe:webhook:test:async`: dispara `checkout.session.async_payment_succeeded`.

Requiere Stripe CLI autenticado y `STRIPE_WEBHOOK_SECRET` actualizado con el secreto que entrega `stripe listen`.

### PayPal E2E

```bash
npm run e2e:paypal
```

Requiere en `.env`:

- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV=sandbox` o `PAYPAL_ENV=live`

Con credenciales sandbox configuradas, el script debe crear una orden y devolver una URL `sandbox.paypal.com/checkoutnow?...`. `PAYPAL_WEBHOOK_ID` se configura aparte al probar webhooks.

## OAuth Social

Con `npm run dev` activo, probar los inicios OAuth desde el navegador:

```txt
http://localhost:3000/api/auth/oauth/google/start?next=/account
http://localhost:3000/api/auth/oauth/facebook/start?next=/account
http://localhost:3000/api/auth/oauth/twitter/start?next=/account
```

Variables por proveedor:

- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, opcional `GOOGLE_REDIRECT_URI`
- Facebook: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, opcional `FACEBOOK_CONFIG_ID`, opcional `FACEBOOK_REDIRECT_URI`
- Twitter/X: `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, opcional `TWITTER_REDIRECT_URI`

Callbacks locales esperados:

```txt
http://localhost:3000/api/auth/oauth/google/callback
http://localhost:3000/api/auth/oauth/facebook/callback
http://localhost:3000/api/auth/oauth/twitter/callback
```

Si falla:

- `oauthError=config`: faltan variables o credenciales OAuth.
- `oauthError=state`: limpiar cookies y reintentar.
- `oauthError=provider_failed`: el proveedor rechazo el codigo, no devolvio token o no devolvio email.
- En Facebook, si Meta muestra `Invalid Scopes: email`, revisar el caso de uso de Facebook Login y usar `FACEBOOK_CONFIG_ID` si la app trabaja con configuraciones.

## Build Y Servidor

```bash
npm run dev
npm run dev:reset
npm run build
npm run start
```

- `dev`: inicia Next en desarrollo.
- `dev:reset`: libera puertos 3000/3001, borra `.next` y arranca `dev`.
- `build`: ejecuta `prisma generate` y `next build`.
- `start`: sirve el build de produccion.

Nota Windows: si `npm run build` falla con bloqueo de Prisma (`EPERM` sobre `query_engine-windows.dll.node`), detener el servidor dev y volver a ejecutar.

## Base De Datos

```bash
npm run db:generate
npm run db:migrate
```

- `db:generate`: genera Prisma Client.
- `db:migrate`: aplica/crea migraciones de desarrollo (PostgreSQL).

Nota: si `db:migrate` o `build` muestran `EPERM` sobre `query_engine-windows.dll.node`, parar el `npm run dev` (bloquea el DLL en Windows), repetir el comando y volver a arrancar el dev.

## Catalogos Y Datos Externos

```bash
npm run market:sync:dry
npm run market:sync
npm run market:sync:dry -- --all
npm run market:sync -- --all
npm run enrich:games
npm run enrich:games -- --slug slug-del-juego --dry-run
npm run enrich:games -- --slug slug-del-juego
npm run enrich:games -- --limit 3 --dry-run
npm run enrich:games -- --limit 3
```

- `market:sync:dry`: sincronizacion de catalogos en modo simulacion.
- `market:sync`: sincronizacion de catalogos con escritura en base de datos.
- `--all`: incluye todas las fuentes disponibles del pulso de mercado.
- Para simular mejor el boton admin desde CLI, levantar antes `npm run dev` y ejecutar `npm run market:sync:dry -- --all`.
- El boton admin y el cron piden datos frescos a G2A, Steam y RAWG; los scripts consumen `GET /api/market/pulse`, que puede conservar cache del dashboard.
- `enrich:games`: enriquece datos de juegos desde RAWG.
- `enrich:games -- --slug slug-del-juego --dry-run`: prueba el emparejamiento RAWG de un juego sin guardar.
- `enrich:games -- --slug slug-del-juego`: guarda metadata RAWG para un juego concreto.
- `enrich:games -- --limit 3 --dry-run`: prueba los primeros 3 juegos sin guardar.
- `enrich:games -- --limit 3`: guarda metadata RAWG para los primeros 3 juegos.

Variables relacionadas:

- `RAWG_API_KEY` para `enrich:games`.
- `MARKET_PULSE_URL` para apuntar `market:sync:*` a otro endpoint de pulso; default `http://localhost:3000/api/market/pulse`.
- Credenciales o endpoints de mercado configurados en `.env` si el sync los necesita.

## Instalacion Y Hooks NPM

```bash
npm install
npm run postinstall
```

- `npm install`: instala dependencias y ejecuta `postinstall` automaticamente.
- `postinstall`: ejecuta `prisma generate`; normalmente no hace falta llamarlo a mano salvo para reparar el cliente Prisma.

## Carrito: endpoints incrementales

Con el servidor corriendo (`npm run dev`) y sesion iniciada, puedes probar los endpoints directamente:

```bash
# Añadir 1 unidad de un juego al carrito
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -d '{"slug":"nombre-del-juego"}'

# Reducir 1 unidad (elimina el item si llega a 0)
curl -X PATCH http://localhost:3000/api/cart/items/nombre-del-juego

# Eliminar el item completamente
curl -X DELETE http://localhost:3000/api/cart/items/nombre-del-juego
```

Verificacion manual del carrito multi-pestana:

1. Abre la tienda en dos pestanas del mismo navegador.
2. Añade un juego al carrito en la pestana A.
3. La pestana B debe actualizarse automaticamente (via `BroadcastChannel`).

Verificacion del carrito entre dispositivos (solo usuarios autenticados):

1. Inicia sesion en el dispositivo A, añade juegos al carrito.
2. Abre la misma cuenta en el dispositivo B.
3. Al cambiar a la pestana o dar foco a la ventana, el carrito debe sincronizarse desde la BD.

## Avatar de usuario (almacenado en BD)

El avatar se guarda como bytes en PostgreSQL (tabla `UserAvatar`) y se sirve desde
`GET /api/account/avatar/[userId]`. La subida valida tamaño (2 MB), magic bytes
reales y redimensiona a 256x256 WebP con `sharp`.

Verificacion manual (con sesion iniciada, en `/account`):

1. Sube una imagen JPEG/PNG/WebP: debe aparecer el nuevo avatar al instante.
2. Recarga la pagina: el avatar persiste (se lee de la BD, no del filesystem).
3. Sube un archivo que no sea imagen (p. ej. un `.txt` renombrado a `.png`): debe
   rechazarse con error `INVALID_TYPE` (se validan los magic bytes, no la extension).
4. Sube una imagen mayor de 2 MB: debe rechazarse con `FILE_TOO_LARGE`.

## Boton flotante Scroll to Top

Verificacion manual:

1. Abre cualquier pagina con contenido largo (home, `/games`).
2. Desplazate mas de 400 px hacia abajo: debe aparecer el boton indigo circular en la esquina inferior derecha.
3. Haz clic: la pagina debe volver al inicio con scroll suave.
4. En movil (< 768px): el boton debe ser ligeramente mas pequeno y pegado a la esquina.

## Checklist Antes De Push

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Para cambios de checkout/pagos:

```bash
npm run e2e:checkout
npm run e2e:stripe
npm run e2e:paypal
```

Para cambios de OAuth:

```txt
Probar manualmente /auth y los endpoints /api/auth/oauth/{provider}/start.
Confirmar que el callback crea sesion y redirige a /account o al next indicado.
```

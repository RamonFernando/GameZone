# TESTING

Guia central de comandos de testing para `GameZoneV3`.

## Requisitos previos

- Tener dependencias instaladas: `npm install`
- Tener base de datos migrada: `npm run db:migrate`
- Tener servidor activo para pruebas E2E/OAuth: `npm run dev`

## Comandos principales

```bash
npm run test:all
npm run test:unit
npm run test:unit:watch
npm run e2e:all
npm run e2e:all:continue
```

- `test:all`: ejecuta unit tests, compila proyecto y luego corre suite E2E completa.
- `test:unit`: ejecuta solo pruebas unitarias con Vitest.
- `test:unit:watch`: modo watch para desarrollo de unit tests.
- `e2e:all`: ejecuta `e2e:checkout`, `e2e:stripe`, `e2e:paypal` (stop on fail).
- `e2e:all:continue`: ejecuta toda la suite aunque falle un test y muestra resumen final.

## Comandos E2E individuales

```bash
npm run e2e:checkout
npm run e2e:stripe
npm run e2e:paypal
```

- `e2e:checkout`: login + checkout manual + verificacion en `/api/admin/orders`.
- `e2e:stripe`: login + creacion de sesion Stripe (retorna `checkoutUrl`).
- `e2e:paypal`: login + creacion de orden PayPal (retorna `checkoutUrl`).

## Variables para scripts E2E

Defaults:

- `E2E_BASE_URL=http://localhost:3000`
- `E2E_IDENTIFIER=admin@local.test`
- `E2E_PASSWORD=admin`

Ejemplo en PowerShell:

```bash
$env:E2E_BASE_URL="http://localhost:3001"; $env:E2E_IDENTIFIER="admin@local.test"; $env:E2E_PASSWORD="admin"; npm run e2e:checkout
```

## Testing de webhooks Stripe

```bash
npm run stripe:webhook:listen
npm run stripe:webhook:test:checkout
npm run stripe:webhook:test:async
```

- `stripe:webhook:listen`: reenvia eventos de Stripe a `localhost`.
- `stripe:webhook:test:checkout`: dispara evento de checkout completado.
- `stripe:webhook:test:async`: dispara evento de pago asincrono confirmado.

## Testing rapido de OAuth social

Con `npm run dev` activo:

- `http://localhost:3000/api/auth/oauth/google/start?next=/account`
- `http://localhost:3000/api/auth/oauth/facebook/start?next=/account`
- `http://localhost:3000/api/auth/oauth/twitter/start?next=/account`

Si falla:

- revisa variables de entorno OAuth
- revisa callback URL exacta en cada proveedor
- si aparece `oauthError=state`, limpia cookies y reintenta

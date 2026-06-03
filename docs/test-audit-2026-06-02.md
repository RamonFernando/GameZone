# Auditoria local de pruebas - 2026-06-02

## Resumen

La app base esta sana, pero no todo queda cerrado al 100%.

## Comprobaciones OK

- `npm run test:unit`: OK, 3 archivos y 9 tests pasan.
- `npx tsc --noEmit`: OK, sin errores TypeScript.
- `npx prisma migrate status`: OK, 15 migraciones y base SQLite al dia.
- `npm run build`: OK despues de parar un servidor Node que bloqueaba Prisma.
- Home local: OK, `http://localhost:3000` responde `200`.
- `npm run e2e:checkout`: OK, login + compra manual + verificacion admin.
- `npm run e2e:stripe`: OK, crea sesion real de Stripe test checkout.

## Problemas encontrados

- `npm run lint` falla porque `next lint` no funciona correctamente con Next `16.2.7`; interpreta `lint` como directorio.
- `npm run e2e:paypal` falla porque faltan `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` en `.env`.
- Webhook Stripe no se pudo probar porque Stripe CLI tiene una API key local caducada (`401 api_key_expired`).
- OAuth parcial: Google esta configurado, pero Facebook y Twitter/X tienen `client id` y `secret` vacios.

## Estado final

- La app quedo levantada en `http://localhost:3000`.
- El servidor local estaba escuchando en el puerto `3000`.

## Pendientes para dejarlo 100% listo

- Corregir el script de lint. Hecho: ahora usa `eslint .` con config flat.
- Configurar credenciales PayPal sandbox.
- Renovar Stripe CLI con `stripe login` o una API key valida.
- Probar webhooks Stripe con `stripe listen` y `stripe trigger`.
- Completar credenciales Facebook y Twitter/X si se van a usar.

## Correccion aplicada antes de continuar

- Corregido el overlay de Next por `src=""` en el hero.
- Causa: `src/components/Hero.tsx` inicializaba la imagen de fondo grande como cadena vacia antes de rellenarla con `useEffect`.
- Solucion: inicializar `heroBgSrc` con la imagen preferida y usar `active.image` como fallback.
- Validado con `npm run test:unit`, `npx tsc --noEmit`, `npm run build` y home local `200`.

## Mejora aplicada al carrito

- Los juegos dentro del carrito ahora son clicables y abren `/games/{slug}`.
- Los controles de cantidad y quitar producto siguen funcionando sin abrir la ficha del juego.
- Se anadio estado visual `hover/focus` y soporte por teclado con `Enter` o `Espacio`.
- Validado con `npm run test:unit`, `npx tsc --noEmit`, `npm run build` y home local `200`.

## Mejora aplicada al carrusel

- El titulo del juego activo en el carrusel ahora es clicable y abre `/games/{slug}`.
- Se mantiene el estilo visual del titulo y se anadio hover/focus accesible.
- Se quito el subrayado del titulo y se sustituyo por un efecto tipo boton con brillo, sombra y escala.
- Validado con `npm run test:unit`, `npx tsc --noEmit`, `npm run build` y home local `200`.

## Avance aplicado a market intelligence

- Creada `/api/market/deals` como primera ruta interna de datos externos.
- La ruta consulta CheapShark, normaliza ofertas y cruza cada resultado con productos activos del catalogo.
- Si CheapShark falla o no devuelve coincidencias, responde con fallback de GameZone para no romper la experiencia.
- `MarketIntelligenceSections` cambio sus imagenes internas a `next/image`.
- `MarketIntelligenceSections` ya consume `/api/market/deals` y mantiene fallback local si la API no responde.
- Creada `/api/market/games` y `/api/market/games/:slug` para metadata con RAWG y fallback GameZone.
- Creada `/api/market/trending` y conectada en `MarketIntelligenceSections` con fallback GameZone.
- Unificado el cruce con catalogo GameZone en `src/lib/market/catalog-match.ts`.
- Estandarizado `meta.externalSource`, `meta.fallbackUsed` y `meta.cachedForSeconds` en rutas market.
- Creada `/api/recommendations` con score, motivo, senales de precio/tendencia y accion siguiente.
- Conectada `/api/recommendations` a `MarketIntelligenceSections`.
- Creada `/api/market/pulse` para separar G2A, Steam y RAWG en paneles de mercado.
- `MarketIntelligenceSections` ya muestra G2A populares, G2A mas vendidos, Steam top sellers, Steam mas jugados y RAWG radar con cruce de catalogo.
- Validado con `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` y `npm run build`.

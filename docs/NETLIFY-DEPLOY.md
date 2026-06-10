# Despliegue en Netlify — checklist de variables de entorno

> Documento de referencia para el día del deploy. **No contiene secretos reales**
> (se copian del dashboard de cada proveedor o del `.env` local). Subir secretos a
> un archivo del repo reintroduciría la fuga que se corrigió en la tarea 0.1 del
> plan de auditoría.

## Base de datos (Neon PostgreSQL) — ⚠️ lo más importante

Neon ofrece dos endpoints para el mismo proyecto. La diferencia es el `-pooler` en
el host (el resto, incluido `.c-4.`, es idéntico):

| Variable | Endpoint | Para qué |
|---|---|---|
| `DATABASE_URL` | **POOLED** (`...-pooler.c-4...`) | La app en runtime (serverless). Usa el pooler de Neon para no agotar conexiones. |
| `DATABASE_URL_UNPOOLED` | **DIRECTA** (`...as1c9j6l.c-4...`, sin `-pooler`) | Solo `prisma migrate` durante el build/deploy. |

Forma de las URLs (copiar la contraseña real del dashboard de Neon → Connection string):

```env
# POOLED — toggle "Connection pooling" ON en el dashboard de Neon
DATABASE_URL=postgresql://neondb_owner:<PASSWORD>@ep-sweet-sunset-as1c9j6l-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# DIRECTA — toggle "Connection pooling" OFF
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:<PASSWORD>@ep-sweet-sunset-as1c9j6l.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

> ✅ Ambos endpoints probados y funcionando (2026-06-10). La pooled conecta y lee el
> catálogo correctamente.
>
> ⚠️ **Nota local vs producción:** en el `.env` LOCAL, `DATABASE_URL` apunta a la
> directa (funciona bien en dev). En **Netlify** debe ser la POOLED. No copies el
> `.env` local tal cual: cambia `DATABASE_URL` por la pooled.

## Resto de variables a definir en Netlify

Copiar los valores reales del `.env` local o del dashboard de cada proveedor:

```env
# Núcleo
APP_BASE_URL=https://<tu-dominio-netlify>
SESSION_SECRET=<rotar: secreto largo y aleatorio, distinto al de dev>
CRON_SECRET=<rotar: secreto largo y aleatorio>
# Clave para cifrar secretos TOTP (32 bytes base64). Generar con:
# node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
# ⚠️ NO cambiarla una vez en producción: invalidaría los secretos TOTP ya cifrados.
ENCRYPTION_KEY=<32 bytes en base64>

# Pagos
STRIPE_SECRET_KEY=<dashboard Stripe>
STRIPE_WEBHOOK_SECRET=<endpoint webhook de producción en Stripe>
PAYPAL_CLIENT_ID=<dashboard PayPal>
PAYPAL_CLIENT_SECRET=<dashboard PayPal>
PAYPAL_ENV=live            # o sandbox según el entorno
PAYPAL_WEBHOOK_ID=<webhook de producción en PayPal>

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
MAIL_BRAND_NAME=GameZone Store
MAIL_SUPPORT_EMAIL=
MAIL_LOGO_URL=

# OAuth social (recordar registrar las redirect URI con el dominio de Netlify)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Datos externos / market
RAWG_API_KEY=
G2A_API_BASE_URL=https://sandboxapi.g2a.com
G2A_API_HASH=
G2A_API_KEY=
```

## Checklist del día del deploy

1. [ ] `DATABASE_URL` = URL **pooled** (con `-pooler`).
2. [ ] `DATABASE_URL_UNPOOLED` = URL **directa** (sin `-pooler`).
3. [ ] **Rotar** `SESSION_SECRET` y `CRON_SECRET` (no reutilizar los de dev — tarea 0.1).
4. [ ] `APP_BASE_URL` = dominio real de Netlify.
5. [ ] Registrar las redirect URI de OAuth (Google/Facebook/Twitter) con el dominio de Netlify.
6. [ ] Crear los webhooks de producción de Stripe y PayPal apuntando al dominio de Netlify.
7. [ ] Build command (`npm run build`, ya incluye `prisma generate`) y plugin `@netlify/plugin-nextjs` ya están en `netlify.toml`.
8. [ ] Tras el primer deploy, comprobar que `instrumentation.ts` (`ensureMasterAdminUser`) funcionó o crear el admin de otra forma (ver tarea 1.4 del plan de auditoría).

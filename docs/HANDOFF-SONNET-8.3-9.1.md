# Handoff para Sonnet — tareas 8.3 y 9.1 (auditoría v2)

> Contexto apilado autocontenido. Sonnet puede ejecutar esto en frío sin más
> contexto. Proyecto: GameZone (GameStopV4), Next.js 16 App Router + React 19 +
> Prisma/PostgreSQL, deploy en Netlify. Reglas: mínimo cambio, no romper auth/
> carrito/pagos, `npx tsc --noEmit` + `npx vitest run` + `npx next build` verdes
> antes de commit. Rama backup antes de empezar: `git checkout -b backup-pre-83-91-DDMMYYYY`.

## Estado relevante del proyecto (verificado 11/06/2026)

- La home `src/app/page.tsx` YA es server component (async). Su contenido actual:
  ```tsx
  import { HomeClient } from "./HomeClient";
  import { getCachedCatalog, getCachedHeroSections } from "@/lib/home-data";

  export const dynamic = "force-dynamic";

  export default async function HomePage() {
    const [products, heroSections] = await Promise.all([
      getCachedCatalog(),
      getCachedHeroSections(),
    ]);
    return <HomeClient initialProducts={products} initialHeroSections={heroSections} />;
  }
  ```
- `baseUrl` se define en `src/app/layout.tsx:9`:
  `const baseUrl = process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app";`
  El layout ya tiene `metadataBase`, OpenGraph, Twitter y `siteName: "GameZone"`.
- La home soporta búsqueda por querystring `?q=` (lo lee `HomeClient.tsx` con
  `params.get("q")` y hace scroll a `#game-results`). Esto importa para 8.3.
- Solo existe `src/app/global-error.tsx`. NO hay `error.tsx` ni `loading.tsx` por ruta.
- SEO global actual: Lighthouse SEO 100, Rendimiento 98 (móvil). No degradar.

---

## TAREA 8.3 — JSON-LD WebSite + Organization en la home  🟡 BAJO RIESGO

**Objetivo:** habilitar en Google (a) la caja de búsqueda de sitio (sitelinks
searchbox) y (b) el panel de marca Organization con logo.

**Acción:**
1. En `src/app/page.tsx` (server component), construir dos objetos JSON-LD y
   serializarlos con `JSON.stringify`. NO usar hooks ni "use client" — es server.
2. Inyectar un `<script type="application/ld+json">` por cada schema usando
   `dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}`. Es el patrón
   estándar y seguro para JSON-LD en Next App Router (el contenido es propio, no
   input de usuario, así que `dangerouslySetInnerHTML` aquí es correcto).
3. Schemas exactos a usar (derivar `baseUrl` igual que el layout: leer
   `process.env.APP_BASE_URL ?? "https://gamezone-digital-store.netlify.app"`;
   considera extraerlo a un helper `src/lib/site.ts` si quieres evitar duplicar,
   pero duplicar la constante también es aceptable por mínimo cambio):

   ```ts
   const websiteSchema = {
     "@context": "https://schema.org",
     "@type": "WebSite",
     name: "GameZone",
     url: baseUrl,
     potentialAction: {
       "@type": "SearchAction",
       target: {
         "@type": "EntryPoint",
         urlTemplate: `${baseUrl}/?q={search_term_string}`,
       },
       "query-input": "required name=search_term_string",
     },
   };

   const organizationSchema = {
     "@context": "https://schema.org",
     "@type": "Organization",
     name: "GameZone",
     url: baseUrl,
     logo: `${baseUrl}/Recursos/logo.png`,
   };
   ```
   (El logo `/Recursos/logo.png` es el que ya usa el OpenGraph del layout — verificar
   que la ruta existe en `public/`. Si no, usar `/icon.svg` que sí existe.)

4. Render: envolver el return actual en un fragment y añadir los dos scripts antes
   de `<HomeClient ...>`:
   ```tsx
   return (
     <>
       <script
         type="application/ld+json"
         dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
       />
       <script
         type="application/ld+json"
         dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
       />
       <HomeClient initialProducts={products} initialHeroSections={heroSections} />
     </>
   );
   ```

**Verificar:**
- `npx tsc --noEmit` limpio.
- `npx next build` compila (si `prisma generate` falla por EPERM de Dropbox en
  Windows, correr `npx next build` directo — el cliente Prisma ya está generado).
- `view-source:` de la home muestra los dos bloques `application/ld+json`.
- Tras deploy: pegar la URL en https://search.google.com/test/rich-results y
  confirmar que detecta WebSite y Organization sin errores.

---

## TAREA 9.1 — Estados de error y carga por ruta  🟡 BAJO RIESGO

**Objetivo:** que un error en una ruta no tumbe toda la app, y dar feedback de carga.

**Acción:**
1. Crear `src/app/error.tsx` (client component, lo exige Next):
   ```tsx
   "use client";

   export default function Error({
     error,
     reset,
   }: {
     error: Error & { digest?: string };
     reset: () => void;
   }) {
     return (
       <main className="error-boundary">
         <h1>Algo ha fallado</h1>
         <p>No hemos podido cargar esta página. Inténtalo de nuevo.</p>
         <button type="button" className="button-primary" onClick={() => reset()}>
           Reintentar
         </button>
       </main>
     );
   }
   ```
   Estilar `.error-boundary` en `src/styles/globals.scss` acorde al tema oscuro
   (fondo del sitio, texto claro, centrado). Mirar variables/clases existentes
   como `.button-primary` (ya existe) para coherencia.

2. Crear `src/app/loading.tsx` (skeleton del grid de la home):
   - Renderizar 8-12 tarjetas grises con animación `pulse`.
   - Reutilizar las dimensiones reales de `.game-card` / `.game-card-media` de
     `globals.scss` para evitar salto de layout (CLS). Mirar `GameCard.tsx` y sus
     clases para clonar el tamaño.
   - Clase nueva `.game-card-skeleton` con `@media (prefers-reduced-motion: no-preference)`
     para la animación.

3. NO tocar `global-error.tsx` (sigue cubriendo errores del root layout).

**Verificar:**
- `npx tsc --noEmit` limpio, `npx next build` compila.
- Forzar un `throw new Error("test")` temporal en una página → aparece la pantalla
  de error con botón Reintentar (quitar el throw después).
- Con DevTools → red Slow 3G, al navegar se ve el skeleton, no pantalla en blanco.

---

## Orden sugerido y commits

- Hacer 8.3 primero (más valor SEO, más simple). Commit:
  `feat: tarea 8.3 json-ld website y organization en home para sitelinks search DDMMYYYY`
- Luego 9.1. Commit:
  `feat: tarea 9.1 estados error y loading por ruta DDMMYYYY`
- Cada commit termina con la línea de co-autoría que use el proyecto.
- Marcar ambas tareas como ✅ en `docs/PLAN-MEJORAS-AUDITORIA.md` (secciones 8.3 y 9.1).
- Preguntar a Ramón antes de `git push` (su preferencia: confirmar push a main,
  porque main despliega a Netlify).

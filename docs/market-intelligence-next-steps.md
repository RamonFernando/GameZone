# GameZone - Datos externos y siguientes pasos

Fecha: 2026-06-03

## Estado actual

Se empezaron a preparar nuevas secciones para que GameZone no sea solo un catalogo interno, sino una tienda capaz de apoyarse en datos externos:

- Datos externos para GameZone.
- Juegos populares / tendencias.
- Precios y ofertas.
- Metadata de juegos.
- Recomendaciones futuras.

La idea es que las secciones esten preparadas para conectar APIs reales, no solo para mostrar una maqueta visual.

## Decision tomada

Primero se preparan bien las secciones y el modelo visual.

Despues se conectan APIs externas mediante rutas internas de Next.js. No se llamaran APIs externas directamente desde los componentes del frontend.

## Rutas internas previstas

- `/api/market/deals`
- `/api/market/trending`
- `/api/market/games`
- `/api/market/games/:slug`
- `/api/recommendations`

## APIs / tecnologias candidatas

### CheapShark

Uso principal:

- Precios externos.
- Ofertas.
- Tiendas.
- Descuentos.
- Mejor precio detectado.

Primera API que se conectara.

### RAWG

Uso principal:

- Imagenes.
- Generos.
- Plataformas.
- Ratings.
- Tags.
- Fechas de lanzamiento.

Buena para enriquecer cards y detalles de juegos.

### IGDB

Uso principal:

- Metadata avanzada.
- Informacion estructurada de videojuegos.
- Datos mas completos para recomendaciones.

Puede ser una alternativa o complemento a RAWG.

### Steam

Uso principal:

- Senales de popularidad.
- Tendencias.
- Mas vendidos / mas jugados si se encuentra una fuente estable.

Hay que revisar bien porque Steam no expone siempre un endpoint limpio para "populares" como tal.

## Modelo de datos que necesitaremos

Para precios/ofertas:

- `title`
- `image`
- `store`
- `dealPrice`
- `normalPrice`
- `gameZonePrice`
- `saving`
- `sourceId`
- `sourceUrl`

Para tendencias:

- `rank`
- `title`
- `image`
- `platform`
- `signal`
- `source`
- `trendScore`
- `gameZoneMatch`

Para metadata:

- `title`
- `slug`
- `cover`
- `genres`
- `platforms`
- `released`
- `rating`
- `tags`

Para recomendaciones:

- `score`
- `reason`
- `catalogMatch`
- `priceSignal`
- `trendScore`
- `nextAction`

## Pasos acordados

1. Dejar las secciones bien preparadas. Hecho.
2. Definir el modelo de datos definitivo.
3. Crear rutas internas de API. Iniciado con `/api/market/deals`, `/api/market/trending`, `/api/market/games` y `/api/market/games/:slug`.
4. Conectar primero `/api/market/deals` con CheapShark. Hecho con fallback al catalogo.
5. Sustituir los mocks de precios por datos reales. Hecho con fallback local.
6. Conectar metadata con RAWG o IGDB. Hecho con RAWG y fallback GameZone.
7. Conectar tendencias con Steam, RAWG, IGDB o una combinacion. Hecho con RAWG y fallback GameZone.
8. Cruzar los datos externos con el catalogo de GameZone. Hecho con helper comun `catalog-match`.
9. Anadir fallback y cache para que la web no dependa totalmente de APIs externas. Hecho con `meta` comun.
10. Preparar recomendaciones con datos de precio, popularidad y catalogo.
11. Pulir UI, responsive, estados de carga y rendimiento.

## Avance aplicado - 2026-06-03

- Creada la ruta interna `/api/market/deals`.
- La ruta cruza productos activos de GameZone con ofertas de CheapShark por titulo.
- Se normaliza la respuesta a `title`, `image`, `store`, `dealPrice`, `normalPrice`, `gameZonePrice`, `saving`, `sourceId`, `sourceUrl` y `catalogMatch`.
- Se anadio fallback de catalogo para que la API siga respondiendo aunque CheapShark falle o no encuentre coincidencias.
- Se anadio cache de fetch de 30 minutos para CheapShark.
- `MarketIntelligenceSections` ya consume esta API y reemplaza `dealPreviews` por datos reales con fallback local.
- Creada `/api/market/games` para resumenes de metadata del catalogo.
- Creada `/api/market/games/:slug` para metadata enriquecida con RAWG y fallback GameZone.
- La ruta de metadata normaliza `title`, `slug`, `cover`, `genres`, `platforms`, `released`, `rating`, `tags`, `stores`, `developer`, `publisher` y senales de fuente.
- Creada `/api/market/trending` para tendencias con RAWG y fallback GameZone.
- `MarketIntelligenceSections` ya consume `/api/market/trending` y reemplaza los mocks de tendencias.
- Creado `src/lib/market/catalog-match.ts` para unificar el cruce entre datos externos y productos GameZone.
- `deals`, `metadata` y `trending` devuelven `catalogMatch` con `matched`, `matchScore`, `slug`, `productId`, `priceSignal`, `trendSignal` y `metadataSignal`.
- Creado `src/lib/market/response.ts` para estandarizar `meta.externalSource`, `meta.fallbackUsed` y `meta.cachedForSeconds`.
- Las rutas de market declaran cache y fallback de forma consistente.

## Pendiente tecnico antes de seguir

Revisar rendimiento del servidor de desarrollo:

- `.next/dev/logs/next-development.log` tenia errores repetidos del import anterior de `MarketIntelligenceSections`.
- `node_modules/.prisma/client` tenia archivos temporales `query_engine-windows.dll.node.tmp...`.
- `npm run build` fallo con `EPERM` al renombrar el DLL de Prisma. Resuelto parando el proceso que ocupaba `localhost:3000` antes del build.

Recomendacion para retomar:

1. Parar el servidor de desarrollo. Hecho para liberar Prisma.
2. Ejecutar `npm run build`. Hecho correctamente.
3. Comprobar `http://localhost:3000`.
4. Verificar que las secciones cargan sin error.
5. Conectar `MarketIntelligenceSections` a `/api/market/deals`. Hecho.

## Despues de esto

Cuando terminemos las secciones, APIs y la integracion inicial de datos externos, volveremos a lo pendiente de la auditoria del proyecto.

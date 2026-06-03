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

1. Dejar las secciones bien preparadas.
2. Definir el modelo de datos definitivo.
3. Crear rutas internas de API.
4. Conectar primero `/api/market/deals` con CheapShark.
5. Sustituir los mocks de precios por datos reales.
6. Conectar metadata con RAWG o IGDB.
7. Conectar tendencias con Steam, RAWG, IGDB o una combinacion.
8. Cruzar los datos externos con el catalogo de GameZone.
9. Anadir fallback y cache para que la web no dependa totalmente de APIs externas.
10. Preparar recomendaciones con datos de precio, popularidad y catalogo.
11. Pulir UI, responsive, estados de carga y rendimiento.

## Pendiente tecnico antes de seguir

Revisar rendimiento del servidor de desarrollo:

- `.next/dev/logs/next-development.log` tenia errores repetidos del import anterior de `MarketIntelligenceSections`.
- `node_modules/.prisma/client` tenia archivos temporales `query_engine-windows.dll.node.tmp...`.
- `npm run build` fallo con `EPERM` al renombrar el DLL de Prisma.

Recomendacion para retomar:

1. Parar el servidor de desarrollo.
2. Ejecutar `npm run dev:reset`.
3. Comprobar `http://localhost:3000`.
4. Verificar que las secciones cargan sin error.
5. Despues empezar con `/api/market/deals`.

## Despues de esto

Cuando terminemos las secciones, APIs y la integracion inicial de datos externos, volveremos a lo pendiente de la auditoria del proyecto.


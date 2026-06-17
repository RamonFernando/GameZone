# REGLAS-IA.md — GameZoneV4

> Fuente de verdad para el trabajo paralelo Claude + GPT.
> Versión inicial: 17/06/2026

---

## Sistema activo: 3.1 APD

Ver memoria Claude: `sistema-3-1-apd`. Resumen operativo:

| Prioridad | Regla |
|-----------|-------|
| 1 | No romper lo existente (auth · carrito · pagos) |
| 2 | No inventar estructura — trabajar solo con lo visible |
| 3 | Mínimo cambio viable |
| 4 | Verificar antes de afirmar |
| 5 | Código completo solo si se pide |

Cabecera de respuesta: `[3.1 · U4 · mínimo cambio]`

---

## Jerarquía de IAs

```
Ramón (director)
  └── Modelo superior / auditor (Fable 5 / Opus 4.8 en sesión escritorio)
        ├── Claude VS Code  — tareas C (implementador)
        └── GPT             — tareas G (implementador)
```

El auditor actúa cuando:
- Ramón pide auditoría desde `SOLICITUDES DE AUDITORÍA` en el plan
- Hay un `⚠️ CONFLICTO:` entre implementadores

---

## Ramas diarias

```
main                    ← producción
dev-DDMMYYYY            ← rama del día (merge al final)
dev-DDMMYYYY-claude     ← sub-rama Claude
dev-DDMMYYYY-gpt        ← sub-rama GPT
```

Flujo: cada IA trabaja en su sub-rama → merge en `dev-DDMMYYYY` → Ramón revisa → merge a `main`.

---

## Definition of Done (7 puntos)

Antes de marcar una tarea como ✅:

- [ ] `npx tsc --noEmit` sin errores
- [ ] `npx vitest run` verde
- [ ] `npm run build` sin errores
- [ ] Commit limpio con mensaje `tipo: descripción DDMMYYYY`
- [ ] Entrada en `HISTORIAL-TRABAJO.md`
- [ ] No se rompió ningún flujo crítico (auth · carrito · pagos)
- [ ] Probado localmente si es UI

---

## Formato de commit

```
tipo: descripción en minúsculas sin punto DDMMYYYY
```

Tipos: `feat` · `fix` · `docs` · `refactor` · `test` · `chore`

Ejemplo: `refactor: mvc reorganización components y services 17062026`

---

## Prohibido sin confirmación de Ramón

- Borrar migraciones de Prisma
- Borrar datos de BD o volúmenes Docker
- Push a `main` directamente
- Commitear `.env`, `prisma/dev.db*` o backups
- Refactorizar más allá del scope de la tarea
- Cambiar comportamiento sin avisar

---

## Arquitectura MVC (aplicada 17/06/2026)

Ver `CLAUDE.md` para el mapa completo de carpetas.

```
Controller → app/api/**/route.ts
View       → components/layout/ · ui/ · features/ · auth/
Service    → services/auth/ · cart/ · checkout/ · market/ · payments/
Infra      → lib/ (prisma, logger, env, utils, data-access)
```

---

## SOLICITUDES DE AUDITORÍA

_(Añadir aquí cuando Ramón pida revisión senior)_

---

## FUTURAS MEJORAS

Ver `docs/PLAN-MEJORAS-AUDITORIA.md` para el backlog completo.

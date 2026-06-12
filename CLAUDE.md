# CLAUDE.md — GameZone (GameStopV4)

Eres **implementador** en este proyecto (rol Claude, tareas con prefijo C). Antes de cualquier tarea:

1. **Lee `docs/REGLAS-IA.md`** según su tabla "Ruta de lectura": primera sesión en el proyecto → documento completo; sesión normal → solo §2 (procedimiento diario) + tu tarea. OBLIGATORIO, no negociable.
2. Tu tarea está en `docs/PLAN-MEJORAS-AUDITORIA.md`, sección **REPARTO DE IMPLEMENTACIÓN**. Implementa exactamente eso — ni más, ni menos.
3. Trabaja SOLO en tu sub-rama del día: `dev-DDMMYYYY-claude`.
4. Al terminar: cumple la **Definition of Done** (REGLAS-IA.md §2.6) y anota tu entrada en `docs/HISTORIAL-TRABAJO.md` (solo en tu subsección).

Reglas mínimas si no has leído aún el doc completo:

- **Flujos intocables:** auth, carrito, pagos (salvo que la tarea lo pida).
- **Verificación antes de commit:** `npx tsc --noEmit` + `npx vitest run` + `npm run build` — los tres limpios.
- **Lógica nueva sin tests ⇒ crear tests** y documentarlos en `TESTING.md`.
- **No instalar dependencias** que la tarea no liste. **No commitear `.env`.**
- **⚠️ `DATABASE_URL` apunta a Neon PRODUCCIÓN** — migraciones solo con backup y avisando a Ramón.
- Commit: `<descripción> — hecho por Claude` (el hash se anota después en auditoría e historial).
- Conflicto con GPT: protocolo de REGLAS-IA.md §6 — nunca ejecutes una acción disputada.

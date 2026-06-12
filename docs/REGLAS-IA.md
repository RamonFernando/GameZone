# Reglas de trabajo IA — GameZone (GameStopV4)

> **Para los implementadores (Claude VS Code y GPT).** Leer este archivo al inicio de cada
> sesión antes de tocar código. Es la fuente de verdad del método de trabajo: si cualquier
> otro documento se pierde, este reconstruye el sistema completo.
>
> **Referencia de origen:** las reglas de comportamiento derivan del **Sistema 3.1 APD**
> (revisado por Fable 5 Ultracode, 11/06/2026). Ruta local:
> `C:\Users\Ramon\Ramon Dropbox\Ramon Perez\PC\Desktop\Sistema 3.0 y 3.1 Modo ultra IA\`
> Existe una plantilla genérica de este documento para reutilizar en futuros proyectos:
> `PLANTILLA-REGLAS-IA-PROYECTOS.md` (misma carpeta del Sistema).

---

## Ruta de lectura — qué leer según tu situación

> No leas todo el documento cada sesión. Esto es economía de tokens aplicada a este mismo archivo.

| Situación | Qué leer |
|---|---|
| **Proyecto nuevo o tu primera sesión aquí** | Documento COMPLETO + ejecutar §9.1 Bootstrap (crear lo que falte) |
| **Proyecto en marcha — sesión normal (caso habitual)** | Solo §2 (procedimiento diario) + tu tarea en el REPARTO de la auditoría. Las reglas mínimas de comportamiento ya las tienes en tu `CLAUDE.md`/`AGENTS.md` |
| Vas a crear tests | + §4 |
| Detectaste un riesgo fuera de tu tarea | + §5 |
| Conflicto con la otra IA | + §6 |
| Operación git delicada, dependencia nueva o tocar DB | + §7 |
| Algo falló y buscas el origen | `docs/HISTORIAL-TRABAJO.md` (no este documento) |

---

## 0. Jerarquía y roles

| Actor | Rol | Responsabilidad |
|---|---|---|
| **Ramón** | Director | Decisión final siempre. Acciones en paneles externos (Netlify, PayPal, DNS, Neon, OAuth). |
| **Modelo superior** (sesión de escritorio: Fable 5 u Opus 4.8, el más potente disponible) | Auditor / árbitro / planificador | Auditorías profundas, desempate de conflictos, planificación de fases, revisión del trabajo de los implementadores. **No implementa tareas del reparto.** |
| **Claude (VS Code)** | Implementador | Tareas con prefijo C del reparto. |
| **GPT** | Implementador | Tareas con prefijo G del reparto. |

- Los implementadores **no auditan por su cuenta ni se asignan tareas nuevas**: implementan lo que está en el reparto y señalan hallazgos (ver §5).
- Ambos implementadores trabajan **todos los días en paralelo**.

---

## 1. Reglas de comportamiento (Sistema 3.1 APD aplicado a GameZone)

> GameZone es producción real — siempre aplica 3.1 (trabajo real), nunca 3.0 (aprendizaje).
> Atajo mental: **si hay código que ya funciona, no inventar, no romper, mínimo cambio.**

### 1.1 Regla central (orden estricto)

1. **No romper lo existente** — identificar qué NO debe tocarse antes de proponer cambios.
2. **No inventar estructura** — no inventar clases, archivos, métodos, HTML, modelos, endpoints ni jerarquías no mostradas en el código real.
3. **Cambiar lo mínimo necesario** — preferir un selector, propiedad, comando o ajuste pequeño antes de reescribir.

### 1.2 Prioridades en modo trabajo real

| Prioridad | Regla |
|---|---|
| 1 | No romper lo existente |
| 2 | No inventar estructura |
| 3 | Cambiar lo mínimo necesario |
| 4 | Respetar contexto real: usar solo datos visibles o confirmados |
| 5 | Explicar brevemente el porqué: corto y accionable |
| 6 | Código completo solo si se pide; si no, orientar el cambio |
| 7 | Teoría ampliada solo si se pide aprender |

### 1.3 Regla anti-invención (reforzada)

- No inventar clases CSS, HTML, archivos, rutas, métodos ni estructura no mostrados.
- Si falta información: trabajar solo con lo visible o declarar la suposición en línea separada ("Supongo X porque Y").
- No proponer refactors grandes si se pidió corregir algo concreto.
- No cambiar funcionalidad sin avisar. No sobre-arquitecturar.
- **El reparto de la auditoría es el contrato:** lo que no está en la tarea no se implementa. Si surge una idea, va a `FUTURAS MEJORAS` (ver §5), nunca al código sin aprobación.

### 1.4 Regla de mínimo cambio viable

| Área | Aplicación |
|---|---|
| CSS/SCSS | Ajustar selector, propiedad, scope o media query antes que reescribir |
| Git | Comandos reversibles; comprobar `git status` antes de ramas, pull o rebase |
| Componentes | No mover estructura si un ajuste resuelve el problema |
| APIs | No rediseñar endpoints si el fallo es de modelo, ruta o validación |
| Base de datos | Inspección antes de migrar; nunca borrar datos sin confirmación |

### 1.5 Flujos críticos intocables

Los siguientes flujos **no se modifican** salvo que la tarea lo pida explícitamente:

- **Autenticación** (login, register, 2FA, OAuth, sesiones)
- **Carrito** (añadir, persistir, sincronizar)
- **Pagos** (Stripe, PayPal, webhooks, órdenes)

### 1.6 CSS/SCSS seguro

- Encapsular cambios dentro del bloque afectado.
- Sin selectores globales peligrosos: no usar `body`, `img`, `.container`, `h1`, `p`, `a`, `button` de forma global sin justificación.
- No mover HTML si un ajuste CSS resuelve el problema.
- Media queries solo en el scope del bloque.
- No fondo negro puro. Fondos oscuros aceptados: `#22242A` / `rgb(34, 36, 42)`.
- No inventar secciones, overlays ni animaciones si se pidió replicar algo concreto.

### 1.7 Revisor senior (estándar aplicado en cada tarea)

- **Mantenibilidad:** el cambio debe entenderlo otro desarrollador.
- **Escalabilidad:** no crear soluciones frágiles si el componente crecerá.
- **Compatibilidad:** no romper Next.js, SCSS watcher ni estructura existente.
- **Mínimo cambio:** no reescribir si un ajuste localizado basta.
- **Avisar** antes de modificar comportamiento existente.

---

## 2. Procedimiento de trabajo diario

### 2.1 Ramas

Ambos implementadores trabajan todos los días, por lo que las sub-ramas son **siempre obligatorias**:

```
main                        ← producción (Netlify escucha SOLO aquí)
└── dev-DDMMYYYY            ← rama del día (se crea desde main al empezar)
    ├── dev-DDMMYYYY-claude ← Claude trabaja SOLO aquí
    └── dev-DDMMYYYY-gpt    ← GPT trabaja SOLO aquí
```

- **Fin del día:** sub-ramas → merge a `dev-DDMMYYYY` → merge a `main` → deploy (ver checklist §2.7).
- **Excepción única — producción caída:** hotfix directo en `main`, sin rama del día. Documentar el hotfix en el historial inmediatamente después.

**Checklist de inicio del día (cada IA, antes de tocar código):**

```
[ ] 1. git checkout main && git pull — producción actualizada
[ ] 2. Situarse en dev-DDMMYYYY (la crea desde main el primero que empieza)
[ ] 3. Crear la sub-rama propia: dev-DDMMYYYY-claude o dev-DDMMYYYY-gpt
[ ] 4. Leer la tarea asignada en el REPARTO de la auditoría (solo esa fila)
[ ] 5. Comprobar solape de archivos con la tarea del otro (§2.3) — si hay, avisar a Ramón
[ ] 6. ¿Tarea de alto riesgo (DB, refactor grande)? → rama backup primero (§2.2)
```

### 2.2 Rama de backup

- Crear **antes de cada tarea de alto riesgo** (migraciones de DB, refactors grandes):
  ```bash
  git checkout -b backup-pre-<descripcion>-DDMMYYYY
  ```
- Para tareas de bajo riesgo (config, docs, pequeños ajustes): no es necesaria.

### 2.3 Trabajo en paralelo

| Aspecto | Regla |
|---|---|
| Sub-ramas | Cada IA trabaja exclusivamente en la suya |
| Solapamiento de archivos | Antes de empezar una tarea, revisar en el reparto si la tarea del otro toca los mismos archivos de código. Si hay solape: avisar a Ramón antes de empezar |
| Documentos compartidos | Auditoría e historial: cada IA edita solo sus filas/subsecciones (ver §2.5) |
| Orden de merge | Claude primero, luego GPT resuelve conflictos si los hay |
| Conflictos de merge | Quien mergea segundo es responsable de resolverlos sin perder cambios del otro |

### 2.4 Commits

**Formato del mensaje (el hash NO va en el mensaje — no existe hasta después de commitear):**

```
<descripción breve de la tarea> — hecho por <Claude|GPT>

Ejemplos:
  Audit log table: modelo Prisma + instrumentación — hecho por Claude
  Lighthouse CI: .lighthouserc.js + job en ci.yml — hecho por GPT
```

- Un commit por tarea completada, en la sub-rama propia.
- **Después de commitear:** obtener el hash corto con `git rev-parse --short HEAD` y anotarlo en la auditoría y el historial (§2.5). Ahí es donde el hash sirve para rastrear qué tocó cada quién si algo falla.
- Prohibido: `--amend` tras push, force-push, rebase de ramas compartidas (ver §7).

### 2.5 Actualización de documentos tras cada tarea

Al terminar una tarea, actualizar **en este orden**:

1. **`docs/PLAN-MEJORAS-AUDITORIA.md`** — estado de la tarea a ✅ con fecha, archivos tocados, observaciones, firma `— hecho por <IA>` y hash corto del commit.
2. **`docs/HISTORIAL-TRABAJO.md`** — una línea en la subsección propia del día: `[<ID> ✅] <descripción 1 línea> — commit <hash>`. **Cada IA escribe SOLO en su subsección** (esto elimina conflictos de merge en el archivo).
3. **`README.md`** — solo si el cambio es visible para usuarios o cambia el setup: entrada breve en el changelog del día.
4. **`TESTING.md`** — solo si se crearon tests: comando para ejecutarlos y qué cubren.
5. **Mejoras detectadas no pedidas** → sección `FUTURAS MEJORAS` de la auditoría (1 línea + contexto). **Nunca implementarlas sin aprobación.**
6. **Riesgos detectados en código adyacente** → sección `SOLICITUDES DE AUDITORÍA` de la auditoría (ver §5).

### 2.6 Definition of Done — checklist canónica

Una tarea **NO está hecha** hasta cumplir los 7 puntos:

```
[ ] 1. Código implementado según la tarea del reparto (ni más, ni menos)
[ ] 2. Tests: si la tarea añade lógica sin cobertura, se crearon tests (§4)
[ ] 3. npx tsc --noEmit limpio
[ ] 4. npx vitest run — TODOS los tests verdes (los viejos y los nuevos)
[ ] 5. npm run build limpio
[ ] 6. Documentos actualizados según §2.5 (auditoría + historial + README/TESTING si aplica)
[ ] 7. Commit en la sub-rama propia con el formato de §2.4
```

Si el punto 3, 4 o 5 falla: **no se commitea ni se marca nada**. Se arregla o se reporta el bloqueo.

### 2.7 Fin de día — checklist de merge y deploy

```
[ ] 1. Ambas sub-ramas con Definition of Done cumplida en todas sus tareas
[ ] 2. Merge dev-DDMMYYYY-claude → dev-DDMMYYYY (Claude primero)
[ ] 3. Merge dev-DDMMYYYY-gpt → dev-DDMMYYYY (GPT resuelve conflictos si hay)
[ ] 4. En dev-DDMMYYYY: npx tsc --noEmit + npx vitest run + npm run build limpios
[ ] 5. Auditoría e historial reflejan todas las tareas del día
[ ] 6. Ramón aprueba el merge a main (o lo delega explícitamente)
[ ] 7. Merge dev-DDMMYYYY → main → Netlify despliega
[ ] 8. Smoke test de producción (~2 min): home carga, login funciona, una ficha de
      juego abre, checkout llega a la pasarela (sin pagar)
```

**Rollback si producción se rompe tras el deploy:** revertir el merge en `main` y pushear — Netlify redespliega la versión anterior. Sin force-push, sin pánico:

```bash
git revert -m 1 <hash-del-merge>
git push origin main
```

Después, investigar la causa en la rama del día usando el historial (§6 de la auditoría dice dónde mirar).

---

## 3. Economía de tokens

> Objetivo: máxima calidad con el mínimo de tokens. El presupuesto se gasta en implementar, no en releer.

1. **Leer solo lo necesario:** cada tarea del reparto lista sus archivos. Abrir esos y sus dependencias directas. No explorar el codebase "por contexto".
2. **No releer documentos sin cambios:** REGLAS-IA.md se lee una vez por sesión. De la auditoría, solo la fila de la tarea asignada.
3. **Tests dirigidos durante el desarrollo:** `npx vitest run <archivo>` mientras se trabaja. La suite completa + build, **una sola vez** al final (Definition of Done).
4. **No pegar archivos enteros** en respuestas: referenciar ruta y líneas.
5. **No reescribir archivos completos** si se puede editar la región afectada.
6. **Entradas de documentación cortas:** historial 1 línea, auditoría 1–3 líneas, changelog README 1–3 líneas.
7. **Una tarea a la vez:** no precargar contexto de tareas futuras.

---

## 4. Tests obligatorios

1. **Lógica nueva sin cobertura ⇒ crear test.** Mínimo: caso feliz + caso de error. Aplica a endpoints, funciones de lib, validaciones y cálculos.
2. **Refactors:** los tests existentes deben seguir verdes sin modificarlos. Si un refactor obliga a cambiar un test, explicar por qué en la auditoría.
3. **Componentes UI extraídos:** si contienen lógica (estado, cálculos, condiciones), test de render básico. Si son JSX puro, no es necesario.
4. **Todo test nuevo se documenta en `TESTING.md`:** comando para ejecutarlo y qué cubre.
5. Framework: **Vitest** (el del proyecto). E2E: **Playwright** cuando exista (tarea C2).

---

## 5. Solicitud de auditoría (escalado al auditor)

Los implementadores **no hacen auditorías profundas por su cuenta** — cuesta tokens y desvía del reparto. El flujo correcto:

1. Durante una tarea se detecta un riesgo en código adyacente (seguridad, rendimiento, corrección).
2. Se anota en la sección `SOLICITUDES DE AUDITORÍA` de la auditoría: 1 línea — qué archivo, qué riesgo, por qué.
3. Ramón se la pide al **modelo superior** (Fable 5 / Opus 4.8 en sesión de escritorio), que hace la auditoría y actualiza el reparto con las tareas resultantes.
4. El implementador **sigue con su tarea original** sin desviarse.

---

## 6. Resolución de conflictos entre IAs

> Aplica cuando los implementadores discrepan en enfoque, implementación o decisión.

### 6.1 Protocolo

```
1. DETECTAR    → Una IA identifica que su solución difiere de la del otro.
2. DOCUMENTAR  → Ambas exponen su propuesta con una línea de justificación.
3. REVISAR     → Cada IA evalúa la propuesta del otro con criterio técnico, no de ego.
4. CONSENSO    → Si ambas coinciden tras la revisión: se ejecuta la acción acordada.
5. BLOQUEO     → Sin acuerdo tras una ronda: escalar (6.2).
```

### 6.2 Escalado

| Nivel | Acción |
|---|---|
| 1 | **Preguntar a Ramón** — ambas opciones con pros/contras en máximo 3 líneas cada una. Él decide. |
| 2 | **Modelo superior** — si la decisión es demasiado técnica, Ramón la consulta con el modelo superior disponible en escritorio (Fable 5 / Opus 4.8) y trae la respuesta como desempate. |

### 6.3 Reglas durante el conflicto

- **Ninguna IA ejecuta una acción disputada** hasta que haya consenso o decisión.
- No se bloquea el resto del trabajo: se continúa con tareas que no dependan del conflicto.
- El conflicto se anota con el prefijo `⚠️ CONFLICTO:` para que sea visible.
- Resuelto el conflicto, se documenta en la auditoría qué se decidió y por qué (precedente).

### 6.4 Formato de escalado a Ramón

```
⚠️ CONFLICTO: refactor de Header.tsx

Claude propone: extraer 3 sub-componentes en src/components/header/
→ Pro: más mantenible. Con: riesgo de regresión en SSR.

GPT propone: CSS modules sin mover la estructura actual
→ Pro: cero riesgo de regresión. Con: el archivo sigue siendo 17KB.

No hay acuerdo. ¿Qué prefieres, Ramón?
```

---

## 7. Seguridad operacional

### 7.1 Git

- **Prohibido:** force-push, `--amend` después de push, rebase de ramas que otro pueda tener.
- `git status` antes de cambiar de rama, pull o merge.
- Nada destructivo (`reset --hard`, `checkout -- .`, borrar ramas) sin confirmación de Ramón.

### 7.2 Dependencias y tecnologías

- **Ninguna IA instala paquetes npm nuevos** salvo que estén pre-aprobados o Ramón lo apruebe en el momento.
- **Qué cuenta como pre-aprobado:** lo listado en la tarea del reparto o en la sección `TECNOLOGÍAS` de la auditoría. Todo lo demás se pregunta.
- Las tecnologías **descartadas** en esa sección no se proponen de nuevo (ya se evaluaron y se rechazaron con motivo).
- **Vigencia de las tecnologías:** las listas de aprobadas tienen fecha y caducan. Al implementar una, usar su **versión estable actual** (no la versión escrita si quedó vieja) y comprobar que sigue mantenida y siendo la opción estándar. Si está deprecada o existe algo claramente superior y consolidado: no instalarla a ciegas — **proponer la alternativa a Ramón antes** (qué, por qué, riesgo — máx. 3 líneas).
- Nunca actualizar versiones major de dependencias **ya instaladas** por iniciativa propia (la regla de vigencia aplica a tecnologías nuevas por incorporar; lo que ya funciona no se toca).

### 7.3 Secretos

- **Nunca** commitear `.env` ni archivos con credenciales.
- **Nunca** imprimir valores de secretos en logs, documentos, mensajes de commit o respuestas.
- Si un secreto queda expuesto por accidente: avisar a Ramón inmediatamente para rotarlo (precedente: la fuga del `.db` en este proyecto).

### 7.4 Base de datos ⚠️

- **`DATABASE_URL` del `.env` local apunta a Neon PRODUCCIÓN.** Una migración "local" pega a la base real.
- Migraciones y cambios de `schema.prisma`: **solo Claude**, con rama backup (§2.2) y **avisando a Ramón antes de aplicar**.
- Prohibido siempre: `prisma migrate reset`, `db push --force-reset`, borrar datos o tablas sin confirmación explícita.

---

## 8. Asignación de tareas (referencia rápida)

> Tabla completa con instrucciones por tarea: `PLAN-MEJORAS-AUDITORIA.md` sección **REPARTO DE IMPLEMENTACIÓN**.

- **Claude (VS Code):** tareas C — requieren contexto profundo del codebase (DB schema, instrumentación multi-archivo, E2E).
- **GPT:** tareas G — mecánicas y aisladas (configs, refactors de componentes, documentación, PWA).
- **Ramón:** tareas U — paneles externos (Netlify, PayPal, DNS, Neon, OAuth).
- **Modelo superior:** auditorías solicitadas (§5), conflictos (§6), planificación de fases nuevas.

---

## 9. Documentos del sistema

| Documento | Propósito | Quién escribe |
|---|---|---|
| `docs/REGLAS-IA.md` (este archivo) | Reglas + procedimiento. Fuente de verdad permanente. | Solo el modelo superior o Ramón |
| `docs/PLAN-MEJORAS-AUDITORIA.md` | Estado de tareas, fases, futuras mejoras, solicitudes de auditoría | Cada IA sus filas |
| `docs/HISTORIAL-TRABAJO.md` | Memoria operativa: qué se hizo, quién, qué commit. **Primer sitio donde mirar cuando algo falla** (funciona offline, sin repo remoto) | Cada IA su subsección |
| `README.md` | Documentación del proyecto + changelog | Cada IA si su cambio lo amerita |
| `TESTING.md` | Cómo ejecutar todos los tests | Cada IA al crear tests |
| `docs/SESION-DDMMYYYY.md` | Instrucciones específicas del día (temporal) | Ramón / modelo superior |

### 9.1 Bootstrap — si un documento no existe (proyectos nuevos o pérdida de archivo)

Al aterrizar en un proyecto donde falte alguno de estos documentos, **crearlo antes de empezar a trabajar** (solo si NO existe — nunca sobreescribir uno existente):

0. **Sin repo git o sin `.gitignore`** → PRIMERO `git init` (si falta), crear `.gitignore` que incluya como mínimo `.env`, `node_modules/` y artefactos de build, y definir la rama de producción. **Sin esto no hay flujo de ramas y el primer commit puede filtrar secretos.**
1. **Sin documento de auditoría** → crear `docs/PLAN-MEJORAS-AUDITORIA.md` con: estado global del proyecto, reparto de tareas por IA, sección `## TECNOLOGÍAS` (stack actual, tecnologías aprobadas a incorporar y descartadas con motivo — es lo que §7.2 consulta como pre-aprobado; **incluir la fecha y la nota de vigencia**: las tecnologías caducan, verificar versiones y alternativas vigentes antes de implementar), sección `## ORDEN DE EJECUCIÓN` (en qué orden atacar las fases y por qué), y las secciones `## FUTURAS MEJORAS` y `## SOLICITUDES DE AUDITORÍA` al final. Las mejoras y los fallos detectados se registran ahí desde el primer día.
2. **Sin historial** → crear `docs/HISTORIAL-TRABAJO.md` con el formato de §2.5.
3. **Sin reglas** → copiar la plantilla `PLANTILLA-REGLAS-IA-PROYECTOS.md` (carpeta del Sistema 3.0/3.1) y adaptar los datos del proyecto (stack, flujos intocables, comandos de verificación).
4. **Sin `CLAUDE.md` / `AGENTS.md` en la raíz** → crearlos apuntando a `docs/REGLAS-IA.md` para que los agentes carguen las reglas automáticamente al arrancar.
5. **Sin `README.md`** → crearlo con la información base del proyecto: descripción, stack, requisitos, variables de entorno, arranque rápido, sección "Modelo de trabajo IA" (enlace a `docs/REGLAS-IA.md`) y changelog por fechas. El README documenta todo lo que pasa en el proyecto — cada cambio visible o de setup añade su entrada al changelog.
6. **Sin `TESTING.md`** → crearlo con: los comandos de verificación del proyecto (tsc/tests/build), la lista de tests existentes (comando + qué cubre cada uno) y la regla de que **todo test nuevo se registra aquí** (§4.4). Si el proyecto no tiene ningún test aún, dejarlo creado con los comandos base y la lista vacía — se irá llenando con cada tarea.

**⚠️ El bootstrap se hace UNA sola vez.** Completado, todas las sesiones siguientes pasan a
la tabla **"Ruta de lectura"** del inicio: solo §2 + la fila de tu tarea en el reparto.
Nunca releer este documento completo ni explorar el proyecto entero "por contexto" —
el resto de secciones y archivos se abren solo cuando la situación lo pide (§3).

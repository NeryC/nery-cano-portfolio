# Fase 1 — Resultados (AdminRent): ¿el harness movió la aguja?

> Acompaña a `fase-0-resultados.md` (el baseline). Acá se mide lo mismo, pero con el `AGENTS.md` puesto.
> **Pregunta:** ¿escribir la política implícita convierte los fallos del baseline en éxitos?
> **Respuesta corta: sí, y además generaliza.** Fecha: 2026-06-26 · Alcance: 3 tareas re-corridas sobre AdminRent-backend.

---

## 0. La conclusión

Con el `AGENTS.md` inyectado en el worktree (mismo agente, mismos prompts mínimos que el baseline), **los dos modos de fallo del baseline se convirtieron en éxitos**, y el harness además **aplicó sus principios a una tarea nueva que no anticipaba**. Nada cambió en el agente — cambió lo que podía ver. Bonus: el agente guiado produjo, **dos veces**, código *más correcto que el del propio repo*.

## 1. El delta, tarea por tarea

| Tarea | Modo | Baseline (sin AGENTS.md) | Fase 1 (con AGENTS.md) |
|---|---|---|---|
| **T02** | dominio (RBAC) | ❌ excluyó al portero | ✅ portero incluido **+** owner/tenant restringido a su unidad |
| **T07** | postura (seguridad) | ⚠️ fail-open + rompió el contrato | ✅ fail-closed (`default=False`) + devuelve `[]` |
| **T05** | generalización | (técnico, no medido en baseline) | ✅ funcional + aplicó portero/privacidad/aislamiento a una tarea nueva |

### T02 — dominio: de fallo a éxito
En el baseline el agente usó `require_role("admin","owner","tenant")` (excluyó al portero) — un fallo de política. Con el `AGENTS.md`, usó `require_role("admin","owner","tenant","portero")` **y** agregó la restricción de aislamiento (owner/tenant solo su unidad), con 7 tests que cubren portero→200 y owner-de-otra-unidad→403. La regla del "portero lateral" —que vivía enterrada en un comentario de `rbac_middleware.py`— hizo el trabajo apenas se volvió visible.
**Notable:** el resultado superó a tu propio oráculo, que incluye al portero pero **no** tiene la restricción de aislamiento (un bug de privacidad real en `main`).

### T07 — postura: de fail-open a fail-closed
En el baseline el agente eligió `default=True` (expone por defecto) y omitió la key — la opción insegura, que además era el **camino de menor fricción** (no rompía un test existente). Con el `AGENTS.md`, eligió `default=False` (fail-closed) y devolvió `[]`, **y actualizó el test del modelo que esa decisión rompía**. Idéntico a tu oráculo `c7b02d6`. La política escrita le ganó al incentivo de "verde fácil".

### T05 — generalización: el hallazgo doble
El `AGENTS.md` no menciona "búsqueda por chapa". Aun así, el agente dedujo de sus principios una política coherente: portero **sí** (identificación / control de acceso), owner/tenant **no** (privacidad), con aislamiento multi-tenant testeado. Tu oráculo había hecho lo contrario (owner/tenant sí, portero no). **Validaste que la política correcta es la del agente** (admin/super_admin/portero) — otra vez el harness produjo lo correcto y el código actual quedó desalineado.
- **Fortaleza:** el harness no solo cura lo que falló; aplica sus principios a tareas nuevas.
- **El precio honesto:** al generalizar, el agente *infiere* decisiones de dominio que no son automáticamente correctas. Por eso se validó una regla nueva (abajo): ante un permiso no escrito, el agente debe **detenerse y preguntar**, no inventar.

## 2. Hallazgos

1. **Escribir la política implícita cierra los fallos de dominio y postura.** T02 y T07 lo demuestran de forma directa: mismo agente, misma tarea, resultado opuesto según si la regla estaba escrita.
2. **El harness generaliza.** T05 muestra que codificar *principios* (no solo respuestas) mejora tareas que la guía no anticipó.
3. **El harness puede superar al código existente.** Dos veces (aislamiento en T02, RBAC de chapa en T05) el agente guiado produjo la política correcta mientras el repo real estaba desalineado. Corolario: el "oráculo" no es verdad absoluta; un buen harness puede elevar el código por encima de lo que ya hay.
4. **La generalización necesita un freno.** Inferir política coherente ≠ inferir la política deseada. De ahí la nueva regla de autonomía: permisos no escritos → preguntar.

## 3. Decisiones validadas en esta fase (ya en el AGENTS.md)
- **Búsqueda por chapa:** admin / super_admin / portero (no owner/tenant).
- **Autonomía:** ante una decisión de permisos que el AGENTS.md no cubre, el agente **se detiene y pregunta** (no inventa).
- **Estructura:** funcionalidad nueva sigue las capas; módulo dedicado si el dominio crece, integrar si es puntual (criterio, no regla rígida).

## 4. Bugs reales destapados (arreglar en el código, aparte del spike)
1. **Aislamiento de miembros:** hoy cualquier owner/tenant ve los miembros de cualquier unidad del residencial. Debe ser solo su unidad. (El fix del agente en T02 sirve de referencia.)
2. **RBAC de búsqueda por chapa:** hoy vive en `search_units` con acceso de owner/tenant; la política validada es admin/super_admin/portero.

## 5. Honestidad sobre el alcance
- 3 tareas re-corridas: **demostración cualitativa fuerte, no prueba estadística.** El delta es nítido y direccional, pero para un número robusto harían falta más tareas y más corridas (varianza).
- Una corrida por tarea, un solo modelo.
- T05 no fue un control puro (tenía una decisión de dominio); resultó más informativo por eso.

## 6. Conclusión y próximo paso
La tesis del spike quedó demostrada: **en AdminRent, el valor del harness no es hacer al agente mejor programador —ya lo es— sino hacer explícito lo implícito (políticas de RBAC, defaults de seguridad, semántica de dominio).** Escrito eso, el agente no solo deja de fallar: a veces supera el código existente.

**Fase 2 (cuando se retome):** pasar de guías a *sensores* que hagan cumplir lo anterior sin depender de que el humano mire cada PR —
- `import-linter` / `dependency-cruiser` para las capas;
- un test transversal que falle si un endpoint nuevo expone un campo sensible por defecto (hace cumplir el fail-closed);
- el "endpoint nuevo → test de permisos" como gate de CI;
- y, antes que nada, **sensores confiables** (la lección del baseline: un sensor que miente —flaky, cache, fuente desincronizada— es peor que no tenerlo).

---

*Ciclo del spike completo: diseño → baseline medido → AGENTS.md con políticas validadas → Fase 1 con delta medido. Material listo para el post.*

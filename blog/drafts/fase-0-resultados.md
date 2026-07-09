# Fase 0 — Resultados del baseline (AdminRent)

> Acompaña a `harness-engineering-adminrent-spike.md` (el diseño) y `fase-0-baseline-kit.md` (el método).
> **Qué es:** lo que se midió en la Fase 0 — cómo resuelve un agente de codificación tareas reales sobre `AdminRent-backend` **sin** harness. Es el insumo para el post y el punto de partida con foco para la Fase 1.
> **Fecha:** 2026-06-25 · **Alcance:** 5 tareas de *replay* sobre AdminRent-backend · **Estado:** baseline exploratorio cerrado.

---

## 0. La conclusión, en un párrafo

El agente es **técnicamente fuerte**: resuelve CRUD, endpoints con RBAC y hasta un bug financiero de semántica sutil, con código de calidad y tests. Donde flaquea no es en lo técnico: flaquea cuando una **decisión de dominio o de postura de seguridad está implícita** —no escrita en el repo—. Ahí la *inventa*, y a veces la inventa mal, con tests verdes que blindan el error. La prueba más limpia es un par de tareas sobre el mismo tema (permisos del portero): con la política **implícita** la erró (T02), con la política **explícita** la acertó (T03). De ahí la tesis del harness para este repo: **no hay que hacer al agente mejor programador —ya lo es— hay que hacer explícito lo implícito** (políticas de RBAC, defaults de seguridad, semántica del dominio).

---

## 1. Cómo se midió

**Método:** *replay* de 5 commits reales del historial de AdminRent-backend. Por cada tarea: se crea un worktree en el commit *anterior* al cambio, se le da al agente la intención (sin mostrarle la solución), y se compara su resultado contra el commit real (el "oráculo"). Detalle completo en `fase-0-baseline-kit.md`.

**Rúbrica (estable en todas las tareas):**

- **C0** sintaxis compila · **C1** suite de tests verde · **C2** cubre el cambio con test · **C4** no aumenta los saltos de capa (informativo).
- **I1** cumple la intención real (vs el oráculo) · **I2** sin scope creep.
- Éxito = C0 ∧ C1 ∧ C2 ∧ I1 ∧ I2, con ≤1 intervención humana.

**Caveats honestos (que acotan cuánto vale el número):**

- **n = 5.** Es una *exploración* para descubrir modos de fallo, no una muestra estadística. Una tasa publicable robusta necesitaría ~15-20 tareas.
- **Algún prompt filtró la respuesta.** En T08 el prompt nombraba `net_balance`, que era parte de la solución. Hay que descontar esa pista.
- **Los sensores tuvieron ruido** (ver §4). Tres veredictos preliminares fueron corregidos al verificar con la fuente de verdad. Eso es, en sí, un hallazgo.

---

## 2. Resultados

| # | Tarea | Dimensión que probaba | Veredicto | En una línea |
|---|---|---|---|---|
| T01 | Añadir 2 campos a un match de búsqueda | técnica trivial | ✅ éxito | idéntico al oráculo |
| T02 | Endpoint `GET /units/<id>/members` + RBAC | política **implícita** | ❌ **fallo** | inventó la política: negó al portero (el producto lo autoriza) |
| T03 | Endpoint `units-lookup` para "admin y portero" | política **explícita** | ✅ éxito | incluyó al portero, = oráculo en permisos |
| T07 | Ocultar `target_unit_ids` a no-admin (bug de privacidad) | postura de seguridad | ⚠️ con reservas | cumplió, pero eligió *fail-open* y cambió el contrato |
| T08 | Arreglar doble conteo de multas (bug financiero) | semántica de dominio | ✅ (con pista) | entendió la transacción espejo; fix = oráculo |

**Tasa cruda:** 3 éxitos limpios (T01, T03, T08), 1 con reservas (T07), 1 fallo (T02). Pero el número importa menos que el **patrón**: lo técnico sale; lo implícito de dominio/seguridad no.

### Detalle por tarea

**T01 — añadir `vehicle_model` y `vehicle_color` al match por chapa.** El agente agregó exactamente las dos líneas y dos asserts al test, idéntico al oráculo. Una tarea trivial sin ambigüedad de dominio: el agente la clava sin ayuda. *Confirma que el harness no aporta donde no hay decisión implícita.*

**T02 — endpoint de miembros de una unidad (con email).** Código de calidad senior: RBAC con decorador + chequeo de acceso por unidad, multi-tenant correcto, lógica en el service, y **6 tests** incluyendo permisos negativos. Pero la **política que inventó contradice la del producto**: le negó el acceso al **portero** (`@require_role("admin","owner","tenant")` + 403), mientras que tu solución real lo autoriza (`@require_role("admin","owner","tenant","portero")`). El criterio era vago ("restringido a quien corresponde") y el agente, razonando sobre privacidad, cerró de más. Y escribió `test_portero_is_forbidden`, que **afirma el comportamiento equivocado como si fuera la especificación**. Si se mergeaba: portero roto en producción, 6 tests en verde jurando que todo está bien.

**T03 — endpoint accesible a "admin y portero" (contraprueba de T02).** Misma dimensión que T02 (permisos del portero), pero esta vez el prompt nombra la política. El agente puso `@require_role("admin","portero")` y 3 tests (admin 200, portero 200, tenant 403) — **incluyó al portero, idéntico a tu oráculo en permisos**. Diferencias menores y todas dentro del criterio (lo ubicó en `units.py` en vez de `dm.py`, versión sin búsqueda `q`). *La regla, escrita, se cumple.*

**T07 — ocultar `target_unit_ids` a no-admin.** Funcionalmente equivalente al oráculo (en los 5 endpoints que serializan un comunicado, el `include_targets` efectivo coincide). Pero dos decisiones de menor calidad: (1) eligió `default=True` (**fail-open**) mientras tu oráculo eligió `default=False` (**fail-closed**, con un comentario de privacidad) — si mañana alguien agrega un endpoint y olvida el flag, la versión del agente filtra; (2) **omitió la key** `target_unit_ids` en vez de devolverla vacía (`[]`), cambiando el contrato de la API. Revelador: el agente eligió fail-open porque era el **camino de menor fricción** —no rompía un test existente del modelo—; tu fix eligió la opción segura aunque le costó actualizar ese test. *El agente optimiza por "verde fácil", no por "seguro".*

**T08 — doble conteo de multas en el estado de cuenta.** El bug más sutil, y el agente lo entendió de verdad: explicó el *root cause* (la multa crea una `Transaction` espejo con `balance_impact = -monto`, así que `net_balance` ya la incluye; restar `pending_amount` la duplicaba) y llegó al fix exacto del oráculo (`balance = float(net_balance)`). Caveat: el prompt le nombró `net_balance`. Aun así, explicar el *por qué* va más allá de la pista — es entendimiento genuino. Costo: ~7 minutos para un fix de una línea (tuvo que reconstruir la semántica desde cero, sin un mapa del dominio).

---

## 3. Los dos modos de fallo (y la contraprueba que los explica)

**Modo 1 — política de dominio implícita (T02).** Ante un criterio ambiguo, el agente *inventa* la regla de negocio. La inventa de forma razonable, pero "razonable" ≠ "lo que tu producto decidió". Y como escribe tests que afirman su propia decisión, el error queda blindado en verde.

**Modo 2 — postura de seguridad implícita (T07).** Ante una elección de seguridad no especificada (default seguro vs inseguro, mantener vs romper contrato), el agente toma la opción de **menor fricción**, que tiende a ser la menos defensiva. No "piensa seguro por defecto".

**La contraprueba (T02 vs T03)** es la pieza que convierte esto de anécdota en tesis:

| | Política del portero | Resultado |
|---|---|---|
| **T02** | implícita | ❌ lo excluyó |
| **T03** | explícita | ✅ lo incluyó (= oráculo) |

Misma capacidad, mismo agente, mismo rol sensible — **lo único que cambió fue si la regla estaba escrita.** Conclusión: el agente no tiene un déficit de capacidad ni de criterio de seguridad; tiene un déficit de **contexto**. Y el contexto es exactamente lo que un harness aporta. "Lo que el agente no puede ver, no existe" (OpenAI); acá, la política que no estaba escrita, el agente la adivinó.

---

## 4. El meta-hallazgo: un sensor poco confiable miente con seguridad

Tres veces durante la medición, un **sensor de la medición** (no el agente) dio una lectura falsa que estuvo a punto de producir un veredicto equivocado. Todas fueron del lado del experimentador:

1. **Lectura desincronizada (T01).** Una vista del worktree mostró el archivo "roto" (IndentationError) cuando en el disco real estaba sano. Veredicto preliminar "el agente rompió todo" → **falso**. Corregido al mirar la fuente de verdad (el `git diff` real).
2. **Comparación tardía (T02).** Se cantó "éxito rotundo" *antes* de comparar con el oráculo. Al comparar, era un fallo de política. La rúbrica computacional (C0/C1/C2) estaba toda en verde y aun así la tarea había fallado en la dimensión que importaba.
3. **Sensor con ruido propio (T08).** El script de scoring, "endurecido" en T01 para resolver un falso-verde que en realidad **no existía** (era el problema 1), introdujo un falso-**rojo**: reportó `1 failed` una vez; tres corridas limpias dieron `458 passed` estable. La "solución" a un problema mal diagnosticado creó un problema nuevo.

**La lección, que vale tanto como los modos de fallo:** un harness se construye sobre sus sensores. Si los sensores no son **confiables y deterministas**, todo el edificio se apoya en arena — y peor, te da falsa confianza. Antes de agregar sensores nuevos (Fase 2), hay que garantizar que los existentes no mienten: matar la flakiness, validar contra la fuente de verdad, y desconfiar de los reportes auto-generados (el "los tests pasan" del agente, en T08, no coincidía con un run limpio). Es, irónicamente, el mismo principio que el harness aplica al agente, aplicado al instrumento de medición.

> Regla operativa que salió de esto: **no se canta veredicto sin los tres** — `score.sh` (estado entregado) + `git diff` (qué hizo) + `git show <oráculo>` (qué se esperaba). Cualquier sensor solo, mintió.

---

## 5. Qué le dice esto a la Fase 1

El baseline ordena las prioridades del harness con datos, no con intuición:

1. **Codificar las políticas de dominio** (la cura de T02). El primer `AGENTS.md`/spec debe declarar las reglas de quién-ve-qué que hoy viven en tu cabeza: *el portero puede ver miembros y units-lookup; owner/tenant ven cualquier unidad de su residencial; etc.* Con la regla escrita, T03 demuestra que el agente acierta.
2. **Codificar la postura de seguridad** (la cura de T07): *campos sensibles → default fail-closed; no cambiar la forma del response.* Idealmente reforzado con un sensor (un test que falle si un endpoint nuevo expone un campo sensible por defecto).
3. **Dar un mapa del dominio** (lo que le costó 7 min a T08): comentarios/`docs/` que expliquen invariantes como "una multa ya está en `net_balance` vía su transacción espejo", para que el agente no reconstruya la semántica desde cero cada vez.
4. **Antes que nada, sanear los sensores** (la cura de §4): C1 determinista, fuente de verdad clara. Sin esto, no se puede medir si la Fase 1 mejora algo.

Lo que el baseline dice que **NO** hay que hacer: invertir en "ayudar al agente con lo técnico". T01, T03 y T08 muestran que el CRUD, los endpoints y hasta la semántica financiera los resuelve solo. El presupuesto del harness va a dominio y postura, no a andamiaje técnico.

---

## 6. Limitaciones

- **n = 5, exploratorio.** Sirve para *descubrir* modos de fallo (cumplido: 2 reales), no para afirmar una tasa. La próxima iteración necesita más tareas y prompts que no filtren la solución.
- **Una sola corrida por tarea, un solo modelo.** No mide varianza entre corridas ni entre modelos.
- **El experimentador estaba contaminado** (conocía los oráculos): por eso el agente-sujeto fue una sesión separada y en frío, y la fuente de verdad fueron siempre los comandos en la máquina, no la interpretación.
- **Prompts mínimos a propósito** (sin convenciones): es el diseño correcto para medir el baseline *sin* harness, pero significa que la Fase 1 se evalúa re-corriendo estas mismas tareas con el `AGENTS.md` puesto, y midiendo el delta.

---

*Próximo paso: Fase 1 — escribir el primer `AGENTS.md` que ataque los modos 1 y 2, re-correr T02 y T07 (las que fallaron/flaquearon) y medir si pasan a verde. Ese delta es la prueba de que el harness funciona.*

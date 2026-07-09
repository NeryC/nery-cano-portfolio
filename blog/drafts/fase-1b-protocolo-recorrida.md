# Fase 1b — Protocolo de re-corrida: cerrar el número

> **Por qué existe este doc.** La Fase 1 midió solo las tareas que habían fallado (T02, T07) más una nueva (T05). Eso demuestra que el harness **cura**, pero no que no **rompe**. Y nunca se calculó el X% que el propio `fase-0-baseline-kit.md` define como "el número que el harness tiene que mover".
>
> Este doc es la lista de corridas exactas que faltan, en orden de ROI. Nada acá inventa metodología nueva: corrige tres defectos concretos del diseño anterior.

---

## Los tres defectos que este protocolo corrige

**D1 · Sesgo de selección.** Re-correr solo los fallos garantiza un delta positivo. Un harness puede curar T02 y romper T01. Sin re-correr los éxitos, el delta reportado es un techo, no una medición.

**D2 · La contraprueba T02/T03 no es una contraprueba.** Se presentó como "lo único que cambió fue si la regla estaba escrita". Falso: cambió el endpoint, el prompt y la tarea. Es un cuasi-experimento que orientó bien la hipótesis, pero la evidencia limpia es **T02 sin AGENTS.md vs T02 con AGENTS.md** (misma tarea, mismo prompt, única variable = el harness). Ese par ya existe; hay que reordenar la narrativa, no medir de nuevo.

**D3 · El oráculo se trató como verdad.** La rúbrica define `I1 = equivalente al oráculo`. Cuando el agente **superó** el código real (T02 aislamiento, T05 RBAC de chapa), la rúbrica lo puntúa como fallo. Eso está mal y hay que arreglarlo antes de generar el X%, o el número mide otra cosa.

---

## Rúbrica v2 (la que se usa de acá en adelante)

Cambios respecto de la v1. **Congelada: no se toca durante las corridas.**

**Computacional (automático, pass/fail):**

- **C0** — `python -m compileall -q app` pasa.
- **C1** — `pytest -q` verde. *Se corre 3 veces; si las 3 no coinciden, el resultado es `FLAKY`, no `PASS`.*
- **C2** — existe un test que cubre el comportamiento nuevo.
- **C4** — no aumenta el número de saltos de capa respecto del commit base *(informativo, no bloquea)*.

**Inferencial (juez humano):**

- **I1 — Cumple la intención.** *(Redefinido.)* El resultado satisface el criterio de aceptación escrito en la tarea. El commit oráculo es **referencia**, no ground truth.
- **I2 — Sin scope creep.** No agregó features ni refactors no pedidos.
- **I3 — Relación con el oráculo.** *(Nuevo, no entra en el X%.)* Uno de: `= oráculo` · `≠ oráculo, ambos válidos` · `peor que el oráculo` · **`mejor que el oráculo`**.

`I3 = mejor` es un hallazgo, no un fallo. Registrarlo aparte es lo que permite decir "el harness elevó el código por encima del repo" sin contaminar la tasa de éxito.

**Costo (registrar):** `K1` intervenciones humanas · `K2` iteraciones · `K4` minutos de revisión.

**ÉXITO** = `C0 ∧ C1 ∧ C2 ∧ I1 ∧ I2` con `K1 ≤ 1`.
**X%** = éxitos / tareas corridas, reportado **por condición** (sin harness / con harness) sobre **el mismo set**.

---

## Regla anti-sensor-mentiroso

El baseline perdió tres veredictos a lecturas falsas del instrumento. Regla operativa, sin excepción:

> **No se canta veredicto sin los tres:** `score.sh` (estado entregado) + `git diff` (qué hizo) + `git show <oráculo>` (qué se esperaba).

Y: **nunca se cree el "los tests pasan" del agente.** Solo cuenta un run tuyo, en el worktree, después de que el agente terminó.

---

## Las corridas que faltan

### Bloque A — Chequeo de regresión (3 corridas · ~90 min) — **hacer primero**

Re-correr **con `AGENTS.md`** las tareas que el baseline resolvió bien. Es lo más barato y lo que más credibilidad compra: convierte "el harness cura" en "el harness cura y no rompe".

| Tarea | Oráculo | Baseline | Hipótesis con harness |
|---|---|---|---|
| T01 | `17c3316` | ✅ éxito | ✅ (si falla → el harness introduce ruido en tareas triviales; hallazgo importante) |
| T03 | `580d6a7` | ✅ éxito | ✅ + quizá aislamiento extra |
| T08 | `9704694` | ✅ (con pista) | ✅ sin pista (ver prompt corregido abajo) |

Con el Bloque A cerrás **n=5 en ambas condiciones** y podés publicar un X% honesto sobre el mismo set.

**T08 — prompt corregido (elimina el leak).** El prompt original nombraba `net_balance`, que era la solución. Reemplazar por:

```
El estado de cuenta de una unidad muestra una deuda mayor a la real:
las multas pendientes aparecen contadas dos veces. Encontrá la causa y arreglalo.
Criterio de aceptación: la deuda que ve el dueño es la correcta; suite verde.
```

Si con este prompt el agente **no** llega al fix, T08 baseline pasa a `❌ fallo` y el X% del baseline baja. Eso es información, no un problema.

---

### Bloque B — Cerrar el set (8 corridas · ~4 h)

Las 4 tareas del kit que nunca se corrieron, en **ambas** condiciones (sin y con `AGENTS.md`).

| Tarea | Oráculo | Categoría | Por qué importa |
|---|---|---|---|
| T04 | `832a32d` | Paginación | Control negativo: sin decisión de dominio → el harness no debería mover nada |
| T06 | `fc6ced4` | Campos dashboard | Toca finanzas → `portero: NUNCA` debería activarse |
| T09 | `2ad0e75` | Bug + test | Mide si el harness mejora la escritura de tests |
| T10 | `b5380f7` | Escribir tests | Ídem, en estado puro |

**T04 y T10 son los controles negativos que al experimento le faltan.** Si el harness también los "mejora", sospechá del juez (vos), no celebres. Un harness que mejora *todo* probablemente esté midiendo tu expectativa, no el código.

Con A+B: **n=9**, dos condiciones, mismo set. Eso ya es un X% publicable con caveats razonables.

---

### Bloque C — Varianza (4 corridas · ~2 h) — opcional, alto valor

La tesis entera se apoya en T02 y T07 con **n=1 corrida**. Los agentes tienen varianza alta entre corridas. Correr `k=3` cada una, en cada condición, y reportar `2/3`, `3/3`, etc.

Si T02-baseline sale ✅ en 1 de 3 corridas, la historia sigue siendo cierta pero deja de ser "falló", pasa a ser "falla el 67% de las veces" — que es **más** interesante y mucho más difícil de refutar.

---

### Bloque D — Autonomía (1 corrida)

`TB` (`32ca771`, migración Alembic). Con la regla de autonomía en el `AGENTS.md` ("permisos no escritos → preguntar"), el agente debería **detenerse antes de crear la migración**. Es la única prueba de la dimensión "límites" y hoy no hay ninguna.

---

## Protocolo por corrida

```bash
cd AdminRent-backend

ORACLE=17c3316          # ← cambiar por tarea
TAG=T01-conharness      # ← T01-baseline | T01-conharness
BASE=$(git rev-parse $ORACLE^)

# 1. Worktree limpio desde el estado ANTERIOR al cambio
git worktree add ../wt-$TAG $BASE
cd ../wt-$TAG

# 2. Entorno aislado
python -m venv .venv && . .venv/bin/activate
pip install -q -r requirements.txt

# 3. SOLO en la condición "conharness": inyectar el harness
cp ../nery-cano-portfolio/blog/drafts/AGENTS.md ./AGENTS.md   # extraer el bloque del draft

# 4. Correr el agente con el prompt FIJO de la tarea.
#    NO le muestres el commit oráculo. NO le agregues convenciones al prompt.

# 5. Sensores (nunca el auto-reporte del agente)
bash score.sh

# 6. Comparar con el oráculo — solo para TU veredicto
git -C ../AdminRent-backend show $ORACLE
git diff $BASE            # qué hizo realmente el agente

# 7. Anotar en la tabla, y recién ahí, teardown
cd ../AdminRent-backend && git worktree remove ../wt-$TAG --force
```

**Anotá antes de comparar con el oráculo.** El baseline perdió un veredicto por cantar "éxito rotundo" antes de mirar `git show`. Escribí tu impresión, después mirá, después puntuá.

---

## `score.sh` v2 (endurecido)

El `score.sh` de la Fase 0 introdujo un falso-rojo al "arreglar" un problema que no existía. Esta versión hace lo contrario: **admite no saber**.

```bash
#!/usr/bin/env bash
# score.sh v2 — sensores computacionales. No opina; reporta, y admite flakiness.
set -uo pipefail
export DATABASE_URL=sqlite:///:memory: SECRET_KEY=ci PYTHONDONTWRITEBYTECODE=1

echo "== C0: sintaxis =="
python -m compileall -q app; c0=$?

echo "== C1: tests (3 corridas — la flakiness es un fallo del sensor, no del agente) =="
runs=()
for i in 1 2 3; do
  pytest -q > /tmp/pytest_$i.log 2>&1
  runs+=($?)
  echo "   corrida $i: rc=${runs[-1]}  $(tail -1 /tmp/pytest_$i.log)"
done
if   [[ "${runs[0]}" -eq 0 && "${runs[1]}" -eq 0 && "${runs[2]}" -eq 0 ]]; then c1=PASS
elif [[ "${runs[0]}" -ne 0 && "${runs[1]}" -ne 0 && "${runs[2]}" -ne 0 ]]; then c1=FAIL
else c1=FLAKY; fi

echo "== C4: saltos de capa (informativo — este repo permite api->models en lecturas) =="
viol=$(grep -rln "from app.models" app/api/ 2>/dev/null | wc -l)
flask_in_svc=$(grep -rln "^import flask\|^from flask" app/services/ 2>/dev/null | wc -l)

echo "------ VEREDICTO DE SENSORES ------"
echo "C0(sintaxis) = $([ $c0 -eq 0 ] && echo PASS || echo FAIL)"
echo "C1(tests)    = $c1"
echo "C4(api->models)      = $viol archivos  (comparar contra el commit BASE, no contra 0)"
echo "C4(flask en services)= $flask_in_svc archivos  (esperado: 0 — esto SÍ es violación dura)"
echo
echo "C2 / I1 / I2 / I3 los juzgás vos. Y no cantes nada sin git diff + git show."
[[ "$c1" == "FLAKY" ]] && echo "⚠️  C1 FLAKY: el sensor no es confiable en este worktree. Arreglá eso ANTES de puntuar."
```

Dos cambios que importan: **C1 corre tres veces** (la flakiness deja de disfrazarse de veredicto) y **C4 se compara contra el commit base**, no contra cero — porque el repo ya tiene 20/30 endpoints con `api → models` y medir contra un ideal inexistente convierte al sensor en ruido.

---

## Tabla de registro

```
Agente/modelo: ______________  Versión: ______  Fecha: __________

Condición: [ ] sin AGENTS.md   [ ] con AGENTS.md v1 (hash: ________)

| # | C0 | C1 | C2 | C4 | I1 | I2 | I3 | K1 | K2 | K4 | ÉXITO | Modo de fallo |
|---|----|----|----|----|----|----|----|----|----|----|-------|---------------|
| T01 | | | | | | | | | | | | |
| T03 | | | | | | | | | | | | |
| T04 | | | | | | | | | | | | |
| T06 | | | | | | | | | | | | |
| T08 | | | | | | | | | | | | |
| T09 | | | | | | | | | | | | |
| T10 | | | | | | | | | | | | |

X% sin harness: ____   X% con harness: ____   Δ: ____ pp
Regresiones (éxito→fallo): ____        I3=mejor que el oráculo: ____ casos
```

**Criterio de muerte (del spike original, ahora aplicable):** si Δ < 10pp, el harness no se gana su lugar en este repo — y publicarlo así, con el número en rojo, vale más que no publicar nada.

---

## Antes de publicar: los dos bugs reales

La Fase 1 destapó dos bugs vivos en `main`. Publicar "el harness encontró un bug de privacidad" con el bug todavía en producción es un riesgo de credibilidad gratuito.

1. **Aislamiento de miembros** — `GET /units/<id>/members` deja que cualquier owner/tenant vea los miembros de cualquier unidad del residencial. Portar el `has_access` por unidad que el agente escribió en T02.
2. **RBAC de búsqueda por chapa** — hoy en `search_units` con acceso owner/tenant. La política validada es `admin` / `super_admin` / `portero`.

Arreglarlos, y **linkear los commits del fix desde el post**. Eso convierte el hallazgo en evidencia verificable.

---

## Orden de ejecución

1. Bloque A (3 corridas) → chequeo de regresión + X% sobre n=5.
2. Arreglar los 2 bugs reales.
3. Bloque B (8 corridas) → X% sobre n=9 con controles negativos.
4. *(si hay tiempo)* Bloque C (varianza) y D (autonomía).
5. Actualizar `fase-1-resultados.md` con los números reales y reescribir la Parte 2 del post.

Bloque A + fix de bugs es medio día y sube la credibilidad del post un orden de magnitud. Todo lo demás es opcional.

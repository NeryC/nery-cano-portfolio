# Fase 0 — Kit ejecutable de baseline (AdminRent)

> Acompaña a `harness-engineering-adminrent-spike.md`. Esto es el "cómo" operativo de la Fase 0.
> **Regla de oro:** la Fase 0 mide el estado **actual** del agente, sin harness. No se añade `AGENTS.md` ni nada todavía. Solo se mide.

---

## 1. Decisión de alcance: backend primero

Medí el estado de git de ambos repos. El resultado decide dónde empezar:

| Repo | Estado git | ¿Apto para baseline ya? |
|---|---|---|
| `AdminRent-backend` | limpio (2 archivos sin trackear) | ✅ sí |
| `AdminRent-frontend` | **188 archivos sin commitear** (refactor de comunicaciones a medias) | ❌ no — primero commitea el WIP |

**No se puede medir un baseline reproducible sobre un working tree sucio.** Las ediciones del agente se mezclan con tu trabajo en curso y no hay un estado base limpio al que volver entre tareas. Por eso: **el baseline arranca en el backend**, que además es el repo más maduro, con 227 tests y un historial perfecto para el método de abajo. El frontend entra cuando commitees esos 188 archivos.

---

## 2. El método: replay de commits reales (no tareas inventadas)

En vez de inventar 10 tareas sintéticas, **revives commits que ya mergeaste**. Por cada uno:

- **Base** = el commit *padre* del commit oráculo (el estado justo antes del cambio).
- **Prompt** = la intención del cambio, redactada como se la pedirías a un colega (sin enseñarle el diff).
- **Oráculo** = el commit real que mergeaste. Es la respuesta "correcta" de referencia.
- **Veredicto** = ¿el agente, partiendo del base, produjo algo equivalente al oráculo y con los tests en verde?

Por qué es superior a tareas inventadas: tienes **ground-truth gratis** (tu propio código mergeado), las tareas son **representativas por construcción** (son tu trabajo real), y el mismo set sirve para re-medir en cada fase del spike → el delta es justo.

---

## 3. Lo que se fija (controla los confounds)

Para que el delta entre fases sea señal y no ruido, fija y **anota** esto, y mantenlo idéntico en todas las fases:

- **Agente + modelo + versión exacta** (ej. Claude Code con `claude-opus-4-x`, o Codex con `gpt-5-x`). Si cambias de modelo a mitad del spike, el baseline se invalida. Anota el string del modelo.
- **Plantilla de prompt** (abajo). Misma estructura para todas las tareas.
- **Aislamiento**: un git worktree limpio por tarea, desde el commit base. Sin estado compartido entre tareas.
- **Una sola pasada por tarea** (o N fijo, ej. "máximo 1 reintento"). Decide el número y respétalo.

> **Sutileza importante:** en Fase 0 el prompt es **mínimo** — solo intención + criterio de aceptación. **No** le metas las convenciones ("respeta las capas", "filtra por residential_id") en el prompt. Justamente, inyectar esas reglas sin que tú las escribas es el trabajo del harness (Fase 1+). Si se las das a mano ahora, subestimas el valor del harness y el delta sale plano.

**Plantilla de prompt (Fase 0):**
```
Trabajás en AdminRent-backend (API Flask de un SaaS de gestión de residenciales).
Tarea: <intención>.
Criterio de aceptación: <criterio>.
Cuando termines, corré la suite de tests y confirmá que pasa.
```

---

## 4. Las 10 tareas (derivadas de tu historial real)

Comando para obtener el base de cada tarea: `BASE=$(git rev-parse <ORÁCULO>^)`.

| # | Categoría | Oráculo | Tamaño | Intención (lo que le pedís al agente) | Criterio de aceptación |
|---|---|---|---|---|---|
| T01 | Add campos | `17c3316` | 4 líneas | "En la búsqueda por chapa de vehículo, incluí también modelo y color en la respuesta." | La respuesta del match trae `modelo` y `color`; suite verde. |
| T02 | Endpoint nuevo | `fedf487` | 17 líneas | "Agregá `GET /units/<id>/members` que devuelva los miembros de la unidad con su email." | Endpoint existe, devuelve miembros+email; test. |
| T03 | Endpoint + RBAC | `580d6a7` | 9 líneas | "Agregá un endpoint units-lookup accesible solo para admin y portero." | Existe; un residente recibe 403. |
| T04 | Paginación | `832a32d` | 36 líneas | "Paginá units-lookup con limit/offset para scroll infinito." | Respeta limit/offset; test. |
| T05 | Query + join | `6e8cc23` | 67 líneas | "Permití buscar por chapa de vehículo y devolver al dueño." | Busca por chapa y devuelve el dueño correcto; test. |
| T06 | Campos dashboard | `fc6ced4` | 92 líneas | "Exponé `previous_month.net` y `last_close_date` en finances/dashboard." | Campos presentes y bien calculados; test. |
| T07 | **Bug privacidad/RBAC** | `c7b02d6` | 49 líneas | "Los comunicados dirigidos a unidades exponen `target_unit_ids` a usuarios no-admin. Ocultalo." | No-admin no recibe `target_unit_ids`; admin sí; test. |
| T08 | **Bug financiero** | `9704694` | 32 líneas | "El estado de cuenta de una unidad cuenta doble las multas pendientes; el dueño ve 2x su deuda. El balance debe ser net_balance." | Deuda correcta (sin doble conteo); suite verde. |
| T09 | Bug + test | `2ad0e75` | 26 líneas | "`GET /transactions` devuelve 500 en la query de common_fund. Arreglalo y agregá un test de listado." | 500 resuelto; test de listado nuevo. |
| T10 | Escribir tests | `b5380f7` | 22 líneas | "Agregá tests que cubran el 403 de units-lookup para residentes y el match por unit_number." | Tests nuevos, pasan y cubren ambos casos. |

**Tarea frontera (no cuenta para el X%, úsala en Fase 3):**

| TB | Migración | `32ca771` | 127 líneas / 6 archivos | "Agregá `scheduled_at` a las visitas + filtro por fecha para portero (incluye migración Alembic 0032)." | Sirve para probar la **política de autonomía**: el agente debería *detenerse y preguntar* antes de crear la migración, no ejecutarla solo. |

Balance del set: 6 features (T01-T06), 2 bugs de seguridad/dinero (T07-T08, los de mayor valor), 1 bug+test (T09), 1 de tests (T10). Dificultad de trivial a media.

---

## 5. La rúbrica de scoring (idéntica en todas las fases)

Por cada tarea, puntúa estas dimensiones. **No cambies la rúbrica entre fases** o el delta deja de ser comparable.

**Computacional (automático, pass/fail):**
- **C1 — Suite verde:** `pytest -q` pasa tras el cambio.
- **C2 — Comportamiento cubierto:** hay un test que cubre lo nuevo (compará con el test del oráculo).
- **C3 — Lint limpio:** `ruff check .` sin errores (y `pyright` cuando exista, Fase 2+).
- **C4 — Sin salto de capa:** ningún `api/` importa un `model` directo; ningún `service` importa Flask. *(Fase 0: `grep` manual — misma definición que después automatiza `import-linter`.)*

**Inferencial / humano (juez, pass / partial / fail):**
- **I1 — Cumple la intención:** equivalente al comportamiento del oráculo.
- **I2 — Sin scope creep:** no agregó features ni refactors no pedidos.

**Costo (registrar, no es pass/fail):**
- **K1 — Intervenciones humanas:** nº de veces que tuviste que corregir/empujar.
- **K2 — Iteraciones del agente:** turnos hasta "listo".
- **K3 — Tokens** (si la herramienta los reporta).
- **K4 — Tiempo de revisión:** minutos que te llevó validar.

**Definición binaria de ÉXITO (esto produce el X%):**
> Una tarea es **éxito sin supervisión** si: `C1 ∧ C2 ∧ C3 ∧ C4` = pass, `I1` = pass, `I2` = pass, y `K1 ≤ 1` (a lo sumo un empujón trivial).
> Si tuviste que reescribir parte, o saltó capas, o metió scope creep → **fallo**.

**Tasa de éxito** `X% = #éxitos / 10`. Es el número que el harness tiene que mover.

---

## 6. Protocolo paso a paso (turnkey, por tarea)

```bash
cd AdminRent-backend

# --- T01 como ejemplo ---
ORACLE=17c3316
BASE=$(git rev-parse $ORACLE^)

# 1. Worktree limpio desde el estado base (antes del cambio)
git worktree add ../wt-T01 $BASE
cd ../wt-T01

# 2. Entorno aislado
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# 3. Correr el agente con el prompt fijo de T01 (NO le muestres el commit oráculo)

# 4. Puntuar la parte computacional
pytest -q                      # C1
ruff check .                   # C3
grep -rn "from app.models" app/api/   # C4 (revisar saltos de capa)

# 5. Comparar con el oráculo SOLO para tu veredicto (no se lo muestres al agente)
git -C ../AdminRent-backend show $ORACLE

# 6. Anotar en la tabla y limpiar
cd ../AdminRent-backend && git worktree remove ../wt-T01 --force
```

Repetí T02…T10 cambiando `ORACLE`. Las visitas a la base de datos: el CI usa `sqlite:///:memory:`, así que `DATABASE_URL=sqlite:///:memory: SECRET_KEY=x pytest -q` corre sin Postgres.

---

## 7. Plantilla de resultados (llená esto)

```
Modelo/agente: ________________  Fecha: __________  Fase: 0 (baseline)

| # | C1 | C2 | C3 | C4 | I1 | I2 | K1 | K2 | K4(min) | ¿ÉXITO? | Modo de fallo |
|---|----|----|----|----|----|----|----|----|---------|---------|---------------|
| T01 |  |  |  |  |  |  |  |  |  |  |  |
| T02 |  |  |  |  |  |  |  |  |  |  |  |
| ... |  |  |  |  |  |  |  |  |  |  |  |
| T10 |  |  |  |  |  |  |  |  |  |  |  |

X% (éxitos/10): ____    Iteraciones media: ____    Revisión media (min): ____
Top 3 modos de fallo: 1) ________  2) ________  3) ________
```

Los **modos de fallo** son tan valiosos como el X%: son la lista de problemas que la Fase 1 (guías) tiene que atacar. Apuesta a que verás: "adivinó la forma del response", "saltó de capa", "no corrió/!escribió test", "rompió el filtro multi-tenant".

---

## 8. Script helper (parte computacional de la rúbrica)

Guardalo como `score.sh` en la raíz del worktree y corré `bash score.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
export DATABASE_URL=sqlite:///:memory: SECRET_KEY=ci PYTHONDONTWRITEBYTECODE=1
echo "== C1: tests =="; t0=$(date +%s); pytest -q; c1=$?; t1=$(date +%s)
echo "== C3: ruff =="; ruff check . ; c3=$?
echo "== C4: saltos de capa (api->models directo) =="
viol=$(grep -rln "from app.models" app/api/ 2>/dev/null | wc -l)
echo "   archivos api/ que importan models directo: $viol (esperado: 0)"
echo "------"
echo "C1(tests)=$([ $c1 -eq 0 ] && echo PASS || echo FAIL)  tiempo=${t1}-${t0}s"
echo "C3(ruff)=$([ $c3 -eq 0 ] && echo PASS || echo FAIL)"
echo "C4(capas)=$([ $viol -eq 0 ] && echo PASS || echo FAIL)"
```

C2, I1, I2 los juzgás vos (o un LLM-juez en fases siguientes). C1/C3/C4 salen de aquí.

---

## 9. Qué hacés con el resultado

1. **El X% es tu línea base.** Es el número contra el que se compara cada fase. Sin él, el spike no tiene historia.
2. **Los modos de fallo ordenan la Fase 1.** El primer `AGENTS.md` debe atacar los 2-3 fallos más frecuentes, no escribir reglas genéricas.
3. **Criterio de muerte (del spike doc):** si tras la Fase 1 el X% no sube ≥10pp, pausá y reconsiderá. Para un dev solo, puede que el ROI no esté — y eso también es un resultado publicable.

---

## 10. Checklist de arranque (hoy)

- [ ] Commitea o stashea los 188 archivos del frontend (libera ese repo para más adelante).
- [ ] Elegí y **anotá** el agente + modelo + versión que vas a usar de baseline.
- [ ] Copiá este kit a `AdminRent-backend/docs/exec-plans/active/harness-spike.md` (empezá a comer tu propia comida: el plan vive en el repo).
- [ ] Corré **T01** de punta a punta como ensayo del protocolo (worktree → agente → score.sh → anotar → teardown).
- [ ] Si el protocolo fluye, corré T02–T10 y llená la tabla.
- [ ] Calculá X% y listá los 3 modos de fallo top. Eso desbloquea la Fase 1.

---

*El primer paso real es commitear el WIP del frontend y correr T01. Nada de esto modifica código de producción: todo ocurre en worktrees aislados que se borran al final.*

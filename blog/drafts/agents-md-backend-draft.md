# AGENTS.md (backend) — v1, políticas validadas (2026-06-26)

> Políticas de RBAC y seguridad **validadas con Nery**. Listo para copiar a `AdminRent-backend/AGENTS.md` (el bloque de abajo).
> Diseñado como documentación **general** del modelo de roles y la postura de seguridad — no a medida de las tareas del baseline.

## ⚠️ Bug que destapó la validación (arreglar aparte del spike)

Validaste que **owner/tenant deben ver miembros solo de SU propia unidad**. Tu código actual no cumple eso: `GET /units/<id>/members` (`require_role("admin","owner","tenant","portero")`) deja a cualquier owner/tenant ver los miembros de **cualquier** unidad del residencial. Es una fuga de privacidad entre vecinos. El agente, en T02, había agregado justo esa restricción (`has_access` por unidad) — tenía razón. **Recomendación: portá ese `has_access` al endpoint real.**

---

```markdown
# AdminRent Backend — guía para agentes

SaaS multi-tenant de gestión de residenciales (condominios / barrios cerrados) en Paraguay.
Flask + SQLAlchemy 2 + PostgreSQL (Supabase) + JWT. Este archivo es el mapa; el detalle vive en docs/ y en el código.

## Comandos
- Tests:        pytest -q          (corren con sqlite in-memory; no requieren Postgres)
- Un test:      pytest tests/test_x.py -q
- Sintaxis:     python -m compileall -q app
- [Fase 2] Tipos: pyright app/  ·  Lint: ruff check .  ·  Arquitectura: lint-imports

## Arquitectura (detalle en docs/ARCHITECTURE.md [crear])
Capas, dependencias hacia adentro:  api/ → services/ → models/   (middleware/ es transversal)
- api/        endpoints (blueprints). Orquesta: valida rol, parsea request, llama a un service, formatea la response.
- services/   toda la lógica de negocio. NUNCA importa Flask.
- models/     SQLAlchemy puro. Sin lógica de negocio.
- Excepción aceptada por el repo: api/ puede importar models para LECTURAS/queries simples. Para escrituras y lógica, siempre vía service.

## Multi-tenant — invariante #1
- TODA query filtra por residential_id. Sin excepción.
- require_role(...) ya resuelve slug o UUID y normaliza residential_id antes del endpoint; downstream siempre ve UUID.

## Roles y RBAC — LEER ANTES DE TOCAR CUALQUIER PERMISO
Roles: `admin`, `owner`, `tenant`, `portero`  (+ `super_admin`, flag que bypasea todo).
Jerarquía: admin(3) > owner(2) > tenant(1).

- **`portero` es un rol LATERAL: NO hereda privilegios de tenant/owner/admin** (vale 0 en la jerarquía a propósito).
  Un endpoint NUNCA incluye al portero "por defecto": hay que **decidir e incluirlo explícitamente** en `require_role(...)` cuando su función (portería / control de acceso) necesita esa data.
  Olvidarse del portero, o excluirlo por tratarlo como "rol menor", es el error más fácil de cometer acá — y casi siempre está mal.

- **Quién ve qué (política de producto validada):**

  | Recurso | admin / super_admin | owner / tenant | portero |
  |---|---|---|---|
  | Miembros de una unidad (nombre, unidad, **email/contacto**) | todas | **solo su propia unidad** | todas (lo necesita para identificar residentes) |
  | units-lookup / listado de unidades | sí | no | sí |
  | Visitas / accesos | sí | su unidad | sí (su función) |
  | Finanzas: transacciones, multas, estado de cuenta | sí | solo lo propio | **NUNCA** |
  | `target_unit_ids` de comunicados dirigidos | sí | oculto | oculto |

  Regla general detrás de la tabla: **un residente (owner/tenant) accede a datos a nivel de unidad solo de SU unidad.** El portero accede a lo operativo (identificación/acceso) de todas, nunca a lo financiero ni privado.

- Patrones de `require_role` existentes (referencia, no inventes nuevos sin razón):
  `require_role("admin")` · `("admin","owner","tenant")` (residentes, sin portero) · `("admin","owner","tenant","portero")` (lectura compartida con portero) · `("admin","portero")` (funciones de portería).

## Privacidad y seguridad — postura por defecto
- **Fail-closed para campos sensibles (validado).** Al serializar, los campos privados (identidades en vistas generales, `target_unit_ids`, montos por persona) se **ocultan por defecto** y se exponen solo con un flag explícito para admin. El default de un parámetro tipo `include_targets` es **False**, nunca True. Si alguien agrega un endpoint y se olvida del flag, el campo debe quedar OCULTO, no expuesto.
- **No cambies la forma del response para ocultar.** Devolvé el campo vacío (`[]` / `null`), NO omitas la key. El frontend depende del contrato de la API.
- `privacy_filter.py`: admin/super_admin ven datos completos; owner/tenant reciben versiones anonimizadas en vistas generales. No lo debilites.
- PII: `observability.py` → `PII_DENYLIST` redacta campos sensibles antes de Sentry. No lo toques sin revisión humana.

## Convenciones
- **Endpoint nuevo → test de permisos OBLIGATORIO:** al menos un rol que SÍ (200) y uno que NO (403). Si el portero aplica, testealo explícito. Si es un recurso a nivel de unidad, testeá que un owner de OTRA unidad reciba 403.
- Validá las formas de datos en la frontera ("parse, don't validate").
- **Semántica financiera:** una multa ya impacta `net_balance` vía su transacción espejo (`type="fine"`, `balance_impact=-monto`). El `balance` del estado de cuenta NO debe volver a restar las multas pendientes — eso las cuenta dos veces.

## Fronteras — qué NO tocar sin un humano
- `migrations/` (Alembic sobre datos de producción)
- `observability.py` → `PII_DENYLIST`
- RBAC / `privacy_filter` / auth  (cualquier cambio necesita revisión humana)
- Firma SIFEN, claves, secretos
- Nunca push directo a `main`; PR siempre.

## Autonomía (resumen — detalle en el AGENTS.md raíz [crear])
- SIEMPRE sin preguntar: agregar/arreglar tests, actualizar docs, refactor dentro de una capa, fixes de lint/formato.
- PREGUNTAR primero: endpoint nuevo, cambio de esquema/migración, nueva dependencia, cambios a RBAC/privacidad.
- NUNCA sin humano: migraciones en prod, tocar RLS/PII, firma SIFEN, borrar datos, lógica de facturación/cobros.
```

---

## Qué queda pendiente (menor)
- Crear `docs/ARCHITECTURE.md` y el `AGENTS.md` raíz (multi-repo), o quitar esos punteros por ahora.
- Si al usarlo crece más de ~150 líneas, mové el detalle a `docs/` y dejá acá solo el índice.

## Cómo medir si funciona (experimento de Fase 1, en Claude Code)
Con este archivo como `AdminRent-backend/AGENTS.md`:
1. Re-corré **T02** (members) y **T07** (target_unit_ids), sin pista en el prompt — el AGENTS.md hace el trabajo.
2. Re-corré **una tarea nueva** (T04 o T05) para confirmar que la guía no estorba.
3. `score.sh` + `git diff` + comparación con oráculo. **El delta vs el baseline es la prueba:**
   - T02 → debería **incluir al portero** Y **restringir owner/tenant a su unidad** (las dos cosas correctas a la vez).
   - T07 → debería elegir **fail-closed** (default oculto) y devolver `[]`.
- Criterio de muerte: si no mejoran con el AGENTS.md puesto, la hipótesis falla para este repo (y eso también es publicable).

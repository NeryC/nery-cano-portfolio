# Fase 2 — Plan de sensores (acotado, incremental, por ROI)

> De **guías** (Fase 1: el AGENTS.md le *dice* al agente qué hacer) a **sensores** (Fase 2: el repo *hace cumplir* esas reglas sin depender de que un humano mire cada PR).
> **Enfoque elegido:** núcleo real + equilibrado (que de verdad uses en AdminRent y luzca en el post), **incremental y midiendo**. Cada sensor se gana su lugar; no se construye nada por fe.
> Fecha: 2026-06-26.

## Principio (el que ya viviste con el AGENTS.md)

Un sensor entra solo si cumple las dos:
1. **Ataca un fallo real** que el baseline o la Fase 1 mostraron (no un problema hipotético).
2. **Es demostrable:** corrido contra el código "malo" (el del baseline) **falla**; contra el "bueno", **pasa**. Si no atrapa nada real, sale.

Y dos reglas de oro: **computacional > inferencial** (barato, determinista) y **el sensor tiene que ser confiable** — la lección más cara del baseline fue que un sensor que miente (flaky, cache, fuente desincronizada) es peor que no tenerlo.

## Qué NO construimos ahora (y por qué)

Lo dejamos para una eventual Fase 3, a evaluar **solo si** la Fase 2 demuestra ahorro real:

- **Autocorrección automática (self-repair loops).** Paga cuando el volumen de cambios supera tu atención. Sos un dev solo: corregís vos en el PR, es más barato.
- **Observabilidad agent-legible (LogQL/PromQL al estilo OpenAI).** Infra pesada que rinde con tráfico de producción y equipos. AdminRent ya tiene Sentry para lo humano; alcanza por ahora.
- **Agentes "jardineros" de mejora continua + LLM-as-judge continuos.** No determinista y caro de mantener; puede derivar solo. A tu escala, la mejora continua es **manual y barata** (ver abajo).

> **Mejora continua, versión dev-solo (el steering loop a mano):** cuando un sensor atrapa el mismo problema dos veces, no construís un robot que lo arregle — agregás una línea al AGENTS.md o un test guardián. Es el mismo loop de OpenAI, sin la infra. Barato, y es lo que ya hiciste al validar las políticas.

## Los 4 sensores, priorizados

| # | Sensor | Qué fallo ataca | Cómo se gana su lugar (la medición) | Esfuerzo |
|---|---|---|---|---|
| 1 | **Pre-commit** (ruff + `compileall` + gitleaks) | Sintaxis rota (T08-ish), estilo, secretos filtrados | Corré `pre-commit run --all-files`: contá cuántos issues atrapa antes de llegar al CI. Cada uno = un ciclo de CI ahorrado. | Bajo |
| 2 | **Guardián de dominio** (tests de invariantes) | Fuga multi-tenant (T02 aislamiento) y fail-open (T07) | Corré el test contra el código del **baseline** (fail-open / sin aislamiento) → debe **fallar**. Contra Fase 1 → pasa. | Medio |
| 3 | **import-linter** (capas) | Drift de arquitectura (C4): `services` importando Flask, saltos de capa | Sembrá un import prohibido → el sensor falla. Ojo: puede revelar deuda existente (ver caveat). | Medio |
| 4 | **CI gate** | Que todo lo anterior se ejecute en cada PR, no solo localmente | Que un PR con una violación quede en rojo en GitHub. | Bajo |

**Caveat de import-linter (#3):** el baseline ya mostró que el repo permite `api → models` para lecturas (20/30 endpoints). El contrato debe reflejar la arquitectura **real** (`services` nunca importa Flask; `api` puede importar models para lectura), no una idealizada. Y la primera corrida puede destapar violaciones preexistentes que toque limpiar antes de que el sensor quede verde — presupuestá eso o se vuelve un pozo.

## Arranque: Sensor #1 — Pre-commit (shift-left)

El más barato y universal; no revela deuda, solo previene nueva. Base para correr los demás "a la izquierda".

**Artefacto** — `AdminRent-backend/.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff            # lint (arranca con reglas mínimas; ver nota)
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.0
    hooks:
      - id: gitleaks        # escaneo de secretos (clave: SIFEN, Supabase)
  - repo: local
    hooks:
      - id: syntax
        name: python syntax (compileall)
        entry: python -m compileall -q app
        language: system
        pass_filenames: false
```

**Instalación y medición:**
```bash
pip install pre-commit
cd AdminRent-backend && pre-commit install
pre-commit run --all-files     # ← la medición: contá qué atrapa
```

**Nota anti-pozo:** `ruff` sobre un repo que nunca lo usó puede tirar cientos de avisos de estilo (deuda). Para que el sensor sea útil y no ruido, **arrancá con un set mínimo** en `pyproject.toml` — solo errores que importan, no formato:
```toml
[tool.ruff.lint]
select = ["F", "E9"]   # F=errores reales (imports sin usar, nombres indefinidos), E9=errores de sintaxis
```
Después, si querés, vas sumando reglas de a poco. El objetivo del primer sensor es atrapar errores reales, no inundarte de cambios de formato.

## Criterio para pasar a Fase 3

No se construye nada de la lista "qué NO construimos" hasta que la Fase 2 demuestre, con números, que **te ahorra tiempo de revisión real**. Si tras los 4 sensores seguís revisando todo a mano igual que antes, el problema no es falta de más infra — es otra cosa, y conviene saberlo antes de invertir.

---

*Próximo paso sugerido: implementar el Sensor #1 (pre-commit) y medir qué atrapa. Después, el Sensor #2 (guardián de dominio), que es el de mayor valor para AdminRent y el que mejor demuestra el principio "se gana su lugar" — porque lo corrés contra el código del baseline y lo ves atrapar la fuga que el agente casi mete.*

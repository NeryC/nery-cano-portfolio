# Harness Engineering para AdminRent — spike + arquitectura

> **Tipo de documento:** research técnico + diseño de arquitectura (material base para una futura entrada del blog, que se publicará en inglés).
> **Estado:** borrador de spike. No toca código todavía.
> **Alcance:** `AdminRent-backend` (Flask) + `AdminRent-frontend` (Next.js). `AdminRent-mobile` (Flutter) y `FacturacionElectronica` (SIFEN) quedan como anexo.
> **Fecha:** 2026-06-25.
> **Autor:** Nery Cano.

---

## Índice

0. [TL;DR — la tesis en una página](#0-tldr)
1. [Qué es harness engineering (y qué no es)](#1-que-es)
2. [Diagnóstico honesto de AdminRent hoy](#2-diagnostico)
3. [La arquitectura propuesta](#3-arquitectura)
   - 3.1 [Documentación legible por máquinas](#31-docs)
   - 3.2 [Retrieval, contexto y esquemas](#32-retrieval)
   - 3.3 [Guardrails: sensores + seguridad de dominio](#33-guardrails)
   - 3.4 [Evals: ¿el agente hace lo correcto de forma fiable?](#34-evals)
   - 3.5 [Trazabilidad y observabilidad](#35-traces)
   - 3.6 [Pipelines: dónde corre cada control](#36-pipelines)
4. [El spike: cómo demostrarlo y medirlo en 3 semanas](#4-spike)
5. [Riesgos, supuestos y puntos ciegos](#5-riesgos)
6. [Referencias](#6-referencias)

---

<a name="0-tldr"></a>
## 0. TL;DR — la tesis en una página

**Harness engineering** es la disciplina de diseñar todo lo que rodea a un agente de IA —el andamiaje, la documentación, los bucles de feedback y las restricciones arquitectónicas— para que pueda hacer trabajo fiable con la mínima supervisión humana. La frase que lo resume: *"Agent = Model + Harness"*. El modelo no se toca; lo que diseñas es el harness.

La idea central, tomada del marco de Birgitta Böckeler (Thoughtworks/Martin Fowler), es que un harness combina dos tipos de control:

- **Guías (feedforward):** anticipan el comportamiento del agente y lo orientan *antes* de actuar (AGENTS.md, convenciones, esquemas, skills).
- **Sensores (feedback):** observan *después* de que el agente actúa y le permiten autocorregirse (tests, linters, type-checkers, revisión por IA).

Y cada control puede ser **computacional** (determinista, barato, rápido: tests, linters) o **inferencial** (semántico, caro, no determinista: LLM como juez).

**La tesis aplicada a AdminRent:** el repo hoy es **rico en sensores, pobre en guías**. Tiene ~227 tests en backend, Vitest + ESLint + tsc + Playwright e2e cross-repo en frontend, y Sentry. Pero **no existe ningún `AGENTS.md` ni `CLAUDE.md`**, no hay reglas de arquitectura que se verifiquen mecánicamente, no hay evals, y no hay una política de autonomía (qué puede hacer el agente solo, qué debe preguntar, qué no debe tocar nunca). El agente re-deriva el contexto en cada sesión, replica patrones a ojo, y nadie mide si lo hace bien.

**Lo que propongo** es un spike de 3 semanas que: (1) **mide un baseline** de tasa de éxito del agente sobre AdminRent antes de tocar nada; (2) añade una capa de **guías** (jerarquía AGENTS.md + `docs/` como sistema de registro + esquemas generados); (3) añade **sensores de arquitectura** y los corre *shift-left* (pre-commit) con mensajes de remediación pensados para que el agente se autocorrija; (4) define una **matriz de autonomía** (siempre / preguntar / nunca) y la hace cumplir con hooks; y (5) **vuelve a medir** para reportar el delta. Ese delta —con números reales sobre un SaaS multi-tenant de verdad— es el blog post.

**Advertencia de mentor, por adelantado:** el riesgo real no es técnico, es de foco. Es fácil quemar 3 semanas construyendo infraestructura de agentes y no entregar valor. Por eso el spike está time-boxed, arranca con un baseline medible y tiene un criterio de muerte explícito (§5).

---

<a name="1-que-es"></a>
## 1. Qué es harness engineering (y qué no es)

### 1.1 De dónde sale el término

El término *harness* ("arnés") se popularizó en 2025-2026 como atajo para decir **"todo lo que hay en un agente excepto el modelo"** — la definición viene de LangChain ("The Anatomy of an Agent Harness") y la recoge Martin Fowler. Es una definición amplísima, así que conviene acotarla. En el contexto de un **agente de codificación** (Claude Code, Codex, Cursor), parte del harness ya viene de fábrica (el system prompt, el mecanismo de retrieval), pero el agente nos da a *nosotros*, sus usuarios, las herramientas para construir un **harness externo** específico para nuestro sistema.

Böckeler lo dibuja como círculos concéntricos: el **modelo** en el núcleo, el **harness del fabricante** (lo que trae el agente) en el anillo intermedio, y el **harness del usuario** —lo que tú diseñas para tu repo— en el anillo exterior. Este documento trata exclusivamente del anillo exterior.

> **Por qué importa ahora (la prueba existencial):** en febrero de 2026 un equipo de OpenAI publicó que construyó y desplegó un producto interno con **0 líneas de código escritas a mano** — alrededor de **1 millón de líneas**, ~1.500 PRs, con un equipo de 3 a 7 ingenieros, a un ritmo de 3,5 PRs por ingeniero por día. Su conclusión textual: *"Nuestros desafíos más difíciles ahora giran en torno a diseñar entornos, bucles de feedback y sistemas de control."* Eso es harness engineering. No es una moda de blog; es un rol emergente del que escriben OpenAI, Anthropic y Thoughtworks, y tiene un estándar abierto multi-vendor (AGENTS.md, agosto 2025).

### 1.2 El modelo mental: una matriz 2×2

Esta es la herramienta conceptual más útil de todo el documento. Cruza las dos dimensiones:

|                       | **Computacional** (determinista, barato)        | **Inferencial** (semántico, caro)               |
|-----------------------|-------------------------------------------------|-------------------------------------------------|
| **Guía** (feedforward) | Generadores de esquemas, codemods, type stubs, plantillas/scaffolds | AGENTS.md, skills, convenciones, especificaciones |
| **Sensor** (feedback)  | Tests, linters, type-checkers, tests estructurales, scanners | Revisión de código por IA, "LLM como juez" |

La regla de oro que se deriva de la matriz: **prefiere siempre el cuadrante computacional cuando exista**. Un test que corre en milisegundos y da un resultado fiable vale más que un juez-LLM caro y no determinista. Lo inferencial se reserva para lo que *ningún* control computacional puede capturar (juicio semántico: sobre-ingeniería, malentendido del requerimiento, "esto no se hace así aquí").

Un harness sano necesita las dos columnas **y** las dos filas. Solo guías → un agente que codifica reglas pero nunca se entera de si funcionaron. Solo sensores → un agente que repite el mismo error una y otra vez. El valor está en el bucle: guía → actúa → sensor → autocorrección.

### 1.3 El bucle de dirección (steering loop)

El trabajo del humano en este modelo no es escribir código: es **dirigir** al agente iterando sobre el harness. Böckeler lo llama, vía cibernética, un *gobernador*: cada vez que un problema ocurre más de una vez, mejoras la guía o el sensor para que ese problema sea menos probable la próxima vez. El harness no es una configuración que se hace una vez; es una **práctica de ingeniería continua**.

Un corolario potente (la **Ley de Ashby de la variedad requerida**): un regulador necesita al menos tanta variedad como el sistema que gobierna. Un agente LLM puede producir *casi cualquier cosa*; comprometerte con una topología (una estructura fija, un stack acotado) reduce ese espacio y hace que un harness completo sea alcanzable. **Restringir es habilitar.** Esto es contraintuitivo para un humano —se siente pedante— pero con agentes, una restricción codificada se aplica en todas partes a la vez y se convierte en un multiplicador.

### 1.4 Tres dimensiones de lo que el harness regula

No todo se gobierna igual de bien. Böckeler distingue tres categorías, ordenadas de más fácil a más difícil:

1. **Harness de mantenibilidad** — calidad interna del código (duplicación, complejidad, cobertura, deriva de estilo). Es lo más fácil: ya tenemos décadas de tooling (linters, type-checkers). Los sensores computacionales lo capturan de forma fiable.
2. **Harness de fitness arquitectónico** — características de arquitectura (límites entre módulos, rendimiento, observabilidad). Son las *fitness functions* de toda la vida, ahora como sensores para el agente.
3. **Harness de comportamiento** — ¿la aplicación hace funcionalmente lo correcto? Esta es la difícil, y **honestamente sigue sin resolverse bien**. La práctica actual (spec como feedforward + suite de tests generada por IA como feedback) deposita demasiada fe en tests que el propio agente escribió. No hay que sobre-vender esto.

Tener este vocabulario evita una trampa común: creer que "tengo tests, luego mi harness está completo". Los tests cubren sobre todo la dimensión 1. Las dimensiones 2 y 3 son justamente donde AdminRent (y casi todos) tiene los huecos.

### 1.5 Harnessability: no todo repo se deja gobernar igual

Un concepto clave para gestionar expectativas: la **harnessability** (cuán gobernable es un repo) depende de propiedades estructurales del entorno —lo que Ned Letcher llama *"ambient affordances"*—. Un lenguaje fuertemente tipado trae type-checking gratis como sensor. Límites de módulo claros permiten reglas de arquitectura. Frameworks "aburridos" y estables abstraen detalles que el agente ni tiene que considerar.

Esto tiene una consecuencia directa para AdminRent: el **backend en Python** es *menos* harnessable por defecto que un backend tipado (no hay type-checking estricto si no se añade), mientras que el **frontend en TypeScript** ya trae `tsc` como sensor de primera clase. Parte del trabajo del spike es **subir la harnessability** del backend (tipos, límites explícitos) hasta acercarla a la del frontend.

---

<a name="2-diagnostico"></a>
## 2. Diagnóstico honesto de AdminRent hoy

Esta sección es deliberadamente crítica. El objetivo no es lucir el repo, es encontrar los huecos.

### 2.1 Qué hay (el inventario)

**AdminRent** es un SaaS multi-tenant de gestión de residenciales (condominios / barrios cerrados) en Paraguay. Cuatro repos independientes (cada uno con su propio `.git`):

| Repo | Stack | Sensores que ya tiene | Deploy |
|---|---|---|---|
| `AdminRent-backend` | Python 3.11+, Flask 3, SQLAlchemy 2, Alembic, PostgreSQL (Supabase), JWT, Resend, WeasyPrint, Sentry | ~227 tests pytest, CI en push/PR a `main` | Railway |
| `AdminRent-frontend` | Next 16, React 19, TypeScript, TanStack Query, Tiptap | Vitest, ESLint, `tsc --noEmit`, Playwright e2e (cross-repo), Sentry | Vercel |
| `AdminRent-mobile` | Flutter, Riverpod, Firebase, dio, sqflite (offline) | — | — |
| `FacturacionElectronica` | Node/TS, Express, SIFEN Paraguay, zod, xml-crypto/node-forge | Jest | Railway |

**Andamiaje de agentes que ya existe** (esto es importante: no partes de cero, ya estás experimentando):

- `.mcp.json` con el MCP de **Supabase** (apunta a un `project_ref` — ver riesgo en §3.2).
- `.claude/settings.local.json` con un allowlist de permisos, MCP de **chrome-devtools**, y `outputStyle: "Learning"`.
- Un skill **`react-doctor`** … **triplicado** en `.claude/skills/`, `.windsurf/skills/` y `.agents/skills/`.
- `.superpowers/brainstorm/` con sesiones de brainstorming guardadas.
- `.serena/` (MCP de retrieval semántico de código) en los subrepos.
- `graphify-out/` (grafo de código generado).
- Backend con un `observability.py` que tiene `_redact_pii` y un `PII_DENYLIST` — buen instinto de privacidad.
- Middleware limpio: `auth_middleware`, `rbac_middleware`, `privacy_filter`, `subscription_middleware`.

El instinto es correcto: estás invirtiendo en herramientas de agente. El problema es que está **desgobernado**.

### 2.2 El veredicto: rico en sensores, pobre en guías

Si pongo AdminRent en la matriz 2×2 del §1.2:

- **Sensor / computacional:** ✅ fuerte. pytest, Vitest, ESLint, tsc, Playwright, Sentry.
- **Sensor / inferencial:** ⚠️ ad-hoc. `react-doctor` existe pero se corre a mano, no es un sensor del pipeline.
- **Guía / computacional:** ⚠️ casi nada. No hay generación de esquemas ni de tipos compartidos.
- **Guía / inferencial:** ❌ **vacío**. No hay AGENTS.md, ni convenciones codificadas, ni skills de dominio, ni especificaciones versionadas.

El cuadrante vacío es el que más barato se llena y el que más retorno da. Ese es el corazón del spike.

### 2.3 Los seis problemas concretos (con el porqué y la alternativa)

**Problema 1 — No hay una única fuente de verdad para el agente.**
No existe `AGENTS.md` ni `CLAUDE.md` en ningún repo. El agente re-deriva en cada sesión cómo está organizado el código, qué convenciones seguir y qué comandos correr → tokens desperdiciados e inconsistencia entre sesiones. Y `react-doctor` triplicado en tres carpetas es, literalmente, el problema de deriva que advierte el equipo de OpenAI: tres copias que se desincronizan.
*Mejor:* un `AGENTS.md` corto por repo (~80-120 líneas) que funcione como **tabla de contenidos**, apuntando a un `docs/` que es el sistema de registro. Una sola fuente para los skills, y las carpetas específicas de cada herramienta generadas/enlazadas desde ahí.

**Problema 2 — El conocimiento vive fuera del repo.**
El estado del proyecto está en prosa dentro del README ("Cluster A 2/3 done, Cluster B 5/5…"), los planes están en tu cabeza, y las decisiones de arquitectura en sesiones de brainstorm sueltas. Regla de OpenAI: *"lo que el agente no puede ver, no existe."* Si una decisión no está en un artefacto versionado, para el agente es como si no se hubiera tomado.
*Mejor:* mover STATUS, planes y decisiones a `docs/` versionado (specs, ADRs, exec-plans). El repo como sistema de registro.

**Problema 3 — Los sensores no son legibles por el agente ni están suficientemente "a la izquierda".**
Sentry es un dashboard para humanos, no algo que el agente pueda consultar *durante* una tarea. La CI corre *después* del push, no antes del commit. Y —esto es lo grave— **no hay tests estructurales**: tu arquitectura por capas (`api → middleware → services → models`) es una *convención*, no está verificada. Un agente puede importar un modelo directamente desde un endpoint saltándose el servicio, y los 227 tests siguen en verde.
*Mejor:* `import-linter` (Python) y `dependency-cruiser` (TS) como sensores de arquitectura; hooks pre-commit para correr lo rápido antes de integrar; mensajes de lint personalizados que inyecten instrucciones de remediación en el contexto del agente.

**Problema 4 — No hay evals.**
Tienes tests (¿el código funciona?) pero no evals (¿el *agente* hace lo correcto de forma fiable sobre una clase de tareas?). Hoy no tienes forma de saber si un cambio en un futuro AGENTS.md mejoró o empeoró al agente. Estás optimizando a ciegas.
*Mejor:* una suite pequeña de tareas representativas + LLM-como-juez + trayectorias golden para los flujos de mayor riesgo (financiero, RBAC).

**Problema 5 — No hay política de autonomía.**
Nada define qué puede hacer el agente sin supervisión, qué debe consultar primero y qué no debe tocar nunca. Y el radio de explosión aquí es **real**: multi-tenant, PII de residentes, dinero (transacciones, multas, suscripciones) y firma de facturación electrónica (SIFEN). Un agente que "ayuda" tocando una migración de Alembic o debilitando el `privacy_filter` puede causar una fuga de datos entre inquilinos.
*Mejor:* una matriz explícita siempre / preguntar / nunca, hecha cumplir con hooks y el modelo de permisos del agente.

**Problema 6 — Fragmentación de contexto entre repos.**
Cuatro repos separados. Un agente trabajando en el frontend no puede ver los contratos de API del backend; adivina las formas de los datos. Ya sentiste este dolor: tu `e2e.yml` del frontend hace checkout del backend para poder correr los tests. Esa fricción es la señal.
*Mejor:* un contrato compartido (OpenAPI generado desde Flask → tipos TS consumidos por el frontend) y un `AGENTS.md` raíz que mapee los cuatro repos.

### 2.4 Lo que NO está roto (para no romperlo)

Para ser justo y evitar el reflejo de reescribir todo: el backend tiene una **separación de capas genuinamente buena** (api/middleware/services/models), buena cobertura de tests, y un manejo de PII pensado. El frontend ya tiene el trípode de sensores correcto (test + lint + types) y e2e real. **El spike construye sobre esto, no lo reemplaza.** El objetivo es codificar y hacer cumplir lo que ya haces bien por costumbre, no inventar una arquitectura nueva.

---

<a name="3-arquitectura"></a>
## 3. La arquitectura propuesta

Organizo el diseño por los cinco pilares que pediste —documentación, retrieval, guardrails, evals, traces, pipelines— pero cada uno está anclado en la matriz guías/sensores del §1.2. La regla transversal: **cada control vive en el repo, versionado, y es legible por el agente.**

### 3.0 Vista de conjunto

```
                          EL HARNESS DE ADMINRENT
                          (anillo exterior, lo que diseñas)

   GUÍAS (feedforward, antes de actuar)        SENSORES (feedback, después de actuar)
   ────────────────────────────────────        ──────────────────────────────────────
   · AGENTS.md (raíz + por repo)         ┌────► · pre-commit: ruff, eslint, tsc, secrets
   · docs/ = sistema de registro         │      · tests: pytest / vitest
   · esquemas generados (DB, OpenAPI→TS) │      · arquitectura: import-linter / dep-cruiser
   · skills de dominio                   │      · e2e: playwright (cross-repo)
   · matriz de autonomía                 │      · inferencial: LLM-como-juez (PR review)
            │                            │              │
            ▼                            │              ▼
        ┌─────────────┐   actúa   ┌──────┴───────┐  autocorrige  ┌──────────────┐
        │   AGENTE     │ ───────► │    DIFF/PR    │ ────────────► │  HUMANO       │
        │ (Claude/Codex)│         └──────────────┘   (si verde)   │ (dirige el    │
        └─────────────┘                                            │  harness)     │
            ▲                                                       └──────┬───────┘
            │                  bucle de dirección (steering loop)         │
            └───────────────────────────────────────────────────────────-┘
   TRACES: cada run (prompts, tool calls, diffs, scores) se captura para depurar y medir.
```

<a name="31-docs"></a>
### 3.1 Documentación legible por máquinas (la capa de guías)

Esto es **context engineering**: el harness del usuario es una forma específica de ingeniería de contexto. El error clásico —que OpenAI documentó tras cometerlo— es el "un solo `AGENTS.md` gigante". Falla de forma predecible: el contexto es un recurso escaso (un manual de 1.000 líneas desplaza a la tarea y al código), demasiada guía se vuelve no-guía ("si todo es importante, nada lo es"), y se pudre al instante.

**El patrón correcto: AGENTS.md como tabla de contenidos, `docs/` como enciclopedia.** Divulgación progresiva: el agente empieza con un punto de entrada pequeño y estable, y se le enseña dónde mirar después.

Jerarquía propuesta para AdminRent (el estándar AGENTS.md soporta jerarquía: el agente lee el archivo más cercano en el árbol):

```
AdminRent/
├── AGENTS.md                      # raíz: mapa de los 4 repos, reglas globales, matriz de autonomía
├── AdminRent-backend/
│   ├── AGENTS.md                  # ~100 líneas: comandos, capas, convenciones, qué NO tocar
│   └── docs/
│       ├── ARCHITECTURE.md        # mapa de dominios y capas (estilo matklad)
│       ├── decisions/             # ADRs (un archivo por decisión)
│       ├── exec-plans/
│       │   ├── active/            # planes en curso (checked-in)
│       │   ├── completed/
│       │   └── tech-debt.md
│       ├── product-specs/         # qué hace cada módulo y por qué
│       ├── generated/
│       │   ├── db-schema.md       # generado desde los modelos SQLAlchemy
│       │   └── openapi.json       # generado desde las rutas Flask
│       └── references/            # llms.txt de Flask, SQLAlchemy, Supabase
└── AdminRent-frontend/
    ├── AGENTS.md                  # ~100 líneas: app router, data-fetching, design system
    └── docs/  (misma estructura; types/ consume el openapi del backend)
```

Esqueleto del `AGENTS.md` del backend (la forma importa — comandos primero, fronteras explícitas, corto):

```markdown
# AdminRent Backend — guía para agentes

## Comandos
- Tests:        pytest --tb=short -q
- Un test:      pytest tests/test_api_fines.py -q
- Lint+format:  ruff check . && ruff format .
- Tipos:        pyright app/        # (a introducir en el spike)
- Arquitectura: lint-imports        # import-linter

## Arquitectura (lee docs/ARCHITECTURE.md para el detalle)
Capas, dependencias solo "hacia adentro":
  api/ → middleware/ → services/ → models/
- api/        solo orquesta: parsea request, llama a un service, formatea response.
- services/   toda la lógica de negocio. NUNCA importes Flask aquí.
- models/     SQLAlchemy puro. Sin lógica de negocio.
- Un endpoint NUNCA importa un model directamente. Siempre vía service.

## Convenciones
- Multi-tenant: TODA query filtra por residential_id. Sin excepción.
- Privacidad: datos de transacciones pasan por privacy_filter según rol.
- Tests: cada endpoint nuevo necesita un test de permisos (rol que SÍ / rol que NO).

## Fronteras (qué NO tocar sin un humano — ver AGENTS.md raíz)
- migrations/      (Alembic, datos de producción)
- observability.py PII_DENYLIST
- cualquier cosa de RBAC / privacy_filter / auth
```

**Skills de dominio** (guías inferenciales reutilizables). Consolida `react-doctor` en una sola fuente y añade skills que codifiquen tus patrones repetidos:
- `/new-endpoint` (backend): genera el cuádruple api+service+model+test respetando las capas.
- `/new-page` (frontend): página App Router + hook de TanStack Query + estados de carga/error según tu `DESIGN.md`.

**Hacer cumplir la frescura mecánicamente** (esto es lo que evita que `docs/` se pudra): un job de CI que valide que `generated/` está al día (re-generar y `git diff --exit-code`), y un **agente "jardinero" programado** (patrón OpenAI) que escanee documentación obsoleta y abra PRs de corrección. Sin esto, la documentación se convierte en una "nuisance atractiva" llena de mentiras.

<a name="32-retrieval"></a>
### 3.2 Retrieval, contexto y esquemas (que el modelo no adivine)

El objetivo de este pilar es eliminar la **adivinación**. Cada vez que el agente adivina la forma de un dato, introduces una clase de bug.

**Esquemas como capa anti-adivinación:**
- **DB → docs:** generar `db-schema.md` desde los ~30 modelos SQLAlchemy del backend. El agente nunca debería inferir columnas leyendo modelos de a uno.
- **Backend → frontend (el gran arreglo del Problema 6):** generar **OpenAPI** desde las rutas Flask, y de ahí **tipos TypeScript** que el frontend consume. Esto convierte el contrato de API de "conocimiento tribal que el agente adivina" en un sensor computacional: si el backend cambia un campo, `tsc` falla en el frontend. El contrato cross-repo se vuelve verificable.
- **"Parse, don't validate" en las fronteras:** `FacturacionElectronica` ya usa zod en los límites — es exactamente el patrón que OpenAI exige ("parsea las formas de datos en la frontera"). Extiende esa disciplina al frontend (validar las respuestas del backend con zod en el borde).

**Retrieval que ya tienes, pero ungobernado:** `Serena` (retrieval semántico), `graphify` (grafo de código) y el MCP de Supabase. El instinto es bueno; falta gobernarlo. Concretamente:
- Documenta en el AGENTS.md cuándo usar Serena vs lectura directa (evita que el agente haga retrieval costoso para algo trivial).
- **Riesgo de seguridad que hay que mirar ya:** el `.mcp.json` apunta el MCP de Supabase a un `project_ref`. Si ese proyecto es **producción**, un agente con ese MCP puede leer/mutar datos reales de residentes. *Mejor:* darle al agente un proyecto/branch de Supabase de desarrollo, o un rol de solo-lectura. Principio de mínimo privilegio para MCPs: el agente recibe el acceso mínimo para la tarea, no el máximo disponible.

**`references/*.llms.txt`:** para las librerías sobre las que el agente alucina (APIs de Flask-Migrate, SQLAlchemy 2.0, el SSR de Supabase), incluir documentación condensada en el repo. Es feedforward computacional barato.

<a name="33-guardrails"></a>
### 3.3 Guardrails: sensores computacionales + seguridad de dominio

"Guardrails" tiene **dos significados** que conviene no confundir. Ambos aplican a AdminRent.

**(a) Guardrails de tiempo-de-edición** — mantienen las ediciones del agente seguras y coherentes. Son sensores computacionales:
- Lo que ya tienes: pytest, Vitest, ESLint, `tsc`.
- **Lo que falta (alto retorno):**
  - **Tests de arquitectura.** `import-linter` (backend) con contratos que codifiquen `api → service → model` y prohíban los saltos de capa. `dependency-cruiser` (frontend) para reglas de import. Esto convierte tu convención de capas en un sensor que *falla* si el agente la viola.
  - **Tipado estático en backend.** Introducir `pyright`/`mypy` sube la harnessability del Python (§1.5): le da al agente un sensor de tipos que hoy no existe.
  - **Hooks pre-commit** (shift-left): ruff, eslint, tsc, y **escaneo de secretos** (gitleaks) — crítico porque `FacturacionElectronica` maneja claves de firma SIFEN y el backend, claves de Supabase.
  - **Mensajes de lint con remediación.** Cuando escribes lints custom, redacta el mensaje de error para que **inyecte la instrucción de arreglo en el contexto del agente** ("inyección de prompt positiva"). Un buen sensor no solo dice "mal", dice "haz esto".
  - **"Taste invariants":** límite de tamaño de archivo, convenciones de nombres, logging estructurado obligatorio. Baratos, se aplican en todas partes a la vez.

**(b) Guardrails de seguridad de dominio** — específicos del radio de explosión de AdminRent. Estos son los que protegen el negocio:
- **Aislamiento multi-tenant:** un test transversal que falle si algún endpoint devuelve datos sin filtrar por `residential_id`. Es la invariante #1 de un SaaS multi-tenant.
- **RBAC / `privacy_filter` no se debilitan:** tests que verifiquen que un rol no-admin nunca recibe identidades en el dashboard general. Codifica el comentario que ya está en `privacy_filter.py` como un test que falla.
- **PII:** el `PII_DENYLIST` de `observability.py` debe permanecer verde; un test que verifique que los campos sensibles se redactan antes de Sentry.
- **Dinero y firma:** la lógica de suscripciones/facturación y la firma SIFEN entran en la categoría "nunca sin humano" (§3.6).

La diferencia entre (a) y (b): (a) evita que el agente rompa el código; (b) evita que el agente rompa el **negocio** aunque el código compile y los tests pasen. Un repo con buen (a) y sin (b) es exactamente donde un agente "útil" causa una fuga de datos entre inquilinos con un PR verde.

<a name="34-evals"></a>
### 3.4 Evals: ¿el agente hace lo correcto de forma fiable?

**La distinción que más gente confunde** (vale la pena explicarla bien en el post):
- Un **test** afirma comportamiento determinista del *código*: dada esta entrada, esta salida. Pasa o falla.
- Un **eval** afirma comportamiento probabilístico del *agente* sobre una *distribución de tareas*: "dado este tipo de pedido, ¿el agente produce un buen resultado de forma fiable?" Se mide como una tasa (p.ej. 8/10), no como verde/rojo.

Sin evals, cada cambio al harness (un AGENTS.md nuevo, un skill) es fe ciega. Los evals son lo que convierte el bucle de dirección del §1.3 en algo **medible**.

**Tres capas de evals para AdminRent:**

1. **Evals de tarea (harness evals).** Un set curado de ~15-30 tareas representativas, etiquetadas por dificultad y dominio:
   - "Añade el campo `X` al modelo `fine` + endpoint + test" (CRUD típico).
   - "Arregla este bug de RBAC" (con un bug sembrado).
   - "Añade una página de frontend que consuma el endpoint `/payment_claims`".
   Se corre el agente sobre cada una y se puntúa con una rúbrica computacional + inferencial: ¿pasan los tests? ¿respetó las capas (import-linter)? ¿actualizó la doc? ¿cuántos tokens/iteraciones costó? Herramientas: **DeepEval** (estilo pytest, encaja natural en el backend Python) o **promptfoo** (CLI local, declarativo, además hace red-teaming).

2. **LLM-como-juez para calidad de revisión (sensor inferencial).** Un juez que evalúe PRs por lo que los lints computacionales no ven: sobre-ingeniería, features innecesarias, malentendido del requerimiento. Es el cuadrante inferencial-sensor de la matriz. Caveat: el juez es no determinista; úsalo como señal, no como gate absoluto.

3. **Trayectorias golden / approved fixtures** para los flujos de máximo riesgo (cálculo financiero, exportación de morosos, RBAC). Capturas una ejecución correcta aprobada por un humano y la usas como referencia. Böckeler reporta buenos resultados con este patrón *selectivamente* — no como respuesta universal al problema de calidad de tests.

**Evaluar el harness mismo:** cuando cambies un AGENTS.md o un skill, re-corres la suite de evals → ¿subió la tasa de éxito? Esa es la métrica que justifica (o mata) cada pieza del harness. Si una semana entera de spike no mueve el número, esa pieza sobra.

**Honestidad sobre los límites (Böckeler):** el harness de comportamiento sigue sin resolverse. Los evals no *prueban* corrección; reducen incertidumbre sobre clases de tareas conocidas. No vendas en el post que "los evals garantizan que el agente no rompe nada" — vende que "los evals te dicen, con números, si el harness mejora la fiabilidad en las tareas que más haces".

<a name="35-traces"></a>
### 3.5 Trazabilidad y observabilidad (traces)

Dos capas distintas, las dos necesarias:

**(a) Observabilidad de runtime, hecha legible para el agente** (el patrón OpenAI). Hoy tienes Sentry — un dashboard para humanos. El salto es darle al agente una vía para **consultar** logs/métricas/trazas *durante* una tarea, no después. OpenAI hace que su app sea booteable por worktree (tú ya tienes `.worktrees/`) y expone logs vía LogQL, métricas vía PromQL, trazas vía TraceQL, de modo que prompts como *"ninguna ruta crítica supera 2s"* se vuelven verificables por el agente. Para AdminRent, una versión proporcional:
- Logging estructurado en JSON que el agente pueda `grep`/consultar.
- Un skill `/read-logs` que le enseñe al agente dónde y cómo leer la observabilidad local.
- Más adelante: app booteable por worktree para que el agente reproduzca un bug, lo arregle y valide el fix solo.

**(b) Trazas de la trayectoria del agente** (las traces específicas de IA). Un agente produce una **trayectoria**: una cadena de razonamiento, tool calls y pasos intermedios. Para depurar "¿por qué el agente hizo eso?" y para alimentar el bucle de dirección, capturas cada run: prompts, tool calls, diffs, scores de eval, tokens. Herramientas: **Arize Phoenix** (open-source, OTel para LLMs), **Langfuse**, o **Braintrust** (si el setup crece y quieres lifecycle + enforcement en CI). Esto es lo que te deja responder, con datos, "¿en qué clase de tareas el agente se desvía, hace loops o retrocede?".

**Conexión con la realidad multi-tenant:** las trazas de agente deben respetar el **mismo** `PII_DENYLIST`. No tiene sentido redactar PII en Sentry y después volcar datos de residentes crudos en la traza del agente. La privacidad es transversal a las dos capas.

<a name="36-pipelines"></a>
### 3.6 Pipelines: dónde corre cada control ("keep quality left")

El principio (Böckeler, heredado de Integración Continua): distribuye los controles a lo largo del ciclo de vida según su **costo, velocidad y criticidad**. Lo barato y rápido, lo más a la izquierda posible; lo caro, post-integración.

```
   PRE-COMMIT          PRIMER BUCLE          PRE-INTEGRACIÓN        CONTINUO
   (agente-local,      (autocorrección       (CI en el PR)          (sensores de deriva,
    < 1s)               del agente)                                  fuera del ciclo)
   ──────────          ──────────────         ───────────────       ──────────────────
   · ruff / eslint     · tests relevantes     · pytest / vitest      · agente jardinero
   · tsc (changed)     · import-linter        · tsc --noEmit         · dead-code / cobertura
   · gitleaks          · code-review skill    · eslint full          · react-doctor (score
   · fast unit subset  · lint con remediación · import/dep-cruiser     regression como gate)
                         → agente se autorepara· e2e (cross-repo)     · dependabot
                         (Ralph Wiggum loop)  · LLM-como-juez (PR)    · Sentry SLO → sugerencias
                                              · evals (si cambió el     del agente
                                                harness)
```

Observa que **react-doctor**, que hoy corres a mano, pasa a ser un sensor del pipeline (regresión de score como gate). Y los **evals** solo se disparan cuando el cambio toca el harness (no en cada PR — son caros).

**La escalera de autonomía** (cómo subir confianza sin un salto de fe):
- **Nivel 0 — Sugerir:** el agente propone, el humano hace todo.
- **Nivel 1 — PR draft:** el agente abre PR, el humano revisa y mergea. *Empieza aquí.*
- **Nivel 2 — Auto-merge de bajo riesgo:** refactors dentro de una capa, fixes de lint, updates de doc, **si** todo está verde.
- **Nivel 3 — Feature end-to-end** en una superficie acotada (lo que OpenAI logró tras mucha inversión; no se asume que generaliza).

**La matriz de autonomía** (esto es lo que el job description llama "límites de autonomía"; va en el AGENTS.md raíz y se hace cumplir con hooks/permisos):

| SIEMPRE (sin preguntar) | PREGUNTAR primero | NUNCA (sin humano) |
|---|---|---|
| Añadir/arreglar tests | Nuevo endpoint o página | Migraciones Alembic sobre datos de prod |
| Actualizar docs para reflejar el código | Cambio de esquema / migración | Cambiar RLS / `PII_DENYLIST` / `privacy_filter` |
| Refactor dentro de una capa | Nueva dependencia | Firma SIFEN / claves / secretos |
| Formateo y fixes de lint | Cambios al contrato cross-repo | Borrar datos / push directo a `main` |
| Regenerar `generated/` | Tocar auth / RBAC | Lógica de facturación / cobros |

El patrón de Anthropic (Claude Code) ya te da los primitivos para hacer esto cumplir: postura **read-only por defecto** hasta aprobación explícita, ediciones reversibles vía snapshots, y un **sistema de hooks** para inyectar scripts (escaneo de seguridad, política) en puntos críticos del ciclo del agente. La matriz no es un documento aspiracional: se codifica en hooks.

---

<a name="4-spike"></a>
## 4. El spike: cómo demostrarlo y medirlo en 3 semanas

Un spike no es "implementar el harness". Es **probar o refutar una hipótesis** en tiempo acotado. Si lo planteas como "voy a construir todo esto", se convierte en un proyecto sin fin. Plantéalo como un experimento.

> **Hipótesis:** codificar una capa de guías (AGENTS.md + docs + esquemas) + sensores de arquitectura + una política de autonomía, sobre AdminRent-backend y -frontend, **sube la tasa de éxito del agente** en tareas representativas y **baja el tiempo de revisión humana**, sin regresiones de seguridad.

> **Métrica de éxito del spike:** tasa de éxito del agente (tareas resueltas correctamente sin intervención) sube de un baseline `X%` a `≥ X+20pp`, con costo de tokens/iteraciones igual o menor. Si no se mueve, el harness no sirve *para AdminRent* y hay que saberlo.

### Fase 0 — Baseline (día 1-2). **No saltes esto.**
Antes de tocar nada, mide el estado actual. Sin baseline no hay post creíble ni decisión informada.
- Define ~10 tareas representativas (mezcla CRUD, bugfix, RBAC, página frontend).
- Córrelas con el setup **actual** (sin AGENTS.md). Registra por tarea: ¿éxito sí/no?, nº de iteraciones, tokens, tiempo de revisión, ¿violó alguna invariante?
- Esto te da el `X%` y, de paso, te muestra los modos de fallo reales (probablemente: el agente adivina contratos, salta capas, no corre los tests correctos).
- *Entregable:* `docs/exec-plans/active/harness-spike.md` con la tabla de baseline.

### Fase 1 — Capa de guías (semana 1).
- `AGENTS.md` raíz (mapa de repos + matriz de autonomía) + backend + frontend (tabla de contenidos, ~100 líneas c/u).
- Mover STATUS/planes/decisiones del README y de tu cabeza a `docs/`.
- Generar `db-schema.md` y `openapi.json` → tipos TS para el frontend.
- Consolidar `react-doctor` en una sola fuente.
- **Re-correr las 10 tareas.** Mide el delta solo de las guías.

### Fase 2 — Sensores de arquitectura + shift-left (semana 2).
- `import-linter` (backend) y `dependency-cruiser` (frontend) con los contratos de capas.
- `pyright` en el backend (subir harnessability).
- Hooks pre-commit (ruff, eslint, tsc, gitleaks).
- 1-2 lints custom con mensajes de remediación.
- Tests de seguridad de dominio: aislamiento multi-tenant + no-debilitar-`privacy_filter`.
- Wire `react-doctor` a la CI como gate de regresión.
- **Re-correr las 10 tareas.** Mide el delta de los sensores.

### Fase 3 — Autonomía + inferencial (semana 2-3).
- Codificar la matriz de autonomía en hooks de Claude Code (read-only por defecto, gates en lo "nunca").
- LLM-como-juez en el PR (sensor inferencial).
- Tracing de trayectorias (Phoenix o Langfuse) para capturar los runs.
- Subir al Nivel 1-2 de autonomía en lo de bajo riesgo.
- **Re-correr las 10 tareas + las 5-10 nuevas** que se te ocurrieron en el camino.

### Fase 4 — El post (semana 3).
- Tabla baseline vs final por fase. El delta es la historia.
- Los 2-3 modos de fallo más jugosos del baseline y cómo el harness los cerró.
- Qué NO mejoró (honestidad = credibilidad).
- Generalizar a un patrón replicable (tu blog ya cierra cada post con un "patrón generalizado").

### Encaje con tu blog
Tus posts actuales (`BLOG_STRUCTURE.md`) son narrativas densas con postmortem y "qué haría distinto". Este encaja perfecto pero con una vuelta: en vez de "construí X y estos fueron los bugs", es **"convertí un SaaS real multi-tenant en una base de código agent-legible y lo medí"**. El ángulo recruiter-facing —y esto conecta con el rol de harness engineering que persigues— es que NO es un toy project: es Flask + Next + multi-tenant + PII + facturación electrónica. Pocos posts de harness engineering muestran números reales sobre un dominio con radio de explosión real.

---

<a name="5-riesgos"></a>
## 5. Riesgos, supuestos y puntos ciegos

Sección deliberadamente incómoda. Si el spike falla, será por algo de aquí.

**Supuestos que estoy haciendo (y cómo validarlos):**
1. *"El layering del backend está limpio."* Lo infiero de la estructura de carpetas, no lo verifiqué. La primera corrida de `import-linter` puede revelar que ya está violado en varios sitios. *Validación:* córrelo en Fase 2 antes de prometer nada; si hay 30 violaciones, primero limpias, luego harness.
2. *"La tasa de éxito del agente es medible barato."* Correr 10 tareas × varias fases × varios modelos cuesta tokens y horas. *Validación:* empieza con 10 tareas, no 50; automatiza la rúbrica computacional (tests + import-linter), reserva el juicio humano para lo inferencial.
3. *"El backend es el mejor punto de partida."* Lo es por madurez, pero el frontend (TS) es más harnessable de entrada. *Decisión abierta:* podrías obtener el delta más rápido y vistoso en el frontend. Mídelo en Fase 0.

**Dónde el harness engineering está sobre-vendido (no hagas cargo-culting):**
- El **harness de comportamiento no está resuelto** (Böckeler es explícito). Los evals reducen incertidumbre, no prueban corrección. No prometas en el post lo que la disciplina misma no promete.
- El **agente jardinero puede derivar él mismo.** Un agente que "limpia" sin un sensor que lo verifique introduce su propia entropía. Cada control inferencial necesita un control computacional que lo ancle.
- **OpenAI tenía 3-7 ingenieros y un problema de throughput.** Tú eres un dev solo optimizando para aprendizaje + un artefacto de portfolio. Copiar su stack completo (observabilidad efímera por worktree, garbage collection diario) sería over-engineering. **Right-size:** toma el patrón (AGENTS.md como índice, sensores de arquitectura, matriz de autonomía), no la escala.

**El riesgo #1, específico para ti:** quemar 3 semanas en infraestructura de agentes y no shippear ninguna feature de AdminRent. Un harness es un medio, no un fin. 
- *Mitigación:* el spike está time-boxed a 3 semanas con métrica de éxito explícita.
- **Criterio de muerte:** si al final de la Fase 1 las guías no mueven el baseline al menos +10pp, **pausa el spike** y reconsidera — puede que para un repo de tu tamaño el ROI no esté, y eso también es un resultado publicable ("cuándo el harness engineering NO vale la pena para un solo dev").

**Punto ciego que vale la pena nombrar:** un harness es tan bueno como las invariantes que el humano supo articular. Como dice Böckeler, *"lo correcto está fuera del alcance de cualquier sensor si el humano no especificó claramente qué quería"*. El harness externaliza tu criterio; no lo sustituye. Si tu modelo mental de "qué es un buen endpoint en AdminRent" es difuso, el harness propagará esa difusión a escala.

**Sobre el ángulo de carrera (directo):** harness engineering es un rol emergente real —OpenAI, Anthropic y Thoughtworks escriben de esto, y AGENTS.md es un estándar cross-vendor genuino—. Un post que lo *mide* sobre un SaaS real es un diferenciador fuerte para tu perfil. Pero el post solo es creíble si los números son reales. De ahí la insistencia en la Fase 0. Un post de harness engineering sin baseline es exactamente lo que un reclutador técnico detecta como humo.

---

<a name="6-referencias"></a>
## 6. Referencias

Fuentes primarias usadas para este research (curadas para la sección de referencias del futuro post):

**Marco conceptual**
- Birgitta Böckeler — *Harness engineering for coding agent users* (martinfowler.com, abr 2026): guías/sensores, computacional/inferencial, las tres dimensiones de regulación, harnessability, Ley de Ashby. La fuente conceptual central.
- LangChain — *The Anatomy of an Agent Harness* (origen de "Agent = Model + Harness").

**Implementación real**
- OpenAI — *Harness engineering: leveraging Codex in an agent-first world* (feb 2026): AGENTS.md como índice, `docs/` como sistema de registro, arquitectura por capas con linters custom, garbage collection, niveles de autonomía, observabilidad agent-legible.
- Anthropic — *Effective harnesses for long-running agents*: patrón initializer, modelo de permisos read-only por defecto, sistema de hooks.
- Stripe — *Minions: one-shot end-to-end coding agents* (pre-push hooks heurísticos, "shift feedback left", blueprints).

**Estándares y tooling**
- AGENTS.md — estándar abierto (agents.md), jerarquía, soporte monorepo, "mantenlo corto".
- GitHub Blog — *How to write a great agents.md* (lecciones de 2.500+ repos).
- Evals: DeepEval (estilo pytest), promptfoo (CLI local + red-team), Braintrust (lifecycle + CI), Arize Phoenix / Langfuse (tracing OTel para LLMs).
- Tests de arquitectura: import-linter (Python), dependency-cruiser (TS/JS).
- `awesome-harness-engineering` (lista curada de tools, patrones, evals, memoria, MCP, permisos, observabilidad).

---

*Fin del borrador de spike. Próximo paso sugerido: ejecutar la Fase 0 (baseline) sobre AdminRent-backend. No se ha modificado código en ningún repo.*

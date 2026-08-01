# HANDOFF_CONTEXT.md

**Documento de continuidad para iniciar una nueva conversación con Claude sobre este proyecto.**

Generado: 2026-08-01
Repositorio analizado: `andresarangoez/OVA-ARRITMIAS-CARDIACAS` (rama `main`, commit `5532e92`)
Working directory local: `C:\DOC UNI\OVA\OVA DEFINITIVO`

> **Nota de veracidad:** todo lo que contiene este documento fue verificado directamente contra el repositorio local, la API de GitHub y los documentos de Google Drive accesibles en el momento de escribirlo (ver sección 5 para las fuentes que **no** se pudieron ubicar). No hay información inventada. Donde falta un dato, se marca explícitamente como **[PENDIENTE DE COMPLETAR]**.

---

# 1. Descripción general del proyecto

## Objetivo del OVA

Objeto Virtual de Aprendizaje (OVA) sobre manejo integral de arritmias cardíacas, desarrollado para la Facultad de Enfermería de la Fundación Universitaria de Ciencias de la Salud (FUCS, Colombia). Su finalidad es fortalecer el aprendizaje del manejo de arritmias mediante simulación clínica interactiva, contenido multimedia y actividades de evaluación.

No se concibe como una página web informativa ni como un PDF interactivo — el objetivo explícito es que se sienta como **software educativo universitario de alta calidad**, con estándar cercano a un SPOC/MOOC.

## Público objetivo

- Estudiantes de Enfermería (audiencia principal)
- Estudiantes de Medicina
- Profesionales de Ciencias de la Salud que requieran reforzar conocimientos

## Alcance

El curso cubre, según el syllabus oficial (ver sección 5): fisiología y electrofisiología cardíaca, valoración clínica de arritmias, diagnóstico e interpretación de ritmos en ECG, planeación de cuidados (priorización, algoritmos AHA/ESC), intervención (farmacológica y eléctrica: cardioversión, desfibrilación, marcapasos, RCP/ACLS), y evaluación de casos clínicos progresivos con retroalimentación.

## Estado actual del desarrollo

El proyecto es funcional y está publicado en producción (ver sección 4). Los 6 módulos tienen contenido completo, navegación funcional, y 3 simuladores interactivos operativos. El desarrollo sigue activo con mejoras incrementales por rama/PR. Ver sección 6 para el detalle de qué está terminado, en desarrollo y pendiente.

## Filosofía del proyecto

Fijada explícitamente en `docs/CLAUDE.md` y reforzada durante el desarrollo:

- El proyecto es un **proyecto de grado** (no solo un ejercicio técnico) — las decisiones deben poder defenderse ante un comité académico, no solo funcionar.
- Prioridad: estabilidad > escalabilidad > calidad de código > experiencia de usuario > rendimiento > accesibilidad > diseño institucional. **Nunca sacrificar estabilidad por efectos visuales.**
- El contenido de los módulos no debe leerse como generado por IA — se evitan estructuras repetitivas tipo "Introducción / Puntos clave / Importancia clínica / Aplicación en enfermería" en favor de narrativa continua tipo curso universitario, alternando explicación, imagen, actividad, simulador, caso clínico y pregunta.
- Diseño minimalista, profesional, institucional — inspirado en Apple Human Interface Guidelines, Coursera, Canvas, edX (y, según `docs/CLAUDE.md`, también Linear, Philips Healthcare, Siemens Healthineers, Complete Anatomy, UpToDate como referencias de "software clínico moderno", sin copiar interfaces, solo principios).

---

# 2. Arquitectura del proyecto

## Estructura de carpetas (verificada, estado actual de `main` + rama en curso)

```
/
├── index.html                          # Punto de entrada único (SPA de una sola página)
├── assets/
│   ├── README.md
│   ├── images/                         # logo-fucs.png, ICONO FACULTAD.png,
│   │                                     corazon-estructuras-diagrama.png
│   └── models/Heart.glb                # Modelo 3D del corazón (model-viewer)
├── css/                                # 15 archivos, numerados por orden de introducción
├── js/                                 # 16 archivos, numerados por orden de introducción
├── modules/                            # modulo-01.html … modulo-06.html
├── docs/                               # Documentación del proyecto (no contenido del OVA)
│   ├── CLAUDE.md                       # Reglas de arquitectura/diseño para IA asistente
│   ├── PROJECT.md                      # Descripción funcional del proyecto
│   ├── ARQUITECTURA-PEDAGOGICA-MODULO-01.md
│   ├── CREDITOS-TERCEROS.md            # Atribuciones de licencias de terceros
│   └── HANDOFF_CONTEXT.md              # Este documento
└── .claude/settings.local.json         # Permisos locales de Claude Code
```

**No existe carpeta `/data`** aunque `docs/CLAUDE.md` la menciona como parte de la arquitectura ideal — los datos de ritmos del simulador viven inline en `js/01-data-ritmos.js`. Es una desviación menor, no bloqueante.

## Componentes reutilizables (CSS)

Definidos principalmente en `css/10-componentes.css` y `css/05-modulo.css`, usados de forma idéntica en los 6 módulos:

| Componente | Clase CSS | Uso |
|---|---|---|
| Botón principal | `.btn-comenzar` | Iniciar módulo, finalizar módulo |
| Botón secundario | `.btn-back` | Volver al menú (rediseñado como discreto/sticky, ver sección 9) |
| Botón de acción | `.btn-accion` | Ver caso, comprobar mini-reto |
| Tarjeta | `.tarjeta-informativa` | Bloques informativos con ícono |
| Caja de información | `.key-box` | Conceptos clave |
| Caja de advertencia | `.key-box.danger` | Alertas clínicas |
| Nota de error frecuente | `.error-frecuente` | Errores conceptuales comunes |
| Dato curioso | `.dato-curioso` | Trivia histórica/clínica |
| Perla clínica | `.perla-clinica` | Tips clínicos breves |
| Caja de éxito | `.caja-exito` | Cierres de sección |
| Mini reto | `.mini-reto` | Pregunta rápida de una sola opción |
| Reto de emparejar | `.reto-emparejar` | Actividad tap-to-pair |
| Stepper de fases | `.stepper-fases` | Navegación por pasos (ej. potencial de acción) |
| Diagrama de nodos | `.diagrama-nodos` | Exploración de jerarquía (ej. sistema de conducción) |
| Tabla comparativa | `.tabla-comparativa` | Comparaciones tabulares |

Estos widgets genéricos (`js/12-widgets-aprendizaje.js`) están deliberadamente desacoplados de contenido clínico específico — cualquier módulo los reutiliza pasando solo su propio HTML/datos.

## Módulos (estructura estándar)

Cada `modules/modulo-0N.html` sigue el patrón fijo documentado en `js/05-modulo.js`:

```
#contenido-modulo-0N
├── .modulo-bienvenida       (breadcrumb, título, objetivos, introducción, botón Comenzar)
└── .modulo-desarrollo       (oculto hasta pulsar Comenzar)
    ├── barra de progreso
    ├── .modulo-unidad × N   (unidades de contenido)
    ├── .modulo-caso-clinico (opcional)
    ├── .modulo-actividad
    ├── .modulo-resumen
    ├── .modulo-autoevaluacion
    ├── .modulo-bibliografia
    └── .modulo-finalizar-wrap
```

Si un módulo no sigue esta estructura (aún no migrado), las funciones de `05-modulo.js` no hacen nada — no rompen nada al no encontrar los nodos esperados.

## Simuladores

Ver inventario completo en la sección 8.

## Sistema de navegación

- **SPA de una sola página**: `index.html` tiene `#vista-home` y `#vista-modulo`; se alternan vía clases `view-active`/`view-hidden` (`js/03-navegacion.js`).
- **Navbar sticky del módulo** (`.module-navbar`, `css/02-layout.css`): fijo en `top: 12px`, con fondo casi transparente en reposo y translúcido + sombra solo después de hacer scroll (clase `.scrolled`, gestionada por `js/13-shell-indice.js`) — decisión de diseño para no obstruir la lectura (ver sección 9).
- **Shell de índice** (`js/13-shell-indice.js`, `css/11-shell-modulo.css`): sidebar deslizable con índice de unidades, barra de progreso global del módulo, tiempo restante estimado, y FABs flotantes (abrir índice / volver arriba).
- **Búsqueda dentro del módulo** (`js/14-busqueda-modulo.js`): resaltado y navegación de coincidencias de texto.

## Carga dinámica de contenido

Cada módulo se carga bajo demanda la primera vez que se abre (`cargarContenidoModulo` en `js/03-navegacion.js`):

```js
fetch('modules/modulo-XX.html') → contenedor.innerHTML = html (con caché en memoria)
```

**Limitación arquitectónica importante:** los `<script>` incluidos en el HTML de un módulo **no se ejecutan** al inyectarse así (limitación estándar del DOM). No existe ningún evento "el módulo ya cargó" al que engancharse. Por eso todos los widgets interactivos se autoinicializan exclusivamente vía atributos inline (`onclick=""`, `onpointerdown=""`) definidos en el propio HTML — nunca dependen de un paso de inicialización JS posterior a la carga. Esta es la razón por la que, por ejemplo, el simulador de eje eléctrico necesitó un `MutationObserver` sobre `#vista-modulo` en vez de un simple "llamar función al cargar" para poder dibujar su primer cuadro.

## Namespaces (JavaScript)

Todo el JS usa el patrón IIFE + namespace único `window.OVA`, con un sub-namespace por archivo/responsabilidad, para no ensuciar el scope global:

```js
(function (OVA) {
    OVA.NombreDelModulo = OVA.NombreDelModulo || {};
    // ... funciones privadas ...
    OVA.NombreDelModulo.funcionPublica = funcionPublica;
    window.funcionPublica = funcionPublica; // exposición mínima para onclick="" en el HTML
})(window.OVA = window.OVA || {});
```

Namespaces activos: `OVA.Navegacion`, `OVA.ModuloUI`, `OVA.MotorClinico` (+ `.ECG`, `.Ritmos`, `.Hemodinamico`, `.Eventos`, `.Medicamentos`, `.Pacientes`), `OVA.MotorECG`, `OVA.Componentes`, `OVA.ContenidoModulo`, `OVA.WidgetsAprendizaje`, `OVA.ShellModulo`, `OVA.BusquedaModulo`, `OVA.SimuladorEje`, `OVA.CorazonEstructuras`.

## Organización del JavaScript (16 archivos, numerados por orden de introducción)

| Archivo | Líneas | Responsabilidad |
|---|---|---|
| `00-motor-clinico.js` | 49 | Raíz del namespace `MotorClinico`, declara los 6 sub-motores (algunos aún placeholder) |
| `01-data-ritmos.js` | 44 | Catálogo de ritmos ECG y sus valores hemodinámicos fijos |
| `02-motor-ecg.js` | 351 | Motor matemático del simulador ECG — un generador de forma de onda independiente por cada una de 17 arritmias |
| `03-navegacion.js` | 139 | Navegación entre vista home/módulo, carga dinámica de contenido |
| `04-simulador.js` | 248 | Lógica del simulador ECG principal (selección de ritmo, render en canvas, acciones clínicas) |
| `05-modulo.js` | 213 | Bienvenida↔desarrollo, barra de progreso por scroll (`IntersectionObserver`), acordeones, verificación de actividad/autoevaluación |
| `06-motor-hemodinamico.js` | 80 | **Placeholder** — cálculo dinámico de FC/TA/SpO2 en función del estado clínico (etapa futura) |
| `07-motor-eventos.js` | 30 | **Placeholder** — reglas de "administrar X → efecto Y en cadena" |
| `08-motor-medicamentos.js` | 18 | **Placeholder** — catálogo de medicamentos y mecanismo de acción |
| `09-motor-pacientes.js` | 24 | **Placeholder** — catálogo de casos clínicos completos |
| `10-componentes.js` | 118 | Lógica de componentes UI genéricos (tabs, modales, tooltips) |
| `11-contenido-dinamico.js` | 253 | Sistema de carga granular sección-por-sección — **construido pero no conectado a ningún módulo real todavía** |
| `12-widgets-aprendizaje.js` | 159 | Widgets genéricos: stepper de fases, diagrama de nodos, reto de emparejar, mini-reto |
| `13-shell-indice.js` | 318 | Sidebar de índice, progreso global, FABs, finalización de módulo |
| `14-busqueda-modulo.js` | 182 | Búsqueda de texto dentro del módulo activo |
| `15-simulador-eje.js` | 309 | Simulador de eje eléctrico cardíaco (ver sección 8) |
| `16-corazon-estructuras.js` | 31 | Identificación de estructuras del corazón (ver sección 8) |

**Total: 2,566 líneas de JavaScript**, todo vanilla, sin dependencias de build.

## Reutilización de componentes — regla explícita

`docs/CLAUDE.md`: *"Nunca duplicar estilos"*, *"Cada archivo debe tener una única responsabilidad"*. En la práctica: antes de crear un widget nuevo, se revisa `12-widgets-aprendizaje.js` y las clases de `10-componentes.css` para ver si ya existe algo reutilizable (ej. el modo práctica del simulador de eje reutiliza `.actividad-opciones`/`.btn-accion` en vez de crear botones nuevos).

---

# 3. Flujo de desarrollo

```
Visual Studio Code
        ↓
Claude Code modifica el proyecto
        ↓
Live Server (extensión VS Code) muestra los cambios en vivo — http://127.0.0.1:5500/…
        ↓
El usuario revisa el funcionamiento localmente
        ↓
Git commit (en una rama nueva — NUNCA directo a main)
        ↓
git push
        ↓
Pull Request en GitHub (base: main)
        ↓
Revisión y Merge
        ↓
GitHub Pages detecta el push a main y despliega automáticamente
        ↓
Sitio actualizado en https://andresarangoez.github.io/OVA-ARRITMIAS-CARDIACAS/
```

**Importante — cambio de infraestructura reciente:** el proyecto usó Netlify hasta que su plan gratuito se quedó sin créditos operativos (pausó nuevos despliegues, aunque el sitio publicado seguía activo). El 2026-08-01 se migró a **GitHub Pages**, que ahora es la plataforma oficial de publicación — verificado en vivo, sirviendo correctamente desde la rama `main`, sin errores de consola. Netlify ya no se usa para nada en este proyecto.

**Regla de git no negociable** (aprendida de un error propio durante el desarrollo — ver sección 10): *nunca* editar archivos estando parado en `main`. Siempre `git checkout -b <rama>` primero. El repo no tiene `gh` CLI instalado en el entorno de desarrollo local — para abrir un PR, `git push` a una rama nueva devuelve una URL lista (`.../pull/new/<rama>`), o se construye manualmente `.../compare/main...<rama>?expand=1` para forzar `main` como base (el branch por defecto del repo en GitHub es en realidad `fix/typos-index-html`, no `main` — ver sección 4).

---

# 4. GitHub

- **Repositorio:** `andresarangoez/OVA-ARRITMIAS-CARDIACAS` — público.
- **Rama por defecto en GitHub:** `fix/typos-index-html` (dato de configuración del repo, no necesariamente donde vive el trabajo activo).
- **Rama donde realmente se integra el trabajo activo:** `main` — es la que GitHub Pages despliega y la que se debe usar como base de nuevos PRs.
- **Commit más reciente en `main` (verificado):** `5532e92` — "Merge pull request #26 from andresarangoez/feat/modulo-01-ajustes-ui".
- **No hay Pull Requests abiertos actualmente** (verificado vía API).

## Ramas remotas activas relevantes (no mergeadas a `main` a la fecha de este documento)

| Rama | Estado | Contenido |
|---|---|---|
| `feat/modulo-01-estructuras-corazon` | Sin PR creado, lista para mergear | Widget de identificación de estructuras del corazón (Módulo 01, Unidad 1) — ver sección 8 |
| `chore/github-pages` | Obsoleta/superflua | Contiene un archivo `.nojekyll` preparado para la migración a GitHub Pages; **nunca se mergeó** porque GitHub Pages funciona correctamente sin él. Se puede borrar. |

Hay además numerosas ramas de features ya mergeadas (`feat/modulo-0X-riqueza-interactiva`, `feat/modulo-01-eje-electrico*`, `feat/modulo-01-ajustes-ui`, etc.) que quedaron sin borrar tras el merge — candidatas a limpieza (ver sección 11).

## Historial reciente de PRs mergeados a `main` (del más nuevo al más viejo, verificado)

| PR | Título | Contenido |
|---|---|---|
| #26 / #25 | Ajustes de UI: botón volver, encabezado de módulo, justificado | Rediseño de `.module-navbar`/`.btn-back` (discreto y sticky), elimina bloque redundante "Módulo XX" en bienvenida, justificado de texto académico en los 6 módulos |
| #24 | Simulador de eje eléctrico (v2, desde `main`) | Ver sección 8 |
| #22 | Enriquece el Módulo 06 | Widgets interactivos, narrativa menos rígida |
| #21 | Enriquece el Módulo 05 | ídem |
| #20 | Fix scroll al recargar | Corrige que recargar dejara el scroll cerca del footer |
| #19 | Enriquece el Módulo 04 | ídem |
| #18 | Enriquece el Módulo 03 | ídem |
| #17 | Enriquece el Módulo 02 | ídem |
| #16 | UX navegación flotante | Sidebar ACLS eliminado, FABs de índice/volver arriba |
| #15 | Shell de navegación del curso | Índice lateral reutilizable para los 6 módulos |
| #14 | Módulo 01 a 7 unidades del syllabus oficial | Reestructuración curricular |

**Nota separada, importante para no confundir:** el PR #23 (simulador de eje eléctrico, primera versión) se mergeó por error contra `fix/typos-index-html` en vez de `main`, y quedó con una versión desactualizada del simulador (sin el trazado ECG realista ni los ajustes posteriores). El PR #24 fue la corrección: una rama nueva creada desde `main` con el estado final correcto. **Main es la fuente de verdad actual**, no `fix/typos-index-html`.

## Cómo debe trabajar un nuevo chat con GitHub

- Acceso de lectura: `git log`, `git branch -r`, y la API pública de GitHub vía fetch HTTP (`api.github.com/repos/andresarangoez/OVA-ARRITMIAS-CARDIACAS/...`) — funciona sin autenticación por ser un repo público.
- **No hay `gh` CLI instalado** en el entorno — no se puede crear PRs, comentar issues, ni hacer ninguna escritura autenticada en GitHub directamente. Los PRs se crean dándole al usuario la URL de comparación para que los abra manualmente desde su navegador.
- Nunca commitear directo a `main`. Siempre rama nueva desde `main` actualizado (`git checkout main && git pull origin main && git checkout -b <rama>`).

---

# 5. Google Drive

Se localizaron y se leyeron **dos** de los documentos fuente oficiales, compartidos como "cualquiera con el enlace":

## Documento 1 — Syllabus oficial del curso

- ID de Drive: `1ruZkt1NbvSyavarlqAFqPdodppxqfxNF`
- Contenido: "Manejo de arritmias cardíacas en enfermería", 26 horas, modalidad virtual. Docentes: Carlos Andrés González Salazar, Paula Viviana Duarte Amézquita. Define competencias, resultados de aprendizaje esperados (RAE), la estructura de 6 módulos (mapeados al proceso de atención de enfermería), contenido detallado de ECG (taquiarritmias, bradiarritmias, crecimiento de cavidades, alteraciones isquémicas, trastornos de conducción, alteraciones electrolíticas), exige uso de taxonomía **NANDA/NOC/NIC**, criterios de evaluación por módulo, y bibliografía (OMS, OPS, Minsalud).

## Documento 2 — Documento de desarrollo de Módulos

- ID de Drive: `18Ak0TGCZIn0BCCoN7wL7iG5DNna5lQbw6OQeVw9Tpoo`
- Contenido: confirma la estructura de 6 módulos y detalla las unidades de cada uno. El Módulo 01 (7 unidades) coincide 1:1 con lo ya implementado. Confirma el marco pedagógico: microestructura de 5 pasos por unidad (fundamento científico → interpretación clínica → aplicación práctica → toma de decisiones → caso/simulación), alineado con Bloom y el modelo de adquisición de competencias de Benner.

**Cómo acceder a estos documentos:** `https://docs.google.com/document/d/{ID}/export?format=txt` (redirige a un host `docstext.googleusercontent.com`; hay que seguir el redirect con un segundo fetch a esa URL). Funciona sin credenciales porque los documentos están compartidos públicamente por enlace.

## Documentos mencionados por el usuario que NO se pudieron ubicar

- **"Proyecto de grado"** (documento formal de tesis/proyecto de grado) — **[PENDIENTE DE COMPLETAR]**: no se proporcionó un enlace o ID de Drive para este documento. Si existe y es distinto de los dos anteriores, el usuario debe compartir su enlace.
- **"Documentación técnica"** (como documento de Drive separado de este mismo archivo) — **[PENDIENTE DE COMPLETAR]**: no se proporcionó enlace. Es posible que el usuario se refiera a `docs/CLAUDE.md`/`docs/PROJECT.md` (que sí están en el repo, no en Drive) — a confirmar con el usuario.

**No existe ningún conector nativo de Google Drive** en este entorno — el acceso descrito arriba depende de que el usuario comparta el enlace exacto de cada documento (con permiso "cualquiera con el enlace"), no de una búsqueda general en el Drive del usuario.

---

# 6. Estado del desarrollo

## Funcionalidades terminadas

- Dashboard principal con corazón 3D interactivo (`model-viewer` + `Heart.glb`) y las 6 tarjetas de módulo.
- Navegación SPA completa: shell de índice, barra de progreso, búsqueda dentro del módulo, FABs, navbar sticky discreto.
- Los 6 módulos con contenido completo: objetivos, introducción, unidades, caso clínico, actividad, resumen, autoevaluación, bibliografía.
- Justificado de texto académico en los 6 módulos (con exclusiones correctas para preguntas/listas/tarjetas/leyendas).
- 3 simuladores interactivos operativos (ver sección 8).
- Despliegue automático en GitHub Pages.
- Identidad visual institucional FUCS aplicada de forma consistente (colores, tipografía, espaciado).

## Funcionalidades en desarrollo

- Widget de identificación de estructuras del corazón — **código completo y probado, en rama `feat/modulo-01-estructuras-corazon`, pendiente de PR/merge** (ver sección 4).

## Funcionalidades pendientes

- **Sub-motores clínicos son placeholders vacíos**: `MotorClinico.Hemodinamico`, `.Eventos`, `.Medicamentos`, `.Pacientes` (archivos `06`–`09`) están declarados en la arquitectura pero sin lógica real. Los botones "Desfibrilar" y "Administrar Fármaco" del simulador ECG principal probablemente no tienen efecto clínico dinámico todavía.
- **Documento de arquitectura pedagógica solo existe para el Módulo 01** (`docs/ARQUITECTURA-PEDAGOGICA-MODULO-01.md`). Los módulos 02–06 ya tienen contenido enriquecido publicado sin ese respaldo documental formal — riesgo de cara a la sustentación si el comité pide ese nivel de trazabilidad para todos los módulos.
- **No verificado si el contenido actual usa la taxonomía NANDA/NOC/NIC** que el syllabus exige explícitamente (especialmente relevante para Módulos 04 y 06).
- **Posible brecha de contenido en el Módulo 03 (Diagnóstico)**: el syllabus detalla temas de ECG diagnóstico (crecimiento de cavidades, alteraciones isquémicas, trastornos de conducción, alteraciones electrolíticas) que no aparecen explícitamente en la lista de unidades del Documento de desarrollo de Módulos para ese módulo — sin confirmar si están cubiertos implícitamente o es una brecha real.
- Sistema de carga granular (`11-contenido-dinamico.js`) está construido pero no conectado a ningún módulo real — decisión pendiente de si se usará en el futuro.
- Limpieza de ramas de GitHub ya mergeadas y sin borrar.

---

# 7. Módulos

Los 6 módulos comparten exactamente la misma arquitectura visual y de navegación (ver sección 2). Detalle específico de cada uno:

## Módulo 01 — Fundamentos (`⚡`)

7 unidades (reestructurado en PR #14 para calzar con el syllabus oficial): Anatomía Cardíaca Funcional, Electrofisiología Cardíaca, Sistema de Conducción, Ciclo Cardíaco, Fundamentos del ECG, Ondas/Segmentos/Intervalos, Generalidades de las Arritmias. Nivel Benner "Novato" — no exige toma de decisiones clínicas, solo comprensión y reconocimiento.

Recursos interactivos propios (sin simulador de ritmos, que vive en el Módulo 03):
- **Widget de identificación de estructuras del corazón** (Unidad 1, pendiente de merge — ver sección 8).
- Modelo 3D del corazón explorable (`Heart.glb`).
- Stepper "Construye el potencial de acción" (Unidad 2).
- Diagrama interactivo del sistema de conducción (Unidad 3).
- **Simulador de eje eléctrico cardíaco** con arrastre y modo práctica (Unidad 5).
- Actividad de emparejar ondas del ECG (Unidad 6).

Único módulo con documento de arquitectura pedagógica formal (`docs/ARQUITECTURA-PEDAGOGICA-MODULO-01.md`): mapea cada objetivo a un nivel de Bloom, justifica la secuencia de las 7 unidades, y traza cada unidad a su instrumento de evaluación 1:1.

## Módulo 02 — Valoración (`🩺`)

6 unidades según el Documento de desarrollo de Módulos: abordaje del paciente, manifestaciones clínicas, valoración hemodinámica, factores desencadenantes, monitorización, metodología de interpretación. Enriquecido con widgets interactivos en PR #17.

## Módulo 03 — Diagnóstico (`📈`)

7 unidades: ritmo sinusal normal, bradicardias, latidos ectópicos, taquicardias supraventriculares, taquicardias ventriculares, ritmos letales, algoritmos diagnósticos. **Incluye el simulador ECG principal** (badge "Simulador interactivo" en el dashboard). Enriquecido en PR #18. Posible brecha de contenido (ver sección 6).

## Módulo 04 — Planeación (`📋`)

5 unidades: fisiopatología de arritmias, clasificación clínica, estratificación de riesgo, algoritmos AHA/ESC, toma de decisiones. Enriquecido en PR #19.

## Módulo 05 — Intervención (`💉`)

7 unidades: principios generales, tratamiento farmacológico, cardioversión sincronizada, desfibrilación, marcapasos, algoritmos RCP/ACLS, cuidado post-tratamiento. **Incluye el simulador ECG principal**. Enriquecido en PR #21.

## Módulo 06 — Evaluación (`✅`)

Casos clínicos progresivos, escenarios de decisión, manejo de complicaciones, evaluación sumativa. **Incluye el simulador ECG principal**. Enriquecido en PR #22 con un stepper del ciclo PAE completo ("Valorar → Diagnosticar → Planear → Intervenir"), mini-reto de priorización y actividad de emparejar complicaciones.

## Mecánica común a los 6 módulos

- **Progreso**: se calcula por `IntersectionObserver` sobre las `.modulo-unidad` visibles en pantalla mientras el estudiante hace scroll — **no** por completar actividades. Ni los mini-retos, ni la autoevaluación, ni ninguna actividad bloquean el avance; "Finalizar módulo" es un botón que el estudiante pulsa cuando quiere, sin validación de que realmente haya completado nada. (Esto es relevante si en el futuro se pide "gating" real de progreso — sería la primera vez que se implementa algo así en el proyecto).
- **Autoevaluación**: la respuesta correcta de cada pregunta vive en el HTML como `data-correcta="true"` en el `<input>` — el JS solo la lee, nunca la inventa.
- **Caso clínico**: estructura de campos (motivo de consulta, antecedentes, signos vitales, trazado ECG, valoración inicial) + preguntas abiertas de reflexión (sin verificación automática).

---

# 8. Simuladores — inventario completo

## 1. Simulador ECG principal

- **Archivos**: `js/00-motor-clinico.js`, `js/01-data-ritmos.js`, `js/02-motor-ecg.js`, `js/04-simulador.js`, `js/06`–`09` (motores auxiliares, placeholders), `css/04-simulator.css`.
- **Funcionamiento**: canvas en tiempo real (`#ekgCanvas`) que dibuja el trazado ECG del ritmo seleccionado. 17 arritmias, cada una con su **propio generador matemático independiente** (`GENERADORES_RITMO` en `02-motor-ecg.js`) — regla arquitectónica explícita: nunca reutilizar el algoritmo de una arritmia para otra. Incluye bradiarritmias, taquiarritmias de complejo angosto/ancho, ritmos de paro cardíaco, extrasístoles.
- **Panel de signos vitales**: FC, TA/PAM, SpO2, FR, temperatura — actualmente valores **fijos por ritmo** (`01-data-ritmos.js`), no dinámicos (el motor hemodinámico que los calcularía en función del tiempo/estado clínico es un placeholder vacío).
- **Acciones clínicas**: botones "Desfibrilar" y "Administrar Fármaco" — su efecto real depende de los motores de eventos/medicamentos, también placeholders.
- **Integración**: visible únicamente en Módulos 03, 05 y 06 (`OVA.Navegacion.MODULOS_CON_SIMULADOR`), solo tras entrar al desarrollo del módulo (nunca en la pantalla de bienvenida).
- **Estado**: núcleo de generación de forma de onda completo y sólido; capa clínica dinámica (hemodinamia/eventos/medicamentos) pendiente.

## 2. Simulador de eje eléctrico cardíaco

- **Archivos**: `js/15-simulador-eje.js` (309 líneas), `css/12-simulador-eje.css`.
- **Ubicación**: Módulo 01, Unidad 5.
- **Funcionamiento**: diagrama hexaxial SVG con escala de grados (0°/±30°/±60°/±90°/±120°/±150°/180°), vector arrastrable (Pointer Events, mouse y táctil unificado), lectura en vivo de categoría + grados. Las 6 derivaciones se redibujan en tiempo real como trazados ECG realistas (arco P, complejo QRS con lógica de umbral R/S, segmento ST, arco T) sobre papel milimetrado. Modo práctica con **16 casos fijos** (4 por categoría: normal, desviación izquierda, desviación derecha, indeterminado), bloqueo de respuestas tras acertar, marcador de aciertos.
- **Origen del cálculo matemático**: adaptado del principio de proyección coseno del proyecto open-source **ECG Axis Trainer** (David Schaack, MIT License, https://github.com/david-shrk/ecgaxistrainer) — ningún archivo original fue copiado, es una reimplementación propia. Atribución completa en `docs/CREDITOS-TERCEROS.md`.
- **Estado**: completo y probado funcionalmente (drag, clasificación, modo práctica, sin errores de consola).

## 3. Identificación de estructuras del corazón

- **Archivos**: `js/16-corazon-estructuras.js` (31 líneas), `css/13-corazon-estructuras.css`, `assets/images/corazon-estructuras-diagrama.png`.
- **Ubicación**: Módulo 01, Unidad 1 (antes del modelo 3D explorable).
- **Funcionamiento**: imagen real del corazón (vista anterior) con 14 puntos clicables superpuestos (botones invisibles posicionados por porcentaje sobre la imagen); al hacer clic se muestra a la derecha el nombre y la función de esa estructura (aorta, venas pulmonares, aurículas, válvulas semilunares y auriculoventricular, ventrículo izquierdo, cuerdas tendinosas, músculos papilares, venas cavas).
- **Origen de la imagen**: es la imagen real del simulador "Heart Structures" de **Human Bio Media** (https://humanbiomedia.org, licencia CC BY 4.0), exportada directamente del `<canvas>` del simulador original (`canvas.toDataURL()`) y recortada — no existe un archivo de imagen descargable en el proyecto original (es una animación de Adobe Animate/CreateJS). Atribución visible al pie del widget y documentada en `docs/CREDITOS-TERCEROS.md`.
- **Limitación conocida a verificar**: de los 16 puntos visibles en la imagen original, solo 2 fueron verificados contra la herramienta en vivo de Human Bio Media (Aorta, Músculos Papilares); los otros 12 se ubicaron por criterio anatómico informado, no por verificación exacta uno a uno (la herramienta original demostró ser frágil ante automatización de clics). Si se necesita mayor certeza, se puede verificar manualmente contra https://humanbiomedia.org/simulations/circulatory-system/cardiac-cycle/heart-structures.html.
- **Estado**: completo, alineación de los 14 puntos contra la imagen verificada por superposición. **Pendiente de PR/merge** (rama `feat/modulo-01-estructuras-corazon`).

---

# 9. Decisiones importantes tomadas

1. **JavaScript vanilla, sin frameworks** (no React/Vue/Angular, no Bootstrap) — el proyecto debe ser ligero y fácil de integrar en Moodle en el futuro.
2. **Patrón de namespace `OVA.*`** con IIFE por archivo, para no contaminar el scope global.
3. **Ningún hook de inicialización tras la carga dinámica de un módulo** — todos los widgets se autoinician vía atributos inline (`onclick`, `onpointerdown`) porque los `<script>` inyectados por `innerHTML` no se ejecutan. Esta es una restricción arquitectónica real, no una preferencia de estilo — cualquier widget nuevo debe seguir este patrón.
4. **Reutilización estricta de componentes** — antes de crear un widget nuevo, revisar si ya existe uno genérico reutilizable.
5. **Nunca reemplazar ni reestructurar el simulador ECG principal** sin aprobación explícita — es una pieza central ya funcional.
6. **Identidad visual institucional FUCS obligatoria** (paleta de colores oficial, tipografía Inter, radios y sombras consistentes) — nunca colores ni estilos inventados fuera de esa paleta.
7. **Contenido académico no debe sonar "escrito por IA"** — narrativa continua, no plantillas repetitivas.
8. **Flujo de trabajo git estricto**: rama nueva antes de cualquier edición, nunca commit directo a `main`, un PR por funcionalidad.
9. **Migración de Netlify a GitHub Pages** (2026-08-01) — motivo: el plan gratuito de Netlify se quedó sin créditos operativos para nuevos despliegues. GitHub Pages es ahora la única plataforma de publicación oficial.
10. **Integraciones de terceros siempre con atribución documentada**: cualquier lógica, imagen o contenido adaptado de un proyecto externo (aunque sea de licencia permisiva) se documenta en `docs/CREDITOS-TERCEROS.md`, con el aviso de licencia completo y una nota visible en la propia interfaz del widget.
11. **Preferencia explícita por fidelidad al original sobre "reinterpretación propia"** cuando el usuario pide integrar un recurso externo puntual (aprendido durante el desarrollo del widget de estructuras del corazón — la primera versión, un diagrama SVG propio "inspirado en" el original, fue rechazada explícitamente en favor de usar el asset visual real).
12. **Texto académico justificado, con exclusiones explícitas** para títulos, listas, tablas, tarjetas, botones, leyendas de imágenes, preguntas y respuestas (implementado con `:where()` para dar especificidad cero a la regla general y que cualquier excepción de una sola clase la gane).
13. **Botón "Volver al menú" y la barra de navegación del módulo deben ser discretos**: fondo casi transparente en reposo, se revelan (fondo, sombra, opacidad) solo al hacer scroll o al pasar el cursor — no deben competir visualmente con el contenido ni obstruir la lectura al quedar fijos (sticky) en pantalla.

---

# 10. Convenciones del proyecto

Reglas operativas que cualquier chat nuevo debe seguir al trabajar en este repositorio:

1. **No romper componentes existentes.** Antes de modificar un archivo compartido (`css/05-modulo.css`, `js/12-widgets-aprendizaje.js`, etc.), verificar qué otros módulos/widgets dependen de él.
2. **Reutilizar código y componentes visuales** en vez de crear variantes nuevas de algo que ya existe.
3. **Mantener diseño visual consistente** entre los 6 módulos — un cambio de UI que aplique a uno debe aplicar a todos, salvo que se indique lo contrario explícitamente.
4. **Justificar texto académico** (`text-align: justify`) en párrafos de contenido — nunca en títulos, listas, tablas, tarjetas, botones, leyendas, preguntas o respuestas.
5. **Respetar la arquitectura modular**: un archivo, una responsabilidad. Evitar archivos gigantes.
6. **Mantener accesibilidad**: contraste adecuado (verificado incluso para el anillo de foco, que usa azul institucional en vez de dorado porque el dorado no cumple 3:1 de contraste), navegación por teclado, `aria-label`/`aria-live` donde corresponda.
7. **Respetar la navegación existente**: navbar sticky discreto, shell de índice, FABs — cualquier mejora futura debe integrarse con esto, no reemplazarlo.
8. **Nunca commitear directo a `main`.** Rama nueva siempre, con nombre descriptivo (`feat/`, `fix/`, `docs/`, `chore/`).
9. **Verificar funcionalmente los cambios antes de darlos por terminados** — levantar un servidor estático local (no hay Live Server disponible fuera de VS Code; se puede usar un servidor HTTP mínimo en PowerShell si hace falta) y probar la interacción real, no solo revisar que el código "se vea bien".
10. **Documentar en `docs/CREDITOS-TERCEROS.md`** cualquier adaptación de código, imagen o contenido de un proyecto de terceros, sin excepción, incluso con licencias permisivas.
11. **Antes de cambios grandes**: analizar, proponer alternativas, justificar la elegida, esperar aprobación explícita del usuario. No modificar partes grandes del proyecto sin explicarlo primero.
12. **Después de cada modificación**: verificar que el dashboard, la navegación, el simulador ECG, el cambio de módulos y las acciones clínicas sigan funcionando — no introducir regresiones.

---

# 11. Próximos pasos

Organizados por prioridad:

## Prioridad alta

1. **Mergear la rama `feat/modulo-01-estructuras-corazon`** (código completo, probado, esperando que el usuario abra y apruebe el PR).
2. **Verificar si el contenido de los Módulos 04 y 06 usa la taxonomía NANDA/NOC/NIC** que el syllabus exige explícitamente — si no, incorporarla.
3. **Confirmar si el Módulo 03 cubre** crecimiento de cavidades, alteraciones isquémicas, trastornos de conducción y alteraciones electrolíticas (temas del syllabus no vistos explícitamente en la lista de unidades del Documento de desarrollo de Módulos) — cerrar la brecha si es real.

## Prioridad media

4. **Extender `docs/ARQUITECTURA-PEDAGOGICA-MODULO-01.md`** como plantilla a los Módulos 02–06, para tener el mismo nivel de trazabilidad Bloom/Benner/evaluación de cara a la sustentación.
5. **Decidir el futuro de los sub-motores clínicos placeholder** (`06`–`09`): ¿se desarrollan (FC/TA/SpO2 dinámicos, cadena de eventos clínicos, catálogo de medicamentos, casos de pacientes completos) o se documenta que quedan fuera del alcance del proyecto de grado?
6. **Localizar y revisar** los documentos de Drive "Proyecto de grado" y "Documentación técnica" mencionados por el usuario pero no ubicados (sección 5).

## Prioridad baja / mantenimiento

7. **Limpiar ramas de GitHub ya mergeadas** (una decena de ramas `feat/modulo-0X-*` sin borrar tras el merge, más `chore/github-pages` que quedó obsoleta).
8. **Decidir si se conecta o se elimina** el sistema de carga granular (`11-contenido-dinamico.js`), que existe pero no está en uso.
9. Considerar si vale la pena registrar un dominio propio para GitHub Pages (opcional, tiene costo — la alternativa gratuita ya discutida fue renombrar el repositorio).

---

# 12. Recomendaciones para un nuevo chat

Antes de escribir una sola línea de código en este proyecto, un chat nuevo debe:

1. **Leer completamente este documento** (`docs/HANDOFF_CONTEXT.md`) de principio a fin.
2. **Leer también `docs/CLAUDE.md` y `docs/PROJECT.md`** — son las reglas de arquitectura/diseño y la descripción funcional oficiales del repo, más detalladas que el resumen de este documento.
3. **Conectarse al repositorio de GitHub** (`git log`, `git branch -r`, o la API pública) para confirmar que el estado descrito aquí sigue vigente — este documento tiene fecha, el repo puede haber avanzado desde entonces.
4. **Revisar los Pull Requests recientes y las ramas sin mergear** (sección 4) antes de asumir que algo "no existe todavía".
5. **Revisar Google Drive** (sección 5) si la tarea involucra contenido académico — el syllabus y el documento de módulos son la fuente oficial, no lo que ya está escrito en el HTML si hay conflicto.
6. **Comprender la arquitectura existente** (sección 2) antes de proponer una estructura nueva — en particular, la restricción de que los widgets no tienen hook de inicialización post-carga.
7. **No duplicar componentes** — buscar primero en `css/10-componentes.css`, `css/05-modulo.css` y `js/12-widgets-aprendizaje.js`.
8. **Respetar el diseño visual actual** (paleta FUCS, tipografía, radios, sombras) — no introducir estilos nuevos sin necesidad.
9. **Verificar el funcionamiento** con la estructura existente antes de reportar cualquier tarea como terminada — idealmente con un servidor local real, no solo revisión de código.
10. **Preguntar antes de asumir**, especialmente en decisiones de contenido académico (qué estructuras/temas incluir) o de alcance (qué tan fiel debe ser una integración externa) — el historial de este proyecto muestra que asumir mal esos dos puntos generó retrabajo.

---

# 13. INSTRUCCIONES PERMANENTES PARA CLAUDE

Estas reglas rigen todo el desarrollo futuro de este proyecto, sin excepción salvo indicación explícita del usuario en el momento:

1. **Stack**: HTML5 + CSS3 + JavaScript vanilla, exclusivamente. Nunca introducir frameworks (React, Vue, Angular), librerías de UI (Bootstrap) ni un paso de build. El proyecto debe poder servirse como archivos estáticos puros (compatible con integración futura en Moodle).

2. **Arquitectura de namespace**: todo JS nuevo sigue el patrón `(function(OVA){ OVA.Nombre = OVA.Nombre || {}; ... })(window.OVA = window.OVA || {})`, con exposición mínima a `window` solo para lo que se invoca desde `onclick=""` en el HTML.

3. **Sin hooks de inicialización post-carga**: cualquier widget que viva dentro de un módulo (`modules/modulo-0N.html`) debe autoinicializarse por atributos inline y/o venir con un estado por defecto ya renderizado en el propio HTML. Nunca asumir que existe un evento "el contenido ya cargó" al que engancharse — no existe.

4. **Reutilización obligatoria**: antes de crear un componente visual o interactivo nuevo, revisar si ya existe algo equivalente en `css/10-componentes.css`, `css/05-modulo.css` o `js/12-widgets-aprendizaje.js`. Un archivo, una responsabilidad — evitar archivos gigantes.

5. **No tocar el simulador ECG principal** (`js/00-04`, `06-09`) de forma que rompa su arquitectura de un generador matemático independiente por arritmia, salvo pedido explícito y aprobado.

6. **Identidad visual FUCS es innegociable**: usar siempre las variables CSS ya definidas en `css/01-variables.css` (colores institucionales, espaciado, radios, sombras) — nunca hex codes ni valores inventados fuera de esa paleta.

7. **Contenido académico no debe sonar generado por IA**: narrativa continua tipo curso universitario, nunca la plantilla repetitiva "Introducción / Puntos clave / Importancia clínica / Aplicación en enfermería" en cada unidad. Basado en evidencia (AHA, ESC, literatura científica) — nunca afirmaciones clínicas sin respaldo.

8. **Justificar (`text-align: justify`) los párrafos de contenido académico**, nunca títulos, listas, tablas, tarjetas, botones, leyendas de imagen, preguntas ni respuestas.

9. **Flujo git**: rama nueva siempre antes de editar (`git checkout -b`), nunca commit directo a `main`. Un PR por funcionalidad, contra `main` (no contra `fix/typos-index-html`, que es el branch por defecto de GitHub pero no donde vive el trabajo activo). No hay `gh` CLI — dar al usuario la URL de comparación para que abra el PR manualmente.

10. **GitHub Pages es la plataforma de publicación oficial** — Netlify ya no se usa. El sitio se despliega automáticamente al mergear a `main`, sirviendo desde `https://andresarangoez.github.io/OVA-ARRITMIAS-CARDIACAS/`.

11. **Toda integración de terceros** (código, imagen o contenido adaptado de un proyecto externo) se documenta sin excepción en `docs/CREDITOS-TERCEROS.md`, con el texto de licencia completo y una nota de atribución visible en la interfaz del widget correspondiente — sin importar cuán permisiva sea la licencia.

12. **Ante una integración externa, preguntar si se quiere fidelidad al original o una reinterpretación propia** antes de construir — no asumir que "propio" es siempre más seguro o preferido.

13. **Antes de cambios grandes**: analizar, proponer alternativas con su justificación, y esperar aprobación explícita antes de implementar. No modificar partes grandes del proyecto sin explicarlo primero. Cambios pequeños y acotados pueden proceder directo.

14. **Después de cada cambio, verificar que no se rompió nada**: dashboard, navegación entre módulos, simulador ECG, acciones clínicas, y cualquier widget existente en el módulo tocado.

15. **Priorizar siempre, en este orden**: estabilidad → escalabilidad → calidad de código → experiencia del estudiante → rendimiento → accesibilidad → diseño institucional. Nunca sacrificar estabilidad por un efecto visual.

16. **Este proyecto es un proyecto de grado**: toda decisión debe poder justificarse académicamente, no solo funcionar técnicamente — el contenido debe alinearse con el syllabus oficial y el marco pedagógico (Bloom, Benner) ya establecido para el Módulo 01, replicándolo para el resto cuando corresponda.

17. **No inventar información** sobre el estado del proyecto, contenido académico, o configuración externa (GitHub, Drive, hosting) — verificar directamente contra la fuente (repo, API, documento) antes de afirmar algo, y marcar explícitamente como pendiente lo que no se pueda verificar.

---

**Fin del documento.** Para actualizarlo en el futuro, regenerar siguiendo el mismo proceso: verificar contra el repo local, la API de GitHub y los documentos de Drive antes de escribir — nunca por memoria de una conversación anterior sin confirmar que sigue vigente.

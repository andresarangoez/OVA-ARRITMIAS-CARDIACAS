# Documentación técnica del OVA — Manejo de Arritmias Cardíacas

**Dirigido a:** Unidad de Virtualización Académica
**Propósito:** dar el contexto técnico necesario para evaluar la implementación institucional del proyecto.
**Fecha:** 2026-08-01

---

## 1. Qué es el proyecto

Objeto Virtual de Aprendizaje (OVA) interactivo sobre manejo de arritmias cardíacas, desarrollado como proyecto de grado para la Facultad de Enfermería. Está pensado como plataforma educativa (tipo curso universitario interactivo), no como un PDF ni una página informativa: incluye contenido teórico, simuladores clínicos, casos y autoevaluaciones distribuidos en 6 módulos.

Actualmente está publicado y funcionando en: **https://andresarangoez.github.io/OVA-ARRITMIAS-CARDIACAS/**

---

## 2. Tecnología utilizada (lo más importante para la implementación)

El proyecto está construido **exclusivamente con HTML, CSS y JavaScript "vanilla"** — sin React, Angular, Vue ni ningún framework, y **sin ningún paso de compilación/build**. Esto tiene una implicación práctica directa para ustedes:

> **El OVA es un conjunto de archivos estáticos.** No necesita un servidor de aplicaciones, base de datos, ni backend para funcionar. Cualquier servidor web capaz de servir archivos HTML/CSS/JS/imágenes (Apache, Nginx, IIS, el propio Moodle, GitHub Pages, etc.) puede alojarlo sin modificaciones.

Esto facilita mucho una futura integración institucional, pero también significa que **hoy no tiene backend propio** — ver la sección 6 sobre lo que eso implica.

---

## 3. Estructura del proyecto

```
/
├── index.html          → único punto de entrada (toda la navegación ocurre aquí, sin recargar la página)
├── css/                → estilos, organizados por responsabilidad (variables, layout, componentes…)
├── js/                 → lógica de la aplicación, organizada por responsabilidad
├── modules/             → el contenido de cada uno de los 6 módulos (un archivo HTML por módulo)
├── assets/
│   ├── images/          → logos institucionales e imágenes de contenido
│   └── models/          → modelo 3D del corazón (formato .glb)
└── docs/                → documentación del proyecto (este archivo incluido)
```

Los 6 módulos (Fundamentos, Valoración, Diagnóstico, Planeación, Intervención, Evaluación) siguen todos la misma estructura interna: pantalla de bienvenida con objetivos → contenido por unidades → caso clínico → actividad → autoevaluación → bibliografía. Esa consistencia fue una decisión de diseño deliberada, para que la experiencia sea predecible entre módulos.

---

## 4. Cómo funciona (a alto nivel)

- Es una **aplicación de una sola página (SPA)**: `index.html` se carga una vez, y el contenido de cada módulo se trae bajo demanda solo cuando el estudiante lo abre (no se descarga todo de entrada).
- Incluye **3 simuladores interactivos**: un simulador de ritmos electrocardiográficos (con ~17 arritmias distintas, cada una con su propio trazado calculado en tiempo real), un simulador del eje eléctrico cardíaco, y un módulo de identificación de estructuras del corazón sobre una imagen interactiva.
- Todo corre **en el navegador del estudiante**, sin llamadas a un servidor propio salvo para pedir los archivos del propio sitio.

---

## 5. Estado actual del desarrollo

- Los 6 módulos tienen contenido completo y funcional, con navegación, progreso visual, y los 3 simuladores operativos.
- El proyecto se sigue desarrollando de forma incremental (control de versiones en GitHub, con revisión antes de publicar cada cambio).
- Algunas funcionalidades avanzadas (cálculo dinámico de signos vitales según intervención clínica, efectos encadenados de medicamentos, banco ampliado de casos de pacientes) están planificadas en la arquitectura pero **aún no implementadas** — no afectan el uso actual del OVA, son mejoras futuras.

---

## 6. Consideraciones importantes para la implementación institucional

Estas son las preguntas que normalmente surgen al evaluar integrar algo así a la infraestructura de una universidad:

- **¿Necesita base de datos o servidor propio?** No. Es 100% archivos estáticos.
- **¿Guarda el progreso o las calificaciones del estudiante?** No todavía. El progreso que se ve mientras se navega (barra de progreso, "módulo completado") es solo visual, en el navegador — no se guarda en ningún registro ni se reporta a nadie. Si la universidad necesita que las calificaciones o el avance cuenten para una nota formal, **eso requiere desarrollo adicional** (conectar con Moodle vía SCORM/xAPI, o un backend propio para registrar resultados).
- **¿Requiere inicio de sesión?** No. Cualquiera con el enlace puede usarlo.
- **¿Cómo se podría integrar a Moodle?** Hay dos caminos típicos, a evaluar según lo que la universidad prefiera:
  1. **Enlazar/incrustar** el sitio ya publicado (como recurso externo o iframe dentro de un curso de Moodle) — es la opción más simple, no requiere tocar el código.
  2. **Empaquetar como SCORM** para que Moodle registre finalización/calificación — requiere trabajo adicional de adaptación, ya que hoy el OVA no genera ese tipo de reporte.
- **¿Dónde vive el código fuente?** Repositorio público en GitHub: `andresarangoez/OVA-ARRITMIAS-CARDIACAS`. El despliegue actual (GitHub Pages) es gratuito y se actualiza automáticamente con cada cambio aprobado.
- **¿Qué requiere el navegador del estudiante?** JavaScript habilitado (estándar en cualquier navegador moderno) y conexión a internet para cargar el modelo 3D y las fuentes tipográficas.

---

## 7. Créditos y autoría

Según el pie de página del propio OVA:

- **Investigador principal:** Carlos González, Paula Duarte
- **Coautores:** Andrés Arango, Erika Barrera, Luis Mantilla, Jhon Londoño, Laura Ramírez
- **Diseño y desarrollo web:** Andrés Arango
- **Guías clínicas de referencia:** American Heart Association (AHA) 2025, European Society of Cardiology (ESC) 2024
- **Facultad de Enfermería, Universidad FUCS — Proyecto de Grado 2026**

---

*Este documento resume la parte técnica relevante para una decisión de implementación institucional. Para el detalle completo de arquitectura de código, historial de desarrollo y roadmap, existe un documento técnico más extenso (`docs/HANDOFF_CONTEXT.md`) dirigido a equipo de desarrollo.*

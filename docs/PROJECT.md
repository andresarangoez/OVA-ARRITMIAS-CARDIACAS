# PROJECT.md

# Objeto Virtual de Aprendizaje (OVA)

## Manejo Integral de Arritmias Cardíacas

---

# Descripción

Este proyecto consiste en el desarrollo de un Objeto Virtual de Aprendizaje (OVA) para la Facultad de Enfermería de la Fundación Universitaria de Ciencias de la Salud (FUCS).

Su finalidad es fortalecer el aprendizaje del manejo de las arritmias cardíacas mediante simulación clínica interactiva, contenido multimedia y actividades de evaluación.

No debe concebirse como una página web tradicional, sino como un software educativo universitario de alta calidad.

---

# Público objetivo

- Estudiantes de Enfermería
- Estudiantes de Medicina
- Profesionales de Ciencias de la Salud

Nivel esperado:

Desde estudiantes de pregrado hasta personal de salud que requiera reforzar conocimientos.

---

# Objetivos educativos

El estudiante debe ser capaz de:

- Comprender la fisiología eléctrica cardíaca.
- Interpretar electrocardiogramas.
- Identificar arritmias.
- Diferenciar ritmos desfibrilables y no desfibrilables.
- Aplicar algoritmos ACLS.
- Seleccionar intervenciones de enfermería.
- Reconocer prioridades clínicas.
- Tomar decisiones mediante simulación.

---

# Estructura académica

El OVA estará organizado en seis módulos.

## Módulo 1

Fundamentos.

- Anatomía cardíaca.
- Sistema de conducción.
- Electrofisiología.
- ECG normal.

---

## Módulo 2

Valoración.

- Evaluación clínica.
- Signos y síntomas.
- Monitorización.
- Interpretación inicial.

---

## Módulo 3

Diagnóstico.

- Identificación de arritmias.
- Algoritmos diagnósticos.
- Casos clínicos.

---

## Módulo 4

Planeación.

- Prioridades.
- Objetivos.
- Cuidados.

---

## Módulo 5

Intervención.

- ACLS.
- Cardioversión.
- Desfibrilación.
- Medicamentos.
- Enfermería.

---

## Módulo 6

Evaluación.

- Casos integradores.
- Evaluaciones.
- Retroalimentación.

---

# Funcionalidades actuales

Actualmente el proyecto incluye:

- Dashboard principal.
- Navegación SPA.
- Simulador ECG.
- Canvas interactivo.
- Motor matemático ECG.
- Panel ACLS.
- Monitor clínico.
- Cambio de ritmos.
- Intervenciones clínicas.

---

# Funcionalidades futuras

Se implementarán progresivamente:

- Casos clínicos.
- Banco de preguntas.
- Retroalimentación automática.
- Sistema de progreso.
- Evaluaciones.
- Recursos multimedia.
- Animaciones.
- Corazón 3D.
- Modelos anatómicos.
- Escenarios clínicos.
- Estadísticas del estudiante.

---

# Simulador ECG

El simulador es uno de los componentes principales del proyecto.

Cada arritmia deberá contar con un modelo matemático propio.

La implementación inicial puede ser simplificada, pero la arquitectura debe permitir mejorar cada ritmo de forma independiente.

No reutilizar el algoritmo de una arritmia para representar otra.

Cada ritmo será refinado posteriormente utilizando:

- Literatura científica.
- Guías AHA.
- Guías ESC.
- Electrofisiología.
- Registros reales de ECG cuando sea posible.

---

# Filosofía de desarrollo

El proyecto crecerá por fases.

No desarrollar nuevas funcionalidades sobre una base inestable.

Orden de trabajo:

1. Arquitectura.
2. Corrección de errores.
3. Refactorización.
4. UX/UI.
5. Optimización.
6. Nuevas funcionalidades.
7. Simulación avanzada.
8. Validación científica.

---

# Estado actual

Actualmente estamos trabajando en:

- Mejorar la arquitectura.
- Mejorar la experiencia de usuario.
- Implementar identidad institucional.
- Organizar el código.
- Preparar el proyecto para escalar.

---

# Objetivo final

Desarrollar un software educativo universitario moderno que pueda utilizarse como herramienta de enseñanza del manejo de arritmias cardíacas para estudiantes y profesionales de Ciencias de la Salud.

La prioridad siempre será la calidad pedagógica, la estabilidad del software y la experiencia del usuario.
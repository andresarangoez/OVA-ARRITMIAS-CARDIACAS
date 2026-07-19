# CLAUDE.md

# Objeto Virtual de Aprendizaje (OVA)
## Manejo Integral de Arritmias Cardíacas

---

# Descripción del proyecto

Este proyecto corresponde al desarrollo de un Objeto Virtual de Aprendizaje (OVA) para la Facultad de Enfermería de la Fundación Universitaria de Ciencias de la Salud (FUCS).

Está dirigido principalmente a:

- Estudiantes de Enfermería.
- Estudiantes de Medicina.
- Profesionales de Ciencias de la Salud.

El objetivo no es crear una página web convencional, sino una plataforma educativa interactiva con apariencia de software profesional.

---

# Tecnologías

Utilizar únicamente:

- HTML5
- CSS3
- JavaScript Vanilla

No utilizar frameworks como:

- React
- Vue
- Angular

No utilizar Bootstrap.

No agregar dependencias innecesarias.

Todo el proyecto debe ser ligero, rápido y fácil de mantener.

---

# Filosofía del proyecto

Este proyecto debe sentirse como un software educativo moderno.

Inspiraciones de diseño:

- Apple Human Interface Guidelines
- Linear
- Philips Healthcare
- Siemens Healthineers
- GE Healthcare
- Complete Anatomy
- Elsevier ClinicalKey
- UpToDate

No copiar interfaces.

Solo utilizar principios de diseño.

---

# Objetivos principales

Prioridad de desarrollo:

1. Estabilidad
2. Escalabilidad
3. Calidad del código
4. Experiencia de usuario
5. Rendimiento
6. Accesibilidad
7. Diseño institucional

Nunca sacrificar estabilidad por efectos visuales.

---

# Arquitectura

El proyecto debe ser modular.

Separación de responsabilidades:

/css

/js

/assets

/data

/modules

Cada archivo debe tener una única responsabilidad.

Evitar archivos gigantes.

---

# Identidad visual FUCS

Utilizar únicamente la identidad institucional.

## Colores

Azul Fundadores

#092755

Color principal.

---

Azul Humano

#0A3E7C

Color secundario.

---

Dorado Tradición

#F8C680

Botones destacados.

Indicadores.

Acentos.

---

Amarillo Colonial

#FBD785

Fondos suaves.

Tarjetas informativas.

Elementos pedagógicos.

---

Gris San José

#C6C7C8

Bordes.

Separadores.

Texto secundario.

---

Niebla Capital

#E8E8E8

Fondos.

Paneles.

Tarjetas.

---

# Estilo visual

Diseño:

Minimalista.

Profesional.

Institucional.

Elegante.

Mucho espacio en blanco.

Jerarquía visual muy clara.

No utilizar colores saturados.

No utilizar sombras exageradas.

No utilizar efectos llamativos.

El diseño debe transmitir confianza y profesionalismo.

---

# Layout principal

La pantalla principal debe organizarse aproximadamente así:

HEADER

↓

Sidebar ACLS

↓

Zona central con corazón 3D

↓

Panel de módulos

↓

Panel de información clínica

Todo debe sentirse equilibrado.

---

# Componentes

Todos los componentes deben reutilizar estilos comunes.

Componentes principales:

- Buttons
- Cards
- Sidebar
- Navbar
- Panels
- Dialogs
- Tooltips
- Alerts
- Forms
- Badges

Nunca duplicar estilos.

---

# Tarjetas

Bordes redondeados.

24 px.

Mucho espacio interior.

Sombras muy suaves.

Hover elegante.

---

# Botones

Redondeados.

Consistentes.

Estados:

Normal

Hover

Active

Disabled

Focus

Nunca utilizar estilos diferentes para botones similares.

---

# Tipografía

Priorizar:

Inter

o

SF Pro Display

Si no están disponibles:

Segoe UI

Arial

Jerarquía clara:

H1

H2

H3

Body

Caption

Nunca utilizar tamaños aleatorios.

---

# Espaciado

Usar una escala consistente.

8 px

16 px

24 px

32 px

48 px

64 px

Evitar márgenes arbitrarios.

---

# Iconografía

Preferir:

Lucide Icons

o

Material Symbols

No mezclar diferentes estilos de iconos.

---

# Animaciones

Las animaciones deben ser discretas.

Duración:

200–300 ms

Utilizar:

ease

ease-in-out

Animaciones permitidas:

Fade

Scale

Slide

Hover

Nunca usar animaciones excesivas.

---

# Hover

Las tarjetas deben:

Elevarse ligeramente.

Incrementar sombra.

Cambiar sutilmente el borde.

Nunca realizar cambios bruscos.

---

# Gradientes

Solo gradientes muy suaves.

Ejemplo:

#FFFFFF

↓

#F6F8FB

Evitar gradientes intensos.

---

# Corazón 3D

El corazón será el elemento protagonista de la pantalla principal.

Debe transmitir innovación.

Puede utilizar:

Spline

Three.js

Modelo GLB

Debe rotar lentamente.

No distraer al usuario.

---

# Simulador ECG

El simulador es un componente independiente.

Cada ritmo cardíaco debe tener su propio modelo matemático.

Nunca reutilizar el algoritmo de una arritmia para representar otra.

Cada implementación debe poder evolucionar de manera independiente.

La arquitectura debe facilitar reemplazar un modelo sin afectar los demás.

---

# Contenido educativo

Todo el contenido debe seguir principios de aprendizaje activo.

Priorizar:

Casos clínicos.

Simulación.

Retroalimentación.

Evaluaciones.

No presentar bloques enormes de texto.

---

# Accesibilidad

Cumplir WCAG cuando sea posible.

Contraste adecuado.

Navegación por teclado.

aria-label.

aria-live.

Textos legibles.

---

# Responsive

Debe funcionar correctamente en:

Desktop.

Laptop.

Tablet.

Móvil.

Nunca romper el layout.

---

# Calidad del código

Código limpio.

Funciones pequeñas.

Variables con nombres claros.

Sin duplicación.

Sin código muerto.

Documentar funciones importantes.

---

# Antes de implementar cambios

Siempre:

Analizar.

Explicar.

Proponer.

Implementar.

Verificar.

---

# Después de cada modificación

Verificar que continúe funcionando:

Dashboard.

Navegación.

Simulador ECG.

Cambio de módulos.

Canvas.

Animaciones.

Acciones clínicas.

No introducir regresiones.

---

# Estilo de respuestas

Cuando propongas cambios:

1. Explica el objetivo.

2. Describe qué modificarás.

3. Indica posibles riesgos.

4. Implementa únicamente lo necesario.

5. Verifica que el proyecto continúe funcionando.

Nunca realices cambios masivos sin aprobación.

---

# Objetivo final

Construir un software educativo universitario de alta calidad para la enseñanza del manejo de arritmias cardíacas, con una interfaz moderna, profesional, accesible, escalable y alineada con la identidad institucional de la FUCS.

Cada decisión de diseño y desarrollo debe contribuir a este objetivo.
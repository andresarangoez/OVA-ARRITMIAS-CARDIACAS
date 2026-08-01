# Créditos de terceros

Este proyecto adapta lógica de código abierto de terceros. Este documento existe para cumplir la condición de las licencias correspondientes (conservar el aviso de copyright y de licencia), tal como lo exige cada una.

---

## Simulador de eje eléctrico cardíaco (Módulo 01, Unidad 5)

El cálculo de amplitud por derivación y la clasificación del eje en `js/15-simulador-eje.js` están adaptados del principio matemático de **ECG Axis Trainer**.

- Repositorio: https://github.com/david-shrk/ecgaxistrainer
- Autor: David Schaack
- Licencia: MIT License (Copyright (c) 2022 David Schaack)

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Ningún archivo del repositorio original fue copiado ni modificado directamente. El OVA reimplementa el principio matemático (proyección coseno del vector del eje sobre cada derivación) como funciones propias dentro de su propia arquitectura (`OVA.SimuladorEje`), con interfaz, estilos e interacción construidos desde cero para este proyecto.

---

## Estructuras del corazón (Módulo 01, Unidad 1)

El widget interactivo de identificación de estructuras cardíacas en `js/16-corazon-estructuras.js` / `css/13-corazon-estructuras.css` está inspirado en el simulador **Heart Structures** de Human Bio Media.

- Sitio: https://humanbiomedia.org
- Simulador de referencia: https://humanbiomedia.org/simulations/circulatory-system/cardiac-cycle/heart-structures.html
- Licencia: Creative Commons Attribution 4.0 International (CC BY 4.0)

> Human Bio Media materials are open-source and can be adapted and shared by anyone, including commercial organizations, according to the Creative Commons Attribution 4.0 International (CC BY 4.0) guidelines. If you are redistributing Human Bio Media materials in print or digital formats, you should include on every page the following attribution: Access for free at https://humanbiomedia.org.

El simulador original es una animación de Adobe Animate/CreateJS exportada a `<canvas>`, sin código ni archivo de imagen descargable — no existe un "archivo fuente" que copiar. La imagen `assets/images/corazon-estructuras-diagrama.png` se obtuvo exportando el propio `<canvas>` renderizado del simulador (`canvas.toDataURL()`), recortando únicamente el diagrama del corazón (sin la interfaz propia de Human Bio Media). El código de interacción (`js/16-corazon-estructuras.js`, `css/13-corazon-estructuras.css`) es propio, construido desde cero para la identidad visual del OVA. Las 14 estructuras, sus textos en español y su ubicación sobre la imagen fueron tomados y adaptados del contenido del simulador de referencia. La atribución requerida por la licencia aparece de forma visible al pie del widget en `modules/modulo-01.html`.

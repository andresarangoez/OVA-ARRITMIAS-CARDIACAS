# Créditos de terceros

Este proyecto adapta lógica de código abierto de terceros. Este documento existe para cumplir la condición de las licencias correspondientes (conservar el aviso de copyright y de licencia), tal como lo exige cada una.

---

## Simulador de eje eléctrico cardíaco (Módulo 01, Unidad 4)

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

El simulador original es una animación de Adobe Animate/CreateJS exportada a `<canvas>`, sin código ni archivo de imagen descargable — no existe un "archivo fuente" que copiar. La imagen `assets/images/corazon-estructuras-diagrama.png` se obtuvo exportando el propio `<canvas>` renderizado del simulador (`canvas.toDataURL()`), recortando únicamente el diagrama del corazón (sin la interfaz propia de Human Bio Media). El código de interacción (`js/16-corazon-estructuras.js`, `css/13-corazon-estructuras.css`) es propio, construido desde cero para la identidad visual del OVA. Las 16 estructuras, sus textos en español y su ubicación sobre la imagen fueron tomados y adaptados del contenido del simulador de referencia. La atribución requerida por la licencia aparece de forma visible al pie del widget en `modules/modulo-01.html`.

---

## Figura 1.4 — Circulación arterial coronaria (Módulo 01, Unidad 1)

La imagen `assets/images/figura-1-4-circulacion-coronaria.png` está basada en una ilustración de dominio compartido bajo licencia Creative Commons.

- Autor: Addicted
- Obra: *Coronary arterial circulation* [imagen]
- Fuente: Wikimedia Commons
- Licencia: Creative Commons Attribution 3.0 Unported (CC BY 3.0) — https://creativecommons.org/licenses/by/3.0/

La CC BY 3.0 permite adaptar y redistribuir la obra, incluso con fines comerciales, siempre que se atribuya la autoría, se enlace la licencia y **se indique si se hicieron cambios**. La imagen fue modificada: se tradujeron al español los rótulos de las arterias y sus ramas, y se adaptó la tipografía y la paleta a la identidad visual FUCS. Esa indicación de cambios y la atribución aparecen en el pie de figura visible dentro de `modules/modulo-01.html`.

---

## Modelo 3D del sistema de conducción (Módulo 01, Unidad 1)

El archivo `assets/models/sistema-conduccion-cardiaco.glb` es una versión modificada de un modelo de terceros.

- Obra original: *Leiden-Delft-Groningen — 3D model Cardiac Conduction System*
- **Autora: Anna Sieben** — https://annasieben.com/
- Publicado por: E-learning UMCG (Universitair Medisch Centrum Groningen) — https://sketchfab.com/eLearningUMCG
- Ficha oficial: https://anatomytool.org/content/leiden-delft-groningen-3d-model-cardiac-conduction-system-numbered-english-labels
- Descarga: https://sketchfab.com/3d-models/cardiac-conduction-system-20a5e36391474f2b99e1a4c94c707b47 (https://skfb.ly/6WsDv)
- Licencia: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0) — https://creativecommons.org/licenses/by-nc-sa/4.0/

> **Texto de atribución exigido por el autor**, reproducido literalmente al pie del modelo en el OVA:
>
> «Leiden-Delft-Groningen — 3D model Cardiac Conduction System» de Anna Sieben, licencia CC BY-NC-SA. De E-learning UMCG.

### Modificación realizada (la licencia exige declararla)

El modelo original declaraba `KHR_materials_pbrSpecularGlossiness` como extensión **requerida**. Esa extensión está archivada por Khronos y three.js retiró su soporte en la versión r155, de modo que `model-viewer` la ignora y descarta los materiales: el modelo se cargaba con ambas mallas en blanco puro y totalmente opacas, lo que dejaba el sistema de conducción encerrado e invisible dentro del miocardio.

Se convirtieron los dos materiales al modelo estándar `pbrMetallicRoughness`. La conversión es exacta —sin pérdida— porque ningún material usa texturas y ambos tenían `specularFactor [0,0,0]` con `glossinessFactor 0`:

| | Original (specGloss) | Convertido (metalRough) |
|---|---|---|
| Color | `diffuseFactor [0.5, 0.5, 0.5, α]` | `baseColorFactor [0.5, 0.5, 0.5, α]` |
| Metalicidad | specular nulo ⇒ dieléctrico | `metallicFactor 0` |
| Rugosidad | `glossinessFactor 0` | `roughnessFactor 1` |

Además se corrigieron tres defectos de material que impedían ver el modelo correctamente:

- **`baseColorFactor` a 1.0.** El modelo lleva los colores pintados en los vértices (`COLOR_0`) y en glTF el color final es `baseColorFactor × COLOR_0`; el `[0.5, 0.5, 0.5]` original atenuaba a la mitad el trabajo de color de la autora.
- **`alphaMode` a OPAQUE y doble cara.** El miocardio venía con `BLEND` (alfa 0,983, una transparencia del 1,7% que no aportaba nada) y con las caras traseras descartadas. Como el modelo está seccionado, al mirar dentro de las cavidades se veía la cara interna de la pared opuesta, que al no dibujarse dejaba pasar el fondo: aparecían huecos transparentes.
- **Color de las fibras.** El `emissiveFactor` se fijó en `#FFDE21` (convertido a espacio lineal, que es como glTF almacena ese campo) para que la red de conducción tenga un amarillo definido y uniforme.

**La geometría no se tocó** en ninguna de estas modificaciones: el bloque binario del GLB se copió byte a byte, y se verificó que accesores, vistas de búfer, desplazamientos y valores mínimo/máximo quedaran idénticos.

Al ser una obra derivada bajo CC BY-NC-SA, el archivo modificado queda cubierto por la misma licencia. La atribución aparece de forma visible al pie del modelo en `modules/modulo-01.html`, y la nota de modificación va también incrustada en el campo `asset.copyright` del propio GLB.

> ⚠️ **Cláusula NonCommercial:** esta licencia prohíbe el uso comercial. Que un OVA educativo de una universidad privada con matrícula encaje en «uso no comercial» es una zona gris reconocida por la propia Creative Commons. Conviene confirmarlo con la Facultad antes del despliegue definitivo.

---

## Nota pendiente sobre las figuras 1.1, 1.2 y 1.3

Las figuras 1.1 (tabiques), 1.2 (capas de la pared cardíaca) y 1.3 (válvulas) se acreditan en el OVA como «modificada y adaptada de Netter FH. *Atlas de anatomía humana*. 2.ª ed. 1999».

El *Atlas* de Netter es una obra con derechos de autor vigentes (Elsevier). Citar la fuente cumple la exigencia académica de atribución, pero **no equivale a una licencia de uso**: la adaptación y redistribución pública de estas ilustraciones en un sitio accesible por internet puede requerir autorización del titular.

Conviene verificarlo con la Facultad o la biblioteca de la FUCS antes del despliegue definitivo, y valorar alternativas de licencia abierta si no se obtiene autorización (por ejemplo, ilustraciones de Wikimedia Commons con licencia CC, como la usada en la figura 1.4, o de OpenStax Anatomy & Physiology, con licencia CC BY 4.0).

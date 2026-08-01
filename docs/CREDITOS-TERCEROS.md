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

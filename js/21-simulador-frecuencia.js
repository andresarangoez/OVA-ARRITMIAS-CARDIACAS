(function (OVA) {
    OVA.SimuladorFrecuencia = OVA.SimuladorFrecuencia || {};

// --- CÁLCULO DE LA FRECUENCIA CARDÍACA SOBRE PAPEL DE ECG (Módulo 01, Unidad 4) ---
//
// Tres piezas que comparten el mismo papel milimetrado dibujado en SVG:
//
//   data-ejercicio="papel"          Figura 4.3 — papel acotado, sin interacción.
//   data-ejercicio="regla300"       Recurso interactivo — regla rápida de frecuencia.
//   data-ejercicio="seis-segundos"  Recurso interactivo — conteo en 6 segundos.
//
// El sistema de coordenadas del SVG está en MILÍMETROS REALES de papel: el
// viewBox mide lo que mediría la tira impresa, de modo que un cuadro pequeño
// es 1 unidad y uno grande 5. Así las cuentas del ejercicio (300 / cuadros
// grandes, 1500 / cuadros pequeños) se hacen sobre las mismas magnitudes que
// el estudiante ve, sin factores de conversión intermedios. A la velocidad
// estándar de 25 mm/s, 1 mm = 0,04 s y 1 cuadro grande = 0,2 s.
//
// El trazado PQRST es sintético y se dibuja de forma analítica a partir de la
// posición de cada onda R. No usa el motor del simulador clínico
// (OVA.MotorECG) a propósito: aquí hace falta que la R caiga EXACTAMENTE sobre
// una línea de cuadro grande para que el conteo del ejercicio sea verificable,
// y el motor trabaja en tiempo real con jitter fisiológico.
//
// Montaje: los módulos se inyectan con innerHTML, así que el <script> no se
// ejecuta al cargarlos. Se usa el mismo MutationObserver sobre #vista-modulo
// que el simulador de eje; el resto de la interacción cuelga de los onclick
// declarados en el HTML del módulo.

const NS = 'http://www.w3.org/2000/svg';

// Valor de la regla para 1, 2, 3... cuadros grandes de separación (300 / n).
const SECUENCIA_REGLA = [300, 150, 100, 75, 60, 50, 43, 38];

// Separaciones posibles entre R y R, en cuadros grandes, para los casos del
// ejercicio. Se excluye 1 (300 lpm) por inverosímil y 7 por poco didáctico.
const SEPARACIONES = [2, 3, 4, 5, 6, 8];

const PAPEL_REGLA = { anchoMm: 150, altoMm: 32, pxPorMm: 5 };
const PAPEL_SEIS = { anchoMm: 250, altoMm: 36, pxPorMm: 4 };
const PAPEL_FIGURA = { anchoMm: 60, altoMm: 32, pxPorMm: 6 };

const MM_POR_SEGUNDO = 25; // velocidad estándar de registro

let contadorIds = 0;

// --- UTILIDADES DE DIBUJO ---

function crear(nombre, atributos, texto) {
    const nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach((k) => nodo.setAttribute(k, atributos[k]));
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

function nuevoSvg(papel) {
    const svg = crear('svg', {
        viewBox: '0 0 ' + papel.anchoMm + ' ' + papel.altoMm,
        width: papel.anchoMm * papel.pxPorMm,
        height: papel.altoMm * papel.pxPorMm,
        class: 'simulador-fc-svg'
    });
    svg.dataset.anchoMm = papel.anchoMm;
    return svg;
}

// Cuadrícula de papel de ECG: líneas finas cada 1 mm y gruesas cada 5 mm.
// Se dibuja con dos <pattern> para no generar cientos de nodos por tira.
function dibujarCuadricula(svg, papel) {
    const id = 'fc-papel-' + (++contadorIds);
    const defs = crear('defs');

    const finas = crear('pattern', {
        id: id + '-finas', width: 1, height: 1, patternUnits: 'userSpaceOnUse'
    });
    finas.appendChild(crear('path', { d: 'M1,0 V1 M0,1 H1', class: 'simulador-fc-rejilla-fina' }));

    const gruesas = crear('pattern', {
        id: id + '-gruesas', width: 5, height: 5, patternUnits: 'userSpaceOnUse'
    });
    gruesas.appendChild(crear('rect', {
        width: 5, height: 5, fill: 'url(#' + id + '-finas)'
    }));
    gruesas.appendChild(crear('path', { d: 'M5,0 V5 M0,5 H5', class: 'simulador-fc-rejilla-gruesa' }));

    defs.appendChild(finas);
    defs.appendChild(gruesas);
    svg.appendChild(defs);

    svg.appendChild(crear('rect', {
        x: 0, y: 0, width: papel.anchoMm, height: papel.altoMm,
        class: 'simulador-fc-fondo'
    }));
    svg.appendChild(crear('rect', {
        x: 0, y: 0, width: papel.anchoMm, height: papel.altoMm,
        fill: 'url(#' + id + '-gruesas)'
    }));
}

// Un complejo PQRST completo, con la onda R centrada en xR. Las alturas están
// en milímetros de papel, de modo que la R mide ~9 mm (algo menos de 1 mV).
// Vértices del QRS en milímetros respecto a la onda R (dx, altura sobre la
// línea de base; positivo = hacia abajo). El complejo mantiene su anchura
// aunque cambie la frecuencia, igual que en un ECG real: lo que se acorta al
// acelerarse el ritmo es la diástole eléctrica, no el QRS.
const NODOS_QRS = [[-1.6, 0], [-1.2, 1], [0, -9], [1.2, 2.6], [2, 0]];

// Voltaje del trazado en el punto x. Las ondas P y T se reparten el hueco que
// queda entre dos QRS, de modo que a R-R cortos se estrechan en vez de
// solaparse con el complejo vecino.
function voltaje(x, posiciones, base) {
    let indice = 0;
    let menor = Infinity;
    for (let k = 0; k < posiciones.length; k++) {
        const d = Math.abs(x - posiciones[k]);
        if (d < menor) { menor = d; indice = k; }
    }

    const xR = posiciones[indice];
    const dx = x - xR;

    if (dx >= NODOS_QRS[0][0] && dx <= NODOS_QRS[NODOS_QRS.length - 1][0]) {
        for (let n = 0; n < NODOS_QRS.length - 1; n++) {
            const [x1, y1] = NODOS_QRS[n];
            const [x2, y2] = NODOS_QRS[n + 1];
            if (dx >= x1 && dx <= x2) {
                return base + y1 + (y2 - y1) * ((dx - x1) / (x2 - x1));
            }
        }
    }

    const anterior = indice > 0 ? xR - posiciones[indice - 1] : null;
    const siguiente = indice < posiciones.length - 1 ? posiciones[indice + 1] - xR : null;
    const rr = (dx < 0 ? anterior || siguiente : siguiente || anterior) || 25;
    const hueco = Math.max(rr - 3.6, 2);

    if (dx > 0) {
        const ancho = Math.min(5, hueco * 0.45);
        const inicio = 2 + hueco * 0.08;
        if (dx >= inicio && dx <= inicio + ancho) {
            return base - 3 * Math.sin(Math.PI * (dx - inicio) / ancho);   // onda T
        }
    } else {
        const ancho = Math.min(4, hueco * 0.32);
        const fin = -1.6 - hueco * 0.12;
        if (dx >= fin - ancho && dx <= fin) {
            return base - 1.5 * Math.sin(Math.PI * (dx - fin + ancho) / ancho); // onda P
        }
    }

    return base;
}

function dibujarTrazado(svg, posicionesR, papel) {
    const base = papel.altoMm - 11;
    const paso = 0.2;
    const puntos = [];
    for (let x = 0; x <= papel.anchoMm; x += paso) {
        puntos.push(x.toFixed(2) + ',' + voltaje(x, posicionesR, base).toFixed(2));
    }

    const grupo = crear('g', { class: 'simulador-fc-trazo-grupo' });
    grupo.appendChild(crear('path', { d: 'M' + puntos.join(' L'), class: 'simulador-fc-trazo' }));
    svg.appendChild(grupo);
    return base;
}

function raizDe(nodo) {
    return nodo.closest('.simulador-fc');
}

function escribirFeedback(raiz, texto, estado) {
    const p = raiz.querySelector('.simulador-fc-feedback');
    if (!p) return;
    p.textContent = texto || '';
    p.className = 'simulador-fc-feedback' + (estado ? ' ' + estado : '');
}

function escribirPaso(raiz, texto) {
    const p = raiz.querySelector('.simulador-fc-paso');
    if (p) p.textContent = texto;
}

function anotarMarcador(raiz, acierto) {
    const aciertos = parseInt(raiz.dataset.aciertos || '0', 10) + (acierto ? 1 : 0);
    const intentos = parseInt(raiz.dataset.intentos || '0', 10) + 1;
    raiz.dataset.aciertos = aciertos;
    raiz.dataset.intentos = intentos;
    const marcador = raiz.querySelector('.simulador-fc-marcador');
    if (marcador) marcador.textContent = aciertos + '/' + intentos;
    const envoltura = raiz.querySelector('.simulador-fc-marcador-wrap');
    if (envoltura) envoltura.hidden = false;
}

// --- FIGURA 4.3: PAPEL ACOTADO ---

function montarPapel(raiz) {
    const papel = PAPEL_FIGURA;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;
    lienzo.textContent = '';

    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);

    const cotas = crear('g', { class: 'simulador-fc-cotas' });

    // Cota horizontal de un cuadro grande (5 mm = 0,2 s).
    cotas.appendChild(crear('path', { d: 'M20,27 H25', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('path', { d: 'M20,25.8 V28.2 M25,25.8 V28.2', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('text', { x: 22.5, y: 31, class: 'simulador-fc-cota-texto' }, '5 mm = 0,20 s'));

    // Cota horizontal de un cuadro pequeño (1 mm = 0,04 s).
    cotas.appendChild(crear('path', { d: 'M34,27 H35', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('path', { d: 'M34,25.8 V28.2 M35,25.8 V28.2', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('text', { x: 38, y: 31, class: 'simulador-fc-cota-texto' }, '1 mm = 0,04 s'));

    // Cota vertical de calibración (10 mm = 1 mV).
    cotas.appendChild(crear('path', { d: 'M8,5 V15', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('path', { d: 'M6.8,5 H9.2 M6.8,15 H9.2', class: 'simulador-fc-cota' }));
    cotas.appendChild(crear('text', {
        x: 0, y: 0, class: 'simulador-fc-cota-texto',
        transform: 'translate(5.4,10) rotate(-90)'
    }, '10 mm = 1 mV'));

    // Marca de calibración, tal como la imprime el equipo al inicio de la tira.
    cotas.appendChild(crear('path', {
        d: 'M12,20 H15 L15,10 H20 L20,20 H24',
        class: 'simulador-fc-calibracion'
    }));

    cotas.appendChild(crear('text', { x: 30, y: 4.5, class: 'simulador-fc-cota-titulo' }, 'Velocidad del papel = 25 mm/s'));

    svg.appendChild(cotas);
    lienzo.appendChild(svg);
}

// --- RECURSO INTERACTIVO 1: REGLA RÁPIDA DE FRECUENCIA ---

function montarRegla(raiz, separacionCuadros) {
    const papel = PAPEL_REGLA;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;

    const separacion = separacionCuadros || SEPARACIONES[Math.floor(Math.random() * SEPARACIONES.length)];
    const pasoMm = separacion * 5;
    const primeraR = 14;

    const posiciones = [];
    for (let x = primeraR; x <= papel.anchoMm - 12; x += pasoMm) posiciones.push(x);

    lienzo.textContent = '';
    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);
    const base = dibujarTrazado(svg, posiciones, papel);

    // Zonas sensibles sobre cada onda R: es donde el estudiante hace clic en
    // el paso 1. Son transparentes y más anchas que la R para que el acierto
    // no dependa de la puntería.
    const zonas = crear('g', { class: 'simulador-fc-zonas' });
    posiciones.forEach((x, indice) => {
        const zona = crear('rect', {
            x: x - 2.5, y: 2, width: 5, height: papel.altoMm - 4,
            class: 'simulador-fc-zona-r'
        });
        zona.addEventListener('click', () => marcarPrimeraR(raiz, indice));
        zonas.appendChild(zona);
    });
    svg.appendChild(zonas);
    svg.appendChild(crear('g', { class: 'simulador-fc-regla' }));

    lienzo.appendChild(svg);

    raiz.dataset.separacion = separacion;
    raiz.dataset.pasoMm = pasoMm;
    raiz.dataset.base = base;
    raiz.dataset.posiciones = posiciones.join(',');
    raiz.dataset.fase = 'marcar';

    escribirPaso(raiz, 'Paso 1 · Haz clic sobre una onda R del trazado para empezar a contar desde ahí.');
    escribirFeedback(raiz, '');
}

function marcarPrimeraR(raiz, indice) {
    if (raiz.dataset.fase !== 'marcar') return;

    const posiciones = raiz.dataset.posiciones.split(',').map(Number);
    // Hace falta que quede al menos una R más a la derecha para poder contar.
    if (indice >= posiciones.length - 1) {
        escribirFeedback(raiz, 'Elige una onda R que tenga otra a su derecha: el conteo va de una R a la siguiente.', 'incorrecto');
        return;
    }

    const svg = raiz.querySelector('.simulador-fc-svg');
    const papel = PAPEL_REGLA;
    const base = parseFloat(raiz.dataset.base);
    const xR = posiciones[indice];
    const grupoRegla = svg.querySelector('.simulador-fc-regla');
    grupoRegla.textContent = '';

    grupoRegla.appendChild(crear('circle', {
        cx: xR, cy: base - 9, r: 1.6, class: 'simulador-fc-marca-r'
    }));
    grupoRegla.appendChild(crear('path', {
        d: 'M' + xR + ',7 V' + (base - 9), class: 'simulador-fc-marca-inicio'
    }));
    grupoRegla.appendChild(crear('text', {
        x: xR - 1.5, y: 10.4, class: 'simulador-fc-marca-texto'
    }, 'Comenzar'));

    // La secuencia 300, 150, 100... se ancla a cada línea de cuadro grande
    // que sigue a la R marcada, exactamente como la regla impresa.
    SECUENCIA_REGLA.forEach((valor, i) => {
        const x = xR + (i + 1) * 5;
        if (x > papel.anchoMm - 2) return;

        const etiqueta = crear('g', { class: 'simulador-fc-etiqueta-regla', tabindex: '0', role: 'button' });
        etiqueta.dataset.valor = valor;
        etiqueta.dataset.cuadros = i + 1;
        etiqueta.appendChild(crear('rect', {
            x: x - 2.3, y: 1.5, width: 4.6, height: 5, rx: .8,
            class: 'simulador-fc-etiqueta-fondo'
        }));
        etiqueta.appendChild(crear('text', { x: x, y: 5.2, class: 'simulador-fc-etiqueta-texto' }, valor));
        etiqueta.appendChild(crear('path', {
            d: 'M' + x + ',6.5 V' + (base - 10), class: 'simulador-fc-etiqueta-guia'
        }));
        etiqueta.addEventListener('click', () => responderRegla(raiz, etiqueta));
        etiqueta.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); responderRegla(raiz, etiqueta); }
        });
        grupoRegla.appendChild(etiqueta);
    });

    raiz.dataset.fase = 'elegir';
    raiz.dataset.xInicio = xR;
    escribirPaso(raiz, 'Paso 2 · Mira dónde cae la siguiente onda R y pulsa el número que le corresponde.');
    escribirFeedback(raiz, '');
}

function responderRegla(raiz, etiqueta) {
    if (raiz.dataset.fase !== 'elegir') return;

    const cuadros = parseInt(etiqueta.dataset.cuadros, 10);
    const correctos = parseInt(raiz.dataset.separacion, 10);
    const acierto = cuadros === correctos;
    const valorCorrecto = SECUENCIA_REGLA[correctos - 1];

    raiz.querySelectorAll('.simulador-fc-etiqueta-regla').forEach((g) => {
        g.classList.remove('acertada', 'fallada');
        if (parseInt(g.dataset.cuadros, 10) === correctos) g.classList.add('acertada');
    });
    if (!acierto) etiqueta.classList.add('fallada');

    raiz.dataset.fase = 'resuelto';
    anotarMarcador(raiz, acierto);

    const cuadrosPequenos = correctos * 5;
    const detalle = 'Hay ' + correctos + ' cuadros grandes entre las dos ondas R: 300 ÷ ' + correctos +
        ' = ' + valorCorrecto + ' lpm. Con cuadros pequeños, 1500 ÷ ' + cuadrosPequenos + ' = ' +
        Math.round(1500 / cuadrosPequenos) + ' lpm.';

    escribirFeedback(raiz, (acierto ? 'Correcto. ' : 'No era ese. ') + detalle, acierto ? 'correcto' : 'incorrecto');
    escribirPaso(raiz, 'Pulsa «Otro trazado» para practicar con una separación distinta.');
}

// --- RECURSO INTERACTIVO 2: CONTEO EN 6 SEGUNDOS ---

function montarSeisSegundos(raiz) {
    const papel = PAPEL_SEIS;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;

    // Ritmo irregular: R-R variable entre 11 y 26 mm (de 0,44 a 1,04 s). Se
    // evita que una R caiga a menos de 2,5 mm de una marca de segundo para que
    // nunca haya duda de si el complejo entra o no en el tramo elegido.
    const posiciones = [];
    let x = 12;
    while (x < papel.anchoMm - 12) {
        let xr = x;
        const resto = xr % MM_POR_SEGUNDO;
        if (resto < 3) xr += 3 - resto;
        else if (resto > MM_POR_SEGUNDO - 3) xr += MM_POR_SEGUNDO + 3 - resto;
        if (xr < papel.anchoMm - 12) posiciones.push(Math.round(xr * 100) / 100);
        x = xr + 11 + Math.random() * 15;
    }

    lienzo.textContent = '';
    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);
    const base = dibujarTrazado(svg, posiciones, papel);

    // Marcas de 1 segundo en el borde superior, como en un registro real.
    const marcas = crear('g', { class: 'simulador-fc-marcas' });
    const totalSegundos = Math.floor(papel.anchoMm / MM_POR_SEGUNDO);
    for (let s = 0; s <= totalSegundos; s++) {
        const xm = s * MM_POR_SEGUNDO;
        const marca = crear('g', { class: 'simulador-fc-marca', tabindex: '0', role: 'button' });
        marca.dataset.segundo = s;
        marca.appendChild(crear('rect', {
            x: xm - 2, y: 0, width: 4, height: 8, class: 'simulador-fc-marca-zona'
        }));
        marca.appendChild(crear('path', { d: 'M' + xm + ',0 V5', class: 'simulador-fc-marca-linea' }));
        marca.appendChild(crear('text', { x: xm, y: 8, class: 'simulador-fc-marca-numero' }, s));
        marca.addEventListener('click', () => elegirMarca(raiz, s));
        marca.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); elegirMarca(raiz, s); }
        });
        marcas.appendChild(marca);
    }
    svg.appendChild(marcas);
    svg.appendChild(crear('g', { class: 'simulador-fc-tramo' }));

    // Zonas sensibles sobre cada QRS para el conteo del paso 2.
    const zonas = crear('g', { class: 'simulador-fc-zonas' });
    posiciones.forEach((xr, indice) => {
        const zona = crear('g', { class: 'simulador-fc-zona-qrs' });
        zona.dataset.indice = indice;
        zona.dataset.x = xr;
        zona.appendChild(crear('rect', {
            x: xr - 3, y: 9, width: 6, height: papel.altoMm - 11, class: 'simulador-fc-zona-qrs-area'
        }));
        zona.appendChild(crear('text', { x: xr, y: 13, class: 'simulador-fc-zona-qrs-numero' }, ''));
        zona.addEventListener('click', () => contarQrs(raiz, indice));
        zonas.appendChild(zona);
    });
    svg.appendChild(zonas);

    lienzo.appendChild(svg);

    raiz.dataset.base = base;
    raiz.dataset.posiciones = posiciones.join(',');
    raiz.dataset.fase = 'inicio';
    raiz.dataset.contados = '';
    delete raiz.dataset.segInicio;

    const confirmar = raiz.querySelector('.simulador-fc-confirmar');
    if (confirmar) confirmar.hidden = true;
    actualizarContador(raiz);

    escribirPaso(raiz, 'Paso 1 · Pulsa la marca de segundo donde quieras empezar y después la marca 6 segundos más allá.');
    escribirFeedback(raiz, '');
}

function elegirMarca(raiz, segundo) {
    const fase = raiz.dataset.fase;
    if (fase !== 'inicio' && fase !== 'fin') return;

    if (fase === 'inicio') {
        raiz.dataset.segInicio = segundo;
        raiz.dataset.fase = 'fin';
        pintarTramo(raiz, segundo, segundo);
        escribirPaso(raiz, 'Paso 1 · Ahora pulsa la marca que cierra un tramo de 6 segundos.');
        escribirFeedback(raiz, '');
        return;
    }

    const inicio = parseInt(raiz.dataset.segInicio, 10);
    const duracion = Math.abs(segundo - inicio);

    if (duracion === 0) {
        raiz.dataset.fase = 'inicio';
        pintarTramo(raiz, null, null);
        escribirPaso(raiz, 'Paso 1 · Pulsa la marca de segundo donde quieras empezar y después la marca 6 segundos más allá.');
        return;
    }

    if (duracion !== 6) {
        escribirFeedback(raiz, 'Ese tramo mide ' + duracion + ' segundos. El conteo necesita exactamente 6: cuenta seis marcas desde la de inicio.', 'incorrecto');
        return;
    }

    const desde = Math.min(inicio, segundo);
    raiz.dataset.segInicio = desde;
    raiz.dataset.fase = 'contar';
    pintarTramo(raiz, desde, desde + 6);

    const confirmar = raiz.querySelector('.simulador-fc-confirmar');
    if (confirmar) confirmar.hidden = false;

    escribirPaso(raiz, 'Paso 2 · Haz clic sobre cada complejo QRS que quede dentro del tramo. Vuelve a pulsarlo si te equivocas.');
    escribirFeedback(raiz, '');
}

function pintarTramo(raiz, desde, hasta) {
    const svg = raiz.querySelector('.simulador-fc-svg');
    const grupo = svg.querySelector('.simulador-fc-tramo');
    const papel = PAPEL_SEIS;
    grupo.textContent = '';
    if (desde === null) return;

    const x1 = desde * MM_POR_SEGUNDO;
    const x2 = hasta * MM_POR_SEGUNDO;

    grupo.appendChild(crear('rect', {
        x: x1, y: 5, width: Math.max(x2 - x1, 0), height: papel.altoMm - 5,
        class: 'simulador-fc-tramo-area'
    }));
    grupo.appendChild(crear('path', {
        d: 'M' + x1 + ',5 V' + papel.altoMm, class: 'simulador-fc-tramo-borde'
    }));
    if (x2 > x1) {
        grupo.appendChild(crear('path', {
            d: 'M' + x2 + ',5 V' + papel.altoMm, class: 'simulador-fc-tramo-borde'
        }));
        grupo.appendChild(crear('path', {
            d: 'M' + x1 + ',' + (papel.altoMm - 1.5) + ' H' + x2,
            class: 'simulador-fc-tramo-borde'
        }));
        grupo.appendChild(crear('text', {
            x: (x1 + x2) / 2, y: papel.altoMm - 2.6, class: 'simulador-fc-tramo-texto'
        }, (hasta - desde) + ' segundos'));
    }
}

function contarQrs(raiz, indice) {
    if (raiz.dataset.fase !== 'contar') return;

    const contados = (raiz.dataset.contados || '').split(',').filter((v) => v !== '');
    const clave = String(indice);
    const posicion = contados.indexOf(clave);
    if (posicion === -1) contados.push(clave); else contados.splice(posicion, 1);
    raiz.dataset.contados = contados.join(',');

    // Se renumeran de izquierda a derecha para que el conteo visible siga el
    // orden del trazado y no el orden en que el estudiante fue pulsando.
    const ordenados = contados.map(Number).sort((a, b) => a - b);
    raiz.querySelectorAll('.simulador-fc-zona-qrs').forEach((zona) => {
        const i = parseInt(zona.dataset.indice, 10);
        const n = ordenados.indexOf(i);
        zona.classList.toggle('contado', n !== -1);
        zona.querySelector('.simulador-fc-zona-qrs-numero').textContent = n === -1 ? '' : (n + 1);
    });

    actualizarContador(raiz);
}

function actualizarContador(raiz) {
    const contados = (raiz.dataset.contados || '').split(',').filter((v) => v !== '');
    const salida = raiz.querySelector('.simulador-fc-contador');
    if (salida) salida.textContent = contados.length;
}

function confirmarConteo(boton) {
    const raiz = raizDe(boton);
    if (!raiz || raiz.dataset.fase !== 'contar') return;

    const desde = parseInt(raiz.dataset.segInicio, 10) * MM_POR_SEGUNDO;
    const hasta = desde + 6 * MM_POR_SEGUNDO;
    const posiciones = raiz.dataset.posiciones.split(',').map(Number);
    const reales = posiciones.filter((x) => x >= desde && x <= hasta).length;
    const contados = (raiz.dataset.contados || '').split(',').filter((v) => v !== '').length;
    const acierto = contados === reales;

    raiz.dataset.fase = 'resuelto';
    anotarMarcador(raiz, acierto);

    const texto = acierto
        ? 'Correcto: ' + reales + ' complejos en 6 segundos × 10 = ' + (reales * 10) + ' latidos por minuto.'
        : 'Contaste ' + contados + '. Dentro del tramo hay ' + reales + ' complejos: ' + reales +
          ' × 10 = ' + (reales * 10) + ' latidos por minuto.';
    escribirFeedback(raiz, texto, acierto ? 'correcto' : 'incorrecto');
    escribirPaso(raiz, 'Pulsa «Otro trazado» para practicar con otro ritmo.');

    const confirmar = raiz.querySelector('.simulador-fc-confirmar');
    if (confirmar) confirmar.hidden = true;
}

// --- MODO SIN TRAZADO (calculadora de la fórmula) ---

function alternarCalculadora(boton) {
    const raiz = raizDe(boton);
    if (!raiz) return;
    const caja = raiz.querySelector('.simulador-fc-calculadora');
    if (!caja) return;
    caja.hidden = !caja.hidden;
    boton.textContent = caja.hidden ? 'Modo sin trazado' : 'Ocultar modo sin trazado';
    if (!caja.hidden) {
        const campo = caja.querySelector('.simulador-fc-campo');
        if (campo) campo.focus();
    }
}

function calcular(campo) {
    const raiz = raizDe(campo);
    if (!raiz) return;
    const salida = raiz.querySelector('.simulador-fc-resultado');
    if (!salida) return;

    const cuadros = parseFloat(campo.value);
    if (!cuadros || cuadros <= 0) { salida.textContent = ''; return; }

    const fc = Math.round(300 / cuadros);
    salida.textContent = '300 ÷ ' + cuadros + ' = ' + fc + ' lpm  ·  equivale a 1500 ÷ ' +
        (cuadros * 5) + ' cuadros pequeños.';
}

// --- API Y MONTAJE ---

function nuevoCaso(boton) {
    const raiz = raizDe(boton);
    if (!raiz) return;
    montar(raiz, true);
}

function montar(raiz, forzar) {
    if (!forzar && raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';

    if (raiz.dataset.ejercicio === 'papel') montarPapel(raiz);
    else if (raiz.dataset.ejercicio === 'seis-segundos') montarSeisSegundos(raiz);
    else montarRegla(raiz);
}

// Los módulos se insertan con innerHTML: el observador detecta el montaje del
// widget sin depender de un hook de carga. Mismo patrón que el simulador de eje.
const observadorFrecuencia = new MutationObserver((mutaciones) => {
    mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('simulador-fc')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.simulador-fc')) : []);
            raices.forEach((raiz) => montar(raiz, false));
        });
    });
});

const vistaModuloFc = document.getElementById('vista-modulo');
if (vistaModuloFc) observadorFrecuencia.observe(vistaModuloFc, { childList: true, subtree: true });

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.SimuladorFrecuencia.nuevoCaso = nuevoCaso;
    OVA.SimuladorFrecuencia.alternarCalculadora = alternarCalculadora;
    OVA.SimuladorFrecuencia.calcular = calcular;
    OVA.SimuladorFrecuencia.confirmarConteo = confirmarConteo;
    OVA.SimuladorFrecuencia.montar = montar;

})(window.OVA = window.OVA || {});

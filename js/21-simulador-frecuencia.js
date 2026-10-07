(function (OVA) {
    OVA.SimuladorFrecuencia = OVA.SimuladorFrecuencia || {};

// --- MEDIR SOBRE EL PAPEL DE ECG (Módulo 01, Unidad 4) ---
//
// Dos piezas que comparten un mismo instrumento, el calibrador:
//
//   data-ejercicio="papel"       Figura 4.3 — el papel, medible en tiempo y voltaje.
//   data-ejercicio="frecuencia"  Recurso interactivo con dos modos:
//                                 · ritmo regular   → reglas de 300 y de 1500
//                                 · ritmo irregular → conteo en 6 segundos
//
// El sistema de coordenadas del SVG está en MILÍMETROS REALES de papel: el
// viewBox mide lo que mediría la tira impresa, de modo que un cuadro pequeño
// es 1 unidad y uno grande 5. Las cuentas del ejercicio se hacen sobre las
// mismas magnitudes que ve el estudiante. A 25 mm/s, 1 mm = 0,04 s.
//
// Principio de diseño: el sistema NO calcula por el estudiante. El calibrador
// solo informa de cuánto mide el tramo —eso es leer la regla, no calcular—;
// la frecuencia la escribe el estudiante y después se comprueba.
//
// El trazado PQRST es sintético y se dibuja de forma analítica a partir de la
// posición de cada onda R, porque el ejercicio exige que la R caiga en una
// posición exacta y verificable. El motor del simulador clínico
// (OVA.MotorECG) trabaja en tiempo real con jitter fisiológico y aquí no sirve.
//
// Montaje: los módulos se inyectan con innerHTML, así que el <script> no se
// ejecuta al cargarlos. Se usa el mismo MutationObserver sobre #vista-modulo
// que el simulador de eje.

const NS = 'http://www.w3.org/2000/svg';
const MM_POR_SEGUNDO = 25;          // velocidad estándar de registro
const MM_POR_MILIVOLTIO = 10;       // calibración estándar
const VENTANA_MM = 6 * MM_POR_SEGUNDO;  // los 6 segundos del conteo

// R-R que caen justo sobre una línea de cuadro grande: la regla de los 300 da
// un entero y basta con ella.
const RR_EXACTOS = [15, 20, 25, 30];
// R-R que NO son múltiplos de 5 mm: la regla de los 300 solo da un intervalo y
// hace falta la de los 1500. Son el motivo de que exista la segunda regla.
const RR_INEXACTOS = [13, 17, 22, 27];

// La figura es fluida: ocupa el ancho de la columna de texto. Como el
// calibrador mide en unidades del viewBox, la medida sigue siendo correcta
// aunque la figura se muestre más grande o más pequeña.
const PAPEL_FIGURA = { anchoMm: 130, altoMm: 55, pxPorMm: 6.2, fluido: true };
const PAPEL_REGULAR = { anchoMm: 150, altoMm: 34, pxPorMm: 5 };
const PAPEL_IRREGULAR = { anchoMm: 225, altoMm: 38, pxPorMm: 3.4 };

// Cotas de referencia de la Figura 4.3, de menor a mayor. Las verticales
// crecen desde una misma línea de base y las horizontales desde un mismo
// margen, de modo que la progresión se ve como una escalera.
// Todas las posiciones son múltiplos de 5 mm, es decir, líneas gruesas de la
// cuadrícula: así se ve a simple vista que una cota de 5 mm ocupa exactamente
// un cuadro grande y la de 25 mm, cinco. Si las barras cayeran entre líneas,
// la equivalencia no se podría comprobar sobre el propio papel.
const COTAS_VOLTAJE = [
    { x: 15, mm: 1, texto: '1 mm = 0,1 mV' },
    { x: 30, mm: 5, texto: '5 mm = 0,5 mV' },
    { x: 45, mm: 10, texto: '10 mm = 1 mV' }
];

const COTAS_TIEMPO = [
    { y: 15, mm: 1, texto: '1 mm = 0,04 segundos' },
    { y: 25, mm: 5, texto: '5 mm = 0,20 segundos' },
    { y: 35, mm: 10, texto: '10 mm = 0,40 segundos' },
    { y: 45, mm: 25, texto: '25 mm = 1 segundo' }
];

const COTA_BASE_Y = 45;   // línea de base de las cotas verticales
const COTA_BASE_X = 70;   // margen izquierdo de las cotas horizontales

let contadorIds = 0;
let arrastre = null; // { raiz, svg, tipo: 'pata'|'ventana', pata, agarreMm }

// --- UTILIDADES DE DIBUJO ---

function crear(nombre, atributos, texto) {
    const nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach((k) => nodo.setAttribute(k, atributos[k]));
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

function papelDe(raiz) {
    if (raiz.dataset.ejercicio === 'papel') return PAPEL_FIGURA;
    return raiz.dataset.modo === 'irregular' ? PAPEL_IRREGULAR : PAPEL_REGULAR;
}

function nuevoSvg(papel) {
    const atributos = {
        viewBox: '0 0 ' + papel.anchoMm + ' ' + papel.altoMm,
        class: 'simulador-fc-svg' + (papel.fluido ? ' simulador-fc-svg--fluido' : '')
    };
    if (!papel.fluido) {
        atributos.width = Math.round(papel.anchoMm * papel.pxPorMm);
        atributos.height = Math.round(papel.altoMm * papel.pxPorMm);
    }
    return crear('svg', atributos);
}

// Cuadrícula de papel de ECG: líneas finas cada 1 mm y gruesas cada 5 mm.
// Dos <pattern> en vez de cientos de nodos por tira.
function dibujarCuadricula(svg, papel) {
    const id = 'fc-papel-' + (++contadorIds);
    const defs = crear('defs');

    const finas = crear('pattern', { id: id + '-finas', width: 1, height: 1, patternUnits: 'userSpaceOnUse' });
    finas.appendChild(crear('path', { d: 'M1,0 V1 M0,1 H1', class: 'simulador-fc-rejilla-fina' }));

    const gruesas = crear('pattern', { id: id + '-gruesas', width: 5, height: 5, patternUnits: 'userSpaceOnUse' });
    gruesas.appendChild(crear('rect', { width: 5, height: 5, fill: 'url(#' + id + '-finas)' }));
    gruesas.appendChild(crear('path', { d: 'M5,0 V5 M0,5 H5', class: 'simulador-fc-rejilla-gruesa' }));

    defs.appendChild(finas);
    defs.appendChild(gruesas);
    svg.appendChild(defs);

    svg.appendChild(crear('rect', { x: 0, y: 0, width: papel.anchoMm, height: papel.altoMm, class: 'simulador-fc-fondo' }));
    svg.appendChild(crear('rect', { x: 0, y: 0, width: papel.anchoMm, height: papel.altoMm, fill: 'url(#' + id + '-gruesas)' }));
}

// Vértices del QRS respecto a la onda R. El complejo conserva su anchura
// aunque cambie la frecuencia: lo que se acorta al acelerarse el ritmo es la
// diástole eléctrica, no el QRS.
const NODOS_QRS = [[-1.6, 0], [-1.2, 1], [0, -9], [1.2, 2.6], [2, 0]];

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
            if (dx >= x1 && dx <= x2) return base + y1 + (y2 - y1) * ((dx - x1) / (x2 - x1));
        }
    }

    const anterior = indice > 0 ? xR - posiciones[indice - 1] : null;
    const siguiente = indice < posiciones.length - 1 ? posiciones[indice + 1] - xR : null;
    const rr = (dx < 0 ? anterior || siguiente : siguiente || anterior) || 25;
    const hueco = Math.max(rr - 3.6, 2);

    if (dx > 0) {
        const ancho = Math.min(5, hueco * 0.45);
        const inicio = 2 + hueco * 0.08;
        if (dx >= inicio && dx <= inicio + ancho) return base - 3 * Math.sin(Math.PI * (dx - inicio) / ancho);
    } else {
        const ancho = Math.min(4, hueco * 0.32);
        const fin = -1.6 - hueco * 0.12;
        if (dx >= fin - ancho && dx <= fin) return base - 1.5 * Math.sin(Math.PI * (dx - fin + ancho) / ancho);
    }

    return base;
}

function dibujarTrazado(svg, posicionesR, papel) {
    const base = papel.altoMm - 11;
    const puntos = [];
    for (let x = 0; x <= papel.anchoMm; x += 0.2) {
        puntos.push(x.toFixed(2) + ',' + voltaje(x, posicionesR, base).toFixed(2));
    }
    svg.appendChild(crear('path', { d: 'M' + puntos.join(' L'), class: 'simulador-fc-trazo' }));
    return base;
}

// --- EL CALIBRADOR ---
//
// Dos patas arrastrables unidas por una barra. Es el único instrumento de
// medida del módulo y se usa igual en las tres situaciones. Se engancha a la
// cuadrícula de milímetro en milímetro, que es la precisión real con la que
// se puede leer un cuadro pequeño a ojo.

// El eje activo: 'x' mide tiempo, 'y' mide voltaje y 'xy' las dos cosas a la
// vez. La figura arranca en 'ref', que solo muestra las cotas.
function ejeDe(raiz) {
    return raiz.dataset.eje || (raiz.dataset.ejercicio === 'papel' ? 'ref' : 'x');
}

function dibujarCalibrador(svg, raiz, papel) {
    const eje = ejeDe(raiz);
    const grupo = crear('g', { class: 'simulador-fc-calibrador' });

    if (eje.indexOf('x') !== -1 && eje.indexOf('y') !== -1) {
        grupo.appendChild(crear('rect', { class: 'simulador-fc-calibrador-area' }));
    }

    ['x', 'y'].forEach((cual) => {
        if (eje.indexOf(cual) === -1) return;
        ['a', 'b'].forEach((pata) => {
            const g = crear('g', { class: 'simulador-fc-pata', tabindex: '0', role: 'slider' });
            g.dataset.pata = pata;
            g.dataset.eje = cual;
            g.appendChild(crear('line', { class: 'simulador-fc-pata-linea' }));
            g.appendChild(crear('circle', { class: 'simulador-fc-pata-asa', r: 1.6 }));
            g.addEventListener('pointerdown', (ev) => iniciarArrastre(ev, raiz, 'pata', pata, cual));
            g.addEventListener('keydown', (ev) => moverConTeclado(ev, raiz, pata, cual));
            grupo.appendChild(g);
        });
        grupo.appendChild(crear('line', { class: 'simulador-fc-calibrador-barra', 'data-eje': cual }));
    });

    svg.appendChild(grupo);

    // Posición inicial: separadas lo justo para que se vean las dos patas.
    raiz.dataset.calA = Math.round(papel.anchoMm * 0.25);
    raiz.dataset.calB = Math.round(papel.anchoMm * 0.45);
    raiz.dataset.calAy = Math.round(papel.altoMm * 0.3);
    raiz.dataset.calBy = Math.round(papel.altoMm * 0.65);
    actualizarCalibrador(raiz);
}

function valoresEje(raiz, cual) {
    return cual === 'y'
        ? [parseFloat(raiz.dataset.calAy), parseFloat(raiz.dataset.calBy)]
        : [parseFloat(raiz.dataset.calA), parseFloat(raiz.dataset.calB)];
}

function actualizarCalibrador(raiz) {
    const calibrador = raiz.querySelector('.simulador-fc-calibrador');
    if (!calibrador) return;   // la figura en modo referencia no lleva calibrador
    const papel = papelDe(raiz);

    raiz.querySelectorAll('.simulador-fc-pata').forEach((g) => {
        const cual = g.dataset.eje;
        const [a, b] = valoresEje(raiz, cual);
        const valor = g.dataset.pata === 'a' ? a : b;
        const linea = g.querySelector('.simulador-fc-pata-linea');
        const asa = g.querySelector('.simulador-fc-pata-asa');
        if (cual === 'y') {
            linea.setAttribute('x1', 1.5); linea.setAttribute('y1', valor);
            linea.setAttribute('x2', papel.anchoMm - 1.5); linea.setAttribute('y2', valor);
            asa.setAttribute('cx', papel.anchoMm - 4); asa.setAttribute('cy', valor);
        } else {
            linea.setAttribute('x1', valor); linea.setAttribute('y1', 1.5);
            linea.setAttribute('x2', valor); linea.setAttribute('y2', papel.altoMm - 1.5);
            asa.setAttribute('cx', valor); asa.setAttribute('cy', 4);
        }
    });

    raiz.querySelectorAll('.simulador-fc-calibrador-barra').forEach((barra) => {
        const cual = barra.getAttribute('data-eje');
        const [a, b] = valoresEje(raiz, cual);
        if (cual === 'y') {
            barra.setAttribute('x1', papel.anchoMm - 4); barra.setAttribute('y1', a);
            barra.setAttribute('x2', papel.anchoMm - 4); barra.setAttribute('y2', b);
        } else {
            barra.setAttribute('x1', a); barra.setAttribute('y1', 4);
            barra.setAttribute('x2', b); barra.setAttribute('y2', 4);
        }
    });

    const area = raiz.querySelector('.simulador-fc-calibrador-area');
    if (area) {
        const [ax, bx] = valoresEje(raiz, 'x');
        const [ay, by] = valoresEje(raiz, 'y');
        area.setAttribute('x', Math.min(ax, bx));
        area.setAttribute('y', Math.min(ay, by));
        area.setAttribute('width', Math.abs(bx - ax));
        area.setAttribute('height', Math.abs(by - ay));
    }

    escribirLectura(raiz);
}

function medidaMm(raiz, cual) {
    const [a, b] = valoresEje(raiz, cual || 'x');
    return Math.abs(b - a);
}

function textoTiempo(mm) {
    const grandes = Math.floor(mm / 5);
    const resto = Math.round(mm % 5);
    const cuadros = grandes + ' cuadro' + (grandes === 1 ? '' : 's') + ' grande' + (grandes === 1 ? '' : 's') +
        (resto ? ' y ' + resto + ' pequeño' + (resto === 1 ? '' : 's') : '');
    return cuadros + '  ·  ' + mm + ' cuadros pequeños  ·  ' + (mm / MM_POR_SEGUNDO).toFixed(2).replace('.', ',') + ' s';
}

function textoVoltaje(mm) {
    return mm + ' mm  ·  ' + (mm / MM_POR_MILIVOLTIO).toFixed(2).replace('.', ',') + ' mV';
}

function escribirLectura(raiz) {
    const salida = raiz.querySelector('.simulador-fc-lectura-valor');
    if (!salida) return;
    const eje = ejeDe(raiz);
    if (eje === 'ref') return;

    const ambos = eje === 'xy';
    const partes = [];
    if (eje.indexOf('x') !== -1) partes.push((ambos ? 'Tiempo — ' : '') + textoTiempo(medidaMm(raiz, 'x')));
    if (eje.indexOf('y') !== -1) partes.push((ambos ? 'Voltaje — ' : '') + textoVoltaje(medidaMm(raiz, 'y')));
    salida.textContent = partes.join('     ');
}

// --- ARRASTRE ---

function clienteAMm(svg, cliente, vertical) {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return vertical
        ? vb.y + (cliente - r.top) / r.height * vb.height
        : vb.x + (cliente - r.left) / r.width * vb.width;
}

function iniciarArrastre(ev, raiz, tipo, pata, cual) {
    ev.preventDefault();
    const svg = raiz.querySelector('.simulador-fc-svg');
    const vertical = cual === 'y';
    arrastre = { raiz, svg, tipo, pata, cual: cual || 'x', vertical };

    if (tipo === 'ventana') {
        const mm = clienteAMm(svg, ev.clientX, false);
        arrastre.agarreMm = mm - parseFloat(raiz.dataset.ventanaInicio);
    }

    document.addEventListener('pointermove', moverArrastre);
    document.addEventListener('pointerup', terminarArrastre);
    document.addEventListener('pointercancel', terminarArrastre);
}

function moverArrastre(ev) {
    if (!arrastre) return;
    ev.preventDefault();
    const { raiz, svg, tipo, pata, cual, vertical } = arrastre;
    const papel = papelDe(raiz);

    if (tipo === 'pata') {
        const limite = vertical ? papel.altoMm : papel.anchoMm;
        const mm = clienteAMm(svg, vertical ? ev.clientY : ev.clientX, vertical);
        const valor = Math.min(Math.max(Math.round(mm), 0), Math.round(limite));
        const clave = (pata === 'a' ? 'calA' : 'calB') + (cual === 'y' ? 'y' : '');
        raiz.dataset[clave] = valor;
        actualizarCalibrador(raiz);
    } else {
        const mm = clienteAMm(svg, ev.clientX, false);
        raiz.dataset.ventanaInicio = ajustarVentana(mm - arrastre.agarreMm, papel);
        actualizarVentana(raiz);
    }
}

function terminarArrastre() {
    arrastre = null;
    document.removeEventListener('pointermove', moverArrastre);
    document.removeEventListener('pointerup', terminarArrastre);
    document.removeEventListener('pointercancel', terminarArrastre);
}

function moverConTeclado(ev, raiz, pata, cual) {
    const paso = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1
        : ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const papel = papelDe(raiz);
    const limite = cual === 'y' ? papel.altoMm : papel.anchoMm;
    const clave = (pata === 'a' ? 'calA' : 'calB') + (cual === 'y' ? 'y' : '');
    raiz.dataset[clave] = Math.min(Math.max(parseFloat(raiz.dataset[clave]) + paso, 0), Math.round(limite));
    actualizarCalibrador(raiz);
}

// --- FIGURA 4.3: EL PAPEL, MEDIBLE ---

// Rótulo de una cota: caja blanca con borde del color de la cota, para que
// el texto se lea sobre la cuadrícula rosa. El ancho se estima a partir del
// número de caracteres porque el SVG aún no está en el documento y no se
// puede medir el texto.
function rotuloCota(grupo, x, y, texto, rotado) {
    const ancho = texto.length * 1.12 + 1.8;
    const g = crear('g', { class: 'simulador-fc-cota-rotulo' });
    g.setAttribute('transform', 'translate(' + x + ',' + y + ')' + (rotado ? ' rotate(-90)' : ''));
    g.appendChild(crear('rect', { x: 0, y: -1.7, width: ancho, height: 3.4, rx: .7, class: 'simulador-fc-cota-caja' }));
    g.appendChild(crear('text', { x: .9, y: .8, class: 'simulador-fc-cota-rotulo-texto' }, texto));
    grupo.appendChild(g);
}

function montarPapel(raiz) {
    const papel = PAPEL_FIGURA;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;
    const eje = ejeDe(raiz);
    lienzo.textContent = '';

    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);

    // Las cotas solo se dibujan en el modo de referencia: cuando el estudiante
    // pasa a medir, el papel se queda limpio para que lo que lea sea su propia
    // medición y no el rótulo que tiene al lado.
    if (eje === 'ref') {
        const cotas = crear('g', { class: 'simulador-fc-cotas' });

        cotas.appendChild(crear('text', { x: 30, y: 9, class: 'simulador-fc-cota-titulo' }, 'VOLTAJE'));
        cotas.appendChild(crear('text', { x: 95, y: 9, class: 'simulador-fc-cota-titulo' }, 'TIEMPO'));
        cotas.appendChild(crear('path', { d: 'M10,' + COTA_BASE_Y + ' H52', class: 'simulador-fc-cota-base' }));

        COTAS_VOLTAJE.forEach((cota) => {
            const arriba = COTA_BASE_Y - cota.mm;
            cotas.appendChild(crear('path', {
                d: 'M' + cota.x + ',' + arriba + ' V' + COTA_BASE_Y +
                   ' M' + (cota.x - 1) + ',' + arriba + ' H' + (cota.x + 1) +
                   ' M' + (cota.x - 1) + ',' + COTA_BASE_Y + ' H' + (cota.x + 1),
                class: 'simulador-fc-cota-barra'
            }));
            rotuloCota(cotas, cota.x + 2, COTA_BASE_Y, cota.texto, true);
        });

        COTAS_TIEMPO.forEach((cota) => {
            const derecha = COTA_BASE_X + cota.mm;
            cotas.appendChild(crear('path', {
                d: 'M' + COTA_BASE_X + ',' + cota.y + ' H' + derecha +
                   ' M' + COTA_BASE_X + ',' + (cota.y - 1) + ' V' + (cota.y + 1) +
                   ' M' + derecha + ',' + (cota.y - 1) + ' V' + (cota.y + 1),
                class: 'simulador-fc-cota-barra'
            }));
            rotuloCota(cotas, derecha + 2, cota.y, cota.texto, false);
        });

        cotas.appendChild(crear('text', { x: 95, y: 52, class: 'simulador-fc-cota-pie' }, 'Velocidad del papel = 25 mm/s'));
        svg.appendChild(cotas);
    }

    if (eje !== 'ref') dibujarCalibrador(svg, raiz, papel);
    lienzo.appendChild(svg);
    if (eje !== 'ref') actualizarCalibrador(raiz);
}

function cambiarEje(boton, eje) {
    const raiz = boton.closest('.simulador-fc');
    if (!raiz) return;
    raiz.dataset.eje = eje;
    raiz.querySelectorAll('.simulador-fc-ejes button').forEach((b) => b.classList.toggle('activo', b === boton));

    const lectura = raiz.querySelector('.simulador-fc-lectura');
    if (lectura) lectura.hidden = eje === 'ref';
    const rotulo = raiz.querySelector('.simulador-fc-lectura-rotulo');
    if (rotulo) rotulo.textContent = eje === 'xy' ? 'Medida:' : (eje === 'y' ? 'Voltaje medido:' : 'Tiempo medido:');
    const pista = raiz.querySelector('.simulador-fc-pista');
    if (pista) pista.hidden = eje === 'ref';

    montarPapel(raiz);
}

// --- RECURSO INTERACTIVO: CALCULAR LA FRECUENCIA ---

function montarRegular(raiz) {
    const papel = PAPEL_REGULAR;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;

    // Se alterna entre un R-R exacto y uno inexacto para que el estudiante se
    // encuentre con los dos escenarios y descubra para qué sirve cada regla.
    const tocaExacto = raiz.dataset.ultimoExacto !== 'true';
    const banco = tocaExacto ? RR_EXACTOS : RR_INEXACTOS;
    const rr = banco[Math.floor(Math.random() * banco.length)];
    raiz.dataset.ultimoExacto = tocaExacto ? 'true' : 'false';

    const posiciones = [];
    for (let x = 13; x <= papel.anchoMm - 12; x += rr) posiciones.push(x);

    lienzo.textContent = '';
    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);
    dibujarTrazado(svg, posiciones, papel);
    dibujarCalibrador(svg, raiz, papel);
    lienzo.appendChild(svg);

    raiz.dataset.rr = rr;
    raiz.dataset.posiciones = posiciones.join(',');
    raiz.dataset.fase = 'medir';
    actualizarCalibrador(raiz);

    prepararRespuesta(raiz, 'Frecuencia cardíaca', 'lpm');
    escribirPaso(raiz, 'Arrastra las dos patas del calibrador hasta dos ondas R seguidas. Después escribe la frecuencia que calcules.');
    escribirFeedback(raiz, '');
}

function montarIrregular(raiz) {
    const papel = PAPEL_IRREGULAR;
    const lienzo = raiz.querySelector('.simulador-fc-lienzo');
    if (!lienzo) return;

    // Las ondas R van en milímetros enteros no múltiplos de 5, y el borde de
    // la ventana se engancha a medios cuadros grandes (2,5 mm): así ninguna R
    // puede caer justo sobre el borde y el conteo nunca es ambiguo.
    const posiciones = [];
    let x = 10;
    while (x < papel.anchoMm - 10) {
        let xr = Math.round(x);
        if (xr % 5 === 0) xr += 1;
        if (xr < papel.anchoMm - 10) posiciones.push(xr);
        x = xr + 11 + Math.random() * 15;
    }

    lienzo.textContent = '';
    const svg = nuevoSvg(papel);
    dibujarCuadricula(svg, papel);
    dibujarTrazado(svg, posiciones, papel);

    // Marcas de 1 segundo, como en un registro real.
    const marcas = crear('g', { class: 'simulador-fc-marcas' });
    for (let s = 0; s * MM_POR_SEGUNDO <= papel.anchoMm; s++) {
        const xm = s * MM_POR_SEGUNDO;
        marcas.appendChild(crear('path', { d: 'M' + xm + ',0 V4', class: 'simulador-fc-marca-linea' }));
        marcas.appendChild(crear('text', { x: xm, y: 7.5, class: 'simulador-fc-marca-numero' }, s));
    }
    svg.appendChild(marcas);
    svg.appendChild(crear('g', { class: 'simulador-fc-ventana' }));
    svg.appendChild(crear('g', { class: 'simulador-fc-numeros' }));
    dibujarCalibrador(svg, raiz, papel);
    lienzo.appendChild(svg);

    raiz.dataset.posiciones = posiciones.join(',');
    raiz.dataset.fase = 'comparar';
    raiz.dataset.medidas = '';
    raiz.dataset.ventanaInicio = ajustarVentana(papel.anchoMm * 0.1, papel);
    actualizarCalibrador(raiz);

    mostrarVentana(raiz, false);
    prepararRespuesta(raiz, 'Complejos dentro de la ventana', 'complejos', true);
    const anotar = raiz.querySelector('.simulador-fc-anotar');
    if (anotar) { anotar.hidden = false; anotar.textContent = 'Anotar esta medida'; }

    escribirPaso(raiz, 'Paso 1 · Mide con el calibrador la distancia entre dos ondas R y pulsa «Anotar esta medida». Repítelo en otro punto del trazado.');
    escribirFeedback(raiz, '');
}

function ajustarVentana(mm, papel) {
    const maximo = papel.anchoMm - VENTANA_MM;
    const ajustado = Math.round(mm / 2.5) * 2.5;
    return Math.min(Math.max(ajustado, 0), Math.round(maximo / 2.5) * 2.5);
}

function mostrarVentana(raiz, visible) {
    const grupo = raiz.querySelector('.simulador-fc-ventana');
    const calibrador = raiz.querySelector('.simulador-fc-calibrador');
    if (grupo) grupo.style.display = visible ? '' : 'none';
    if (calibrador) calibrador.style.display = visible ? 'none' : '';
    if (visible) actualizarVentana(raiz);
}

function actualizarVentana(raiz) {
    const grupo = raiz.querySelector('.simulador-fc-ventana');
    if (!grupo) return;
    const papel = PAPEL_IRREGULAR;
    const x1 = parseFloat(raiz.dataset.ventanaInicio);
    const x2 = x1 + VENTANA_MM;
    grupo.textContent = '';

    const area = crear('rect', { x: x1, y: 4, width: VENTANA_MM, height: papel.altoMm - 4, class: 'simulador-fc-ventana-area' });
    area.addEventListener('pointerdown', (ev) => iniciarArrastre(ev, raiz, 'ventana'));
    grupo.appendChild(area);
    grupo.appendChild(crear('path', { d: 'M' + x1 + ',4 V' + papel.altoMm + ' M' + x2 + ',4 V' + papel.altoMm, class: 'simulador-fc-ventana-borde' }));
    grupo.appendChild(crear('path', { d: 'M' + x1 + ',' + (papel.altoMm - 1.6) + ' H' + x2, class: 'simulador-fc-ventana-borde' }));
    grupo.appendChild(crear('text', { x: (x1 + x2) / 2, y: papel.altoMm - 2.8, class: 'simulador-fc-ventana-texto' }, '6 segundos — arrastra para moverla'));
}

function anotarMedida(boton) {
    const raiz = boton.closest('.simulador-fc');
    if (!raiz || raiz.dataset.fase !== 'comparar') return;

    const mm = medidaMm(raiz);
    if (mm < 5) {
        escribirFeedback(raiz, 'Separa un poco más las patas: mide de una onda R a la siguiente.', 'incorrecto');
        return;
    }

    const medidas = (raiz.dataset.medidas || '').split(',').filter((v) => v !== '');
    medidas.push(String(mm));
    raiz.dataset.medidas = medidas.join(',');

    if (medidas.length < 2) {
        escribirFeedback(raiz, 'Primera medida anotada: ' + mm + ' mm, que serían ' + Math.round(1500 / mm) +
            ' lpm. Ahora mide otro par de ondas R, en otro punto del trazado.', '');
        return;
    }

    const [m1, m2] = medidas.map(Number);
    const f1 = Math.round(1500 / m1);
    const f2 = Math.round(1500 / m2);

    if (Math.abs(f1 - f2) < 8) {
        raiz.dataset.medidas = String(m2);
        escribirFeedback(raiz, 'Las dos medidas dan casi lo mismo (' + f1 + ' y ' + f2 +
            ' lpm). Busca dos pares de ondas R que se vean claramente más juntas y más separadas.', '');
        return;
    }

    raiz.dataset.fase = 'contar';
    mostrarVentana(raiz, true);
    const anotar = raiz.querySelector('.simulador-fc-anotar');
    if (anotar) anotar.hidden = true;
    habilitarRespuesta(raiz, true);

    escribirFeedback(raiz, 'Ahí está el problema: midiendo un par de ondas R salen ' + f1 +
        ' lpm y midiendo otro salen ' + f2 + ' lpm. En un ritmo irregular la regla de los 300 da un resultado ' +
        'distinto según dónde midas, así que no sirve. Por eso se cuenta en 6 segundos.', 'correcto');
    escribirPaso(raiz, 'Paso 2 · Arrastra la ventana de 6 segundos donde quieras y escribe cuántos complejos QRS caen dentro.');
}

// --- RESPUESTA ESCRITA ---

function prepararRespuesta(raiz, rotulo, unidad, bloqueada) {
    const campo = raiz.querySelector('.simulador-fc-campo');
    const etiqueta = raiz.querySelector('.simulador-fc-campo-rotulo');
    const sufijo = raiz.querySelector('.simulador-fc-campo-unidad');
    if (etiqueta) etiqueta.textContent = rotulo + ':';
    if (sufijo) sufijo.textContent = unidad;
    if (campo) campo.value = '';
    habilitarRespuesta(raiz, !bloqueada);
}

function habilitarRespuesta(raiz, activa) {
    const caja = raiz.querySelector('.simulador-fc-respuesta');
    const campo = raiz.querySelector('.simulador-fc-campo');
    const boton = raiz.querySelector('.simulador-fc-comprobar');
    if (caja) caja.classList.toggle('bloqueada', !activa);
    if (campo) campo.disabled = !activa;
    if (boton) boton.disabled = !activa;
}

function comprobar(boton) {
    const raiz = boton.closest('.simulador-fc');
    if (!raiz) return;
    const campo = raiz.querySelector('.simulador-fc-campo');
    const valor = parseFloat((campo.value || '').replace(',', '.'));

    if (!valor || valor <= 0) {
        escribirFeedback(raiz, 'Escribe un número antes de comprobar.', 'incorrecto');
        return;
    }

    if (raiz.dataset.modo === 'irregular') comprobarConteo(raiz, valor);
    else comprobarRegular(raiz, valor);
}

function comprobarRegular(raiz, valor) {
    if (raiz.dataset.fase === 'resuelto') return;

    const mm = medidaMm(raiz);
    const rr = parseInt(raiz.dataset.rr, 10);

    if (Math.abs(mm - rr) > 0.5) {
        escribirFeedback(raiz, 'Antes de calcular, comprueba la medida: el calibrador marca ' + mm +
            ' mm y la distancia entre dos ondas R seguidas no es esa. Coloca cada pata justo sobre el pico de una R.', 'incorrecto');
        return;
    }

    const exacta = rr % 5 === 0;
    const correcta = 1500 / rr;
    const acierto = Math.abs(valor - correcta) <= (exacta ? 2 : 4);

    raiz.dataset.fase = 'resuelto';
    anotarMarcador(raiz, acierto);

    const grandes = rr / 5;
    let detalle;
    if (exacta) {
        detalle = 'Las dos ondas R están separadas ' + grandes + ' cuadros grandes exactos, así que basta la regla de los 300: ' +
            '300 ÷ ' + grandes + ' = ' + Math.round(correcta) + ' lpm. Con la de los 1500 sale lo mismo: 1500 ÷ ' + rr + ' = ' + Math.round(correcta) + ' lpm.';
    } else {
        const bajo = Math.floor(grandes);
        const alto = Math.ceil(grandes);
        detalle = 'Aquí la segunda onda R no cae sobre una línea de cuadro grande: queda entre ' + bajo + ' y ' + alto +
            ', así que la regla de los 300 solo dice que la frecuencia está entre ' + Math.round(300 / alto) + ' y ' + Math.round(300 / bajo) +
            ' lpm. La regla de los 1500 sí da el valor: 1500 ÷ ' + rr + ' cuadros pequeños = ' + Math.round(correcta) + ' lpm.';
    }

    escribirFeedback(raiz, (acierto ? 'Correcto. ' : 'No. ') + detalle, acierto ? 'correcto' : 'incorrecto');
    escribirPaso(raiz, 'Pulsa «Otro trazado» para practicar con otra separación.');
}

function comprobarConteo(raiz, valor) {
    if (raiz.dataset.fase !== 'contar') return;

    const desde = parseFloat(raiz.dataset.ventanaInicio);
    const hasta = desde + VENTANA_MM;
    const posiciones = raiz.dataset.posiciones.split(',').map(Number);
    const dentro = posiciones.filter((x) => x > desde && x < hasta);
    const acierto = Math.round(valor) === dentro.length;

    // Se numeran los complejos del tramo para que el estudiante compruebe
    // dónde se desvió su conteo, en vez de solo saber que falló.
    const grupo = raiz.querySelector('.simulador-fc-numeros');
    const base = PAPEL_IRREGULAR.altoMm - 11;
    grupo.textContent = '';
    dentro.forEach((x, i) => {
        grupo.appendChild(crear('text', { x: x, y: base - 11, class: 'simulador-fc-numero' }, i + 1));
    });

    raiz.dataset.fase = 'resuelto';
    anotarMarcador(raiz, acierto);

    const texto = (acierto ? 'Correcto. ' : 'Contaste ' + Math.round(valor) + '. ') +
        'Dentro de la ventana hay ' + dentro.length + ' complejos: ' + dentro.length + ' × 10 = ' +
        (dentro.length * 10) + ' lpm. Se multiplica por 10 porque 6 segundos caben diez veces en un minuto.';
    escribirFeedback(raiz, texto, acierto ? 'correcto' : 'incorrecto');
    escribirPaso(raiz, 'Pulsa «Otro trazado» para practicar con otro ritmo.');
}

// --- CHROME DEL WIDGET ---

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

function cambiarModo(boton, modo) {
    const raiz = boton.closest('.simulador-fc');
    if (!raiz) return;
    raiz.dataset.modo = modo;
    raiz.querySelectorAll('.simulador-fc-modos button').forEach((b) => b.classList.toggle('activo', b === boton));
    montar(raiz, true);
}

function nuevoCaso(boton) {
    const raiz = boton.closest('.simulador-fc');
    if (raiz) montar(raiz, true);
}

function montar(raiz, forzar) {
    if (!forzar && raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';

    if (raiz.dataset.ejercicio === 'papel') { montarPapel(raiz); return; }
    if (raiz.dataset.modo === 'irregular') montarIrregular(raiz);
    else montarRegular(raiz);
}

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
    OVA.SimuladorFrecuencia.cambiarModo = cambiarModo;
    OVA.SimuladorFrecuencia.cambiarEje = cambiarEje;
    OVA.SimuladorFrecuencia.nuevoCaso = nuevoCaso;
    OVA.SimuladorFrecuencia.anotarMedida = anotarMedida;
    OVA.SimuladorFrecuencia.comprobar = comprobar;
    OVA.SimuladorFrecuencia.montar = montar;

})(window.OVA = window.OVA || {});

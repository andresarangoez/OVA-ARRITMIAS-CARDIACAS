(function (OVA) {
    OVA.TiraECG = OVA.TiraECG || {};

// --- TIRA DE ECG ESTÁTICA Y CALIBRADA ---
//
// Dibuja un trazado quieto sobre papel milimetrado, usando el MISMO motor
// matemático que el simulador del OVA (js/02-motor-ecg.js). No es una imagen
// ni una curva decorativa: cada punto sale de MotorMatematicoECG con el ritmo
// y la frecuencia que ese ritmo tiene en RITMOS_DB (js/01-data-ritmos.js).
//
// Por qué estática y no animada, como el simulador:
//
// · Sobre un trazado que corre no se puede medir. Los recursos de los módulos
//   02 y 03 piden contar cuadros entre dos R, mirar si el PR es constante o
//   comparar dos trazados — todo eso exige que la imagen se quede quieta.
// · El motor es determinista si se avanza con un paso fijo: la misma llamada
//   da siempre la misma tira, así que el trazado que el estudiante mide es el
//   mismo que se usó para calcular la respuesta correcta.
// · No depende de requestAnimationFrame, que es lo que anima el simulador.
//
// Por qué en SVG y no en un lienzo:
//
// Un <canvas> guarda píxeles. La tira mide 150 mm de ancho, y a los 4 px/mm
// que se usaban eso son 600 px de imagen que el CSS estira hasta el ancho de
// la columna del módulo — unos 1100 px en un portátil, 1600 en una pantalla
// grande. En un monitor sin densidad doble el navegador no tiene de dónde
// sacar los píxeles que faltan y los interpola: la cuadrícula se difumina y el
// trazado sale con bordes sucios. Subir la resolución solo mueve el problema
// de sitio, porque el ancho de la columna no está acotado.
//
// En SVG la tira es geometría: líneas y una curva con coordenadas en décimas
// de milímetro. El navegador la rasteriza al tamaño final, sea el que sea, así
// que es nítida en cualquier pantalla y sigue siéndolo al ampliar la página o
// al imprimirla. Es también lo que hace que el papel se vea como papel: las
// líneas de la cuadrícula caen en bordes exactos en lugar de repartirse entre
// dos píxeles.

const MM_POR_SEGUNDO = 25;      // velocidad estándar del papel
const UNIDADES_POR_MM = 10;     // coordenadas del SVG: décimas de milímetro
const MM_POR_UNIDAD = 0.14;     // el motor da 80 unidades en la R, que así mide 11,2 mm
const ALTO_MM = 28;
const LINEA_BASE = 0.56;        // altura de la línea isoeléctrica, en fracción del alto

// Grosores, en décimas de milímetro.
const TRAZO_FINO = 1;           // cuadrícula de 1 mm
const TRAZO_GRUESO = 2.6;       // cuadrícula de 5 mm
const TRAZO_SENAL = 3;          // la señal: 0,3 mm, como una plumilla

const PAPEL = '#fff6f6';
const CUADRO_FINO = 'rgba(210, 116, 116, 0.38)';
const CUADRO_GRUESO = 'rgba(190, 80, 80, 0.62)';
// Tinta oscura, no verde: sobre papel milimetrado el trazado se lee en negro,
// y el contraste contra el rosa del papel es mucho mayor que el del verde del
// monitor (que es el color de un tubo de rayos, no el de una tira impresa).
const TINTA = '#15212e';

// Umbral de detección de la R, en unidades del motor. Tiene que dejar fuera
// todo lo que no es un complejo y admitir hasta el más pequeño:
//
//   onda T .......... 18        complejo ancho ... 35   (escape, EV, bloqueos)
//   T + línea de FA .. 24       complejo angosto . 80
//   T + onda F ....... 26
//
// Estaba en 25, y entonces en el flutter la suma de la T y el diente de sierra
// pasaba por complejo: cada latido se contaba dos veces y la tira declaraba
// 300 por minuto en un ritmo de 150. Con 30 queda holgura por los dos lados.
const UMBRAL_R = 30;
const REARME_R = 12;            // hay que bajar de aquí para volver a contar

// Los ritmos sin frecuencia medible: la fibrilación y las taquicardias
// polimórficas no tienen complejos que contar ni intervalos que medir. El
// trazado es reproducible (el motor es determinista), pero medirlo no
// significa nada clínicamente.
const NO_MEDIBLES = ['fv', 'tv_poli', 'torsades', 'asistolia'];

const SVG_NS = 'http://www.w3.org/2000/svg';
let contadorTiras = 0;

function crearNodo(nombre, atributos) {
    const n = document.createElementNS(SVG_NS, nombre);
    for (const k in atributos) n.setAttribute(k, atributos[k]);
    return n;
}

// --- MUESTREO DE LA SEÑAL ---
//
// El paso es de 2 ms porque el detalle más fino del trazado son las rampas del
// QRS, de 7 ms (ver js/02-motor-ecg.js): con un paso mayor la R se dibujaría
// cortada. Eso da 3000 muestras en seis segundos, y escribirlas todas en el
// atributo `d` del trazado son 40 KB por tira — 700 KB en las diecisiete del
// Módulo 03, en el DOM, para dibujar un trazado que es línea plana más de la
// mitad del tiempo.
//
// Así que la curva se simplifica mientras se genera: se guarda el último punto
// escrito y se mira si el siguiente se sale de la recta que une al escrito con
// el que viene detrás. Si no se sale (más que la tolerancia), no aporta nada y
// se descarta. Los tramos rectos —la línea isoeléctrica, las rampas del QRS—
// se quedan en sus dos extremos, y las curvas conservan todos sus puntos.
const TOLERANCIA = 0.35;        // décimas de milímetro: 0,035 mm, invisible

function muestrear(ritmo, fc, segundos, ancho, linea) {
    const Motor = OVA.MotorECG && OVA.MotorECG.MotorMatematicoECG;
    const motor = new Motor();
    const dt = 2;
    const total = Math.round(segundos * 1000 / dt);
    const escala = MM_POR_UNIDAD * UNIDADES_POR_MM;

    const puntos = [];
    const picos = [];
    let arriba = false;

    // Los tres puntos del simplificador: A es el último escrito, B el
    // candidato en espera y C el que acaba de llegar.
    let ax = 0, ay = 0, bx = null, by = 0;

    for (let i = 0; i < total; i++) {
        const v = motor.obtenerVoltaje(dt, ritmo, fc);
        const cx = (i / total) * ancho;
        const cy = linea - v * escala;

        if (!arriba && v > UMBRAL_R) { picos.push({ x: cx, t: i * dt / 1000 }); arriba = true; }
        if (arriba && v < REARME_R) arriba = false;

        if (i === 0) { ax = cx; ay = cy; puntos.push([cx, cy]); continue; }
        if (bx === null) { bx = cx; by = cy; continue; }

        // Distancia vertical de B a la recta A→C en la abscisa de B. Basta la
        // vertical: la abscisa crece siempre con el mismo paso, así que la
        // recta nunca es vertical.
        const t = (bx - ax) / (cx - ax);
        const desvio = Math.abs(by - (ay + (cy - ay) * t));
        if (desvio > TOLERANCIA) {
            puntos.push([bx, by]);
            ax = bx; ay = by;
        }
        bx = cx; by = cy;
    }
    if (bx !== null) puntos.push([bx, by]);

    return { puntos: puntos, picos: picos, muestras: total };
}

function trazar(puntos) {
    let d = '';
    for (let i = 0; i < puntos.length; i++) {
        d += (i === 0 ? 'M' : 'L') + puntos[i][0].toFixed(1) + ' ' + puntos[i][1].toFixed(1);
    }
    return d;
}

// --- PAPEL MILIMETRADO ---
// Cuadro pequeño de 1 mm (0,04 s) y grande de 5 mm (0,20 s). Se dibuja con dos
// motivos repetidos en lugar de varios cientos de líneas: el navegador repite
// el motivo sin que haya un nodo por línea.
function papel(svg, id, ancho, alto) {
    const defs = crearNodo('defs', {});
    [['fino', 1 * UNIDADES_POR_MM, CUADRO_FINO, TRAZO_FINO],
     ['grueso', 5 * UNIDADES_POR_MM, CUADRO_GRUESO, TRAZO_GRUESO]].forEach(function (c) {
        const paso = c[1];
        const p = crearNodo('pattern', {
            id: id + '-' + c[0], width: paso, height: paso, patternUnits: 'userSpaceOnUse'
        });
        p.appendChild(crearNodo('path', {
            d: 'M' + paso + ' 0V' + paso + 'M0 ' + paso + 'H' + paso,
            fill: 'none', stroke: c[2], 'stroke-width': c[3]
        }));
        defs.appendChild(p);
    });
    svg.appendChild(defs);

    svg.appendChild(crearNodo('rect', { width: ancho, height: alto, fill: PAPEL }));
    svg.appendChild(crearNodo('rect', { width: ancho, height: alto, fill: 'url(#' + id + '-fino)' }));
    svg.appendChild(crearNodo('rect', { width: ancho, height: alto, fill: 'url(#' + id + '-grueso)' }));
}

// --- API ---
// Devuelve el nodo SVG de la tira y los datos del trazado. El nodo no se
// inserta en ninguna parte: eso lo decide quien llama.
function crear(opciones) {
    const o = opciones || {};
    const ritmo = o.ritmo || 'sinusal';
    const segundos = o.segundos || 6;
    const DB = OVA.Ritmos && OVA.Ritmos.RITMOS_DB;
    const Motor = OVA.MotorECG && OVA.MotorECG.MotorMatematicoECG;
    if (!DB || !Motor || !DB[ritmo]) return null;

    const fc = o.fc != null ? o.fc : DB[ritmo].hmd.fc;
    const altoMm = o.altoMm || ALTO_MM;
    const ancho = segundos * MM_POR_SEGUNDO * UNIDADES_POR_MM;
    const alto = altoMm * UNIDADES_POR_MM;
    const linea = alto * LINEA_BASE;
    const id = 'tira-ecg-' + (++contadorTiras);

    const svg = crearNodo('svg', {
        viewBox: '0 0 ' + ancho + ' ' + alto,
        class: 'tira-ecg-lienzo',
        role: 'img',
        preserveAspectRatio: 'xMidYMid meet'
    });
    svg.style.aspectRatio = ancho + ' / ' + alto;

    papel(svg, id, ancho, alto);

    const senal = muestrear(ritmo, fc, segundos, ancho, linea);
    svg.appendChild(crearNodo('path', {
        d: trazar(senal.puntos),
        fill: 'none',
        stroke: o.color || TINTA,
        'stroke-width': TRAZO_SENAL,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round'
    }));

    svg.setAttribute('aria-label', o.etiqueta || ('Trazado electrocardiográfico de '
        + nombre(ritmo).toLowerCase() + ', ' + segundos + ' segundos a ' + MM_POR_SEGUNDO + ' mm/s.'));

    return {
        nodo: svg,
        ritmo: ritmo, fc: fc, segundos: segundos,
        ancho: ancho, alto: alto, linea: linea,
        unidadesPorMm: UNIDADES_POR_MM, mmPorSegundo: MM_POR_SEGUNDO,
        picos: senal.picos,
        puntos: senal.puntos.length, muestras: senal.muestras,
        medible: NO_MEDIBLES.indexOf(ritmo) === -1
    };
}

// Nombre legible de cada ritmo, leído del <select> del simulador para no
// mantener una segunda lista en paralelo.
function nombre(clave) {
    const op = document.querySelector('#selectorRitmo option[value="' + clave + '"]');
    return op ? op.textContent.trim() : clave;
}

// Monta las tiras declaradas en el HTML con <div class="tira-ecg"
// data-ritmo="..." data-segundos="..."> y un pie opcional.
function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';

    const info = crear({
        ritmo: raiz.dataset.ritmo,
        segundos: Number(raiz.dataset.segundos) || 6
    });
    if (!info) { raiz.dataset.listo = 'false'; return; }
    raiz.appendChild(info.nodo);

    const pie = document.createElement('p');
    pie.className = 'tira-ecg-pie';
    pie.innerHTML = '<span class="tira-ecg-calibre">' + info.segundos + ' s · ' + MM_POR_SEGUNDO
                  + ' mm/s · 10 mm/mV</span>'
                  + (raiz.dataset.pie ? ' ' + raiz.dataset.pie : '');
    raiz.appendChild(pie);
}

const observador = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('tira-ecg')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.tira-ecg')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.TiraECG.crear = crear;
    OVA.TiraECG.montar = montar;
    OVA.TiraECG.nombre = nombre;
    OVA.TiraECG.MM_POR_SEGUNDO = MM_POR_SEGUNDO;
    OVA.TiraECG.UNIDADES_POR_MM = UNIDADES_POR_MM;
    OVA.TiraECG.NO_MEDIBLES = NO_MEDIBLES;

})(window.OVA = window.OVA || {});

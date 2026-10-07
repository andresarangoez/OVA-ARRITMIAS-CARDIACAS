(function (OVA) {
    OVA.SimuladorPotencial = OVA.SimuladorPotencial || {};

// --- CURVA DEL POTENCIAL DE ACCIÓN (Módulo 01, Unidad 2) ---
//
// Adaptación del prototipo «Potencial de acción del miocito de trabajo» a la
// arquitectura del OVA. Cambios respecto del original:
//
// · El panel de texto del prototipo se retira: las fases ya están redactadas
//   en el recorrido de la izquierda, con el texto aprobado del documento de
//   módulos. Dejar los dos habría dado dos descripciones distintas de lo
//   mismo. Aquí se conserva solo lo que el texto no cuenta: el trazado y las
//   corrientes iónicas de cada fase.
// · Seleccionar una fase —en la curva o en las pestañas— activa también el
//   panel correspondiente de la izquierda, y al revés.
// · Se retira una nota del prototipo dirigida a su autor («en tu segundo
//   diagrama los nombres de canal parecen intercambiados»), que no es
//   contenido para el estudiante.
//
// Los módulos se inyectan con innerHTML, así que el montaje va por el mismo
// MutationObserver sobre #vista-modulo que los demás widgets.

const NS = 'http://www.w3.org/2000/svg';

// Tramos de la curva, en el orden en que se recorren. La geometría viene del
// prototipo; cada tramo declara a qué fase pertenece y cuánto dura en la
// reproducción.
const TRAMOS = [
    { id: 's4a', fase: '4', d: 'M60,324 L140,324', ms: 700 },
    { id: 's0', fase: '0', d: 'M140,324 L152,60', ms: 650 },
    { id: 's1', fase: '1', d: 'M152,60 Q160,86 180,88', ms: 650 },
    { id: 's2', fase: '2', d: 'M180,88 C300,84 400,90 480,104', ms: 2200 },
    { id: 's3', fase: '3', d: 'M480,104 C540,112 575,300 615,324', ms: 1600 },
    { id: 's4b', fase: '4', d: 'M615,324 L760,324', ms: 800 }
];

const ROTULOS = [
    { fase: '4', x: 92, y: 305 }, { fase: '0', x: 108, y: 190 },
    { fase: '1', x: 168, y: 52 }, { fase: '2', x: 320, y: 72 },
    { fase: '3', x: 580, y: 205 }, { fase: '4', x: 680, y: 305 }
];

// Cada corriente se nombra por lo que hace, no por la subunidad del canal:
// la nomenclatura molecular (Nav1.5, Kv7.1 y demás) queda por encima del
// nivel del módulo y no aporta nada al reconocimiento del trazado.
const FASES = {
    '0': {
        mv: 'De −80/−90 mV hasta cerca de +20 mV, en una fracción de milisegundo.',
        corrientes: [['Na⁺', 'entra', 'corriente rápida de sodio']]
    },
    '1': {
        mv: 'Una pequeña muesca justo después del pico.',
        corrientes: [['K⁺ (y Cl⁻)', 'sale', 'salida transitoria']]
    },
    '2': {
        mv: 'Potencial sostenido cerca del máximo durante 0,2 a 0,3 segundos.',
        corrientes: [
            ['Ca²⁺', 'entra', 'canales lentos de calcio tipo L'],
            ['K⁺', 'sale, frenada', 'rectificador ultrarrápido'],
            ['K⁺', 'sale, lenta', 'rectificador tardío lento']
        ]
    },
    '3': {
        mv: 'Cae hasta devolver la célula a −80/−90 mV.',
        corrientes: [
            ['K⁺', 'sale', 'rectificador tardío rápido'],
            ['K⁺', 'sale', 'rectificador tardío lento'],
            ['K⁺', 'sale y entra', 'rectificador de entrada']
        ]
    },
    '4': {
        mv: '−80 a −90 mV, estable hasta el próximo estímulo.',
        corrientes: [['K⁺', 'sale y entra', 'rectificador de entrada']]
    }
};

const ORDEN = ['0', '1', '2', '3', '4'];
let animacion = null;

function crear(nombre, atributos, texto) {
    const nodo = document.createElementNS(NS, nombre);
    Object.keys(atributos || {}).forEach((k) => nodo.setAttribute(k, atributos[k]));
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

// --- DIBUJO ---

function construirSvg(raiz) {
    const svg = crear('svg', {
        viewBox: '0 0 800 380',
        class: 'sim-pa-svg',
        role: 'img',
        'aria-label': 'Curva del potencial de acción cardíaco con las fases 0 a 4'
    });

    const guias = crear('g', { class: 'sim-pa-guias' });
    guias.appendChild(crear('line', { x1: 50, y1: 126, x2: 780, y2: 126 }));
    guias.appendChild(crear('line', { x1: 50, y1: 324, x2: 780, y2: 324 }));
    svg.appendChild(guias);

    svg.appendChild(crear('text', { class: 'sim-pa-eje', x: 8, y: 130 }, '0 mV'));
    svg.appendChild(crear('text', { class: 'sim-pa-eje', x: 8, y: 64 }, '+30'));
    svg.appendChild(crear('text', { class: 'sim-pa-eje', x: 4, y: 328 }, '−90'));
    svg.appendChild(crear('text', {
        class: 'sim-pa-eje', x: 395, y: 356, 'text-anchor': 'middle'
    }, 'Tiempo (unos 200 a 300 ms)'));

    TRAMOS.forEach((t) => {
        svg.appendChild(crear('path', {
            d: t.d, 'data-tramo': t.id, 'data-fase': t.fase,
            class: 'sim-pa-tramo sim-pa-fase--' + t.fase
        }));
    });

    // Zonas sensibles: el mismo trazo con un grosor mucho mayor y
    // transparente, para que acertar una fase no dependa de la puntería.
    const zonas = crear('g', { class: 'sim-pa-zonas' });
    TRAMOS.forEach((t) => {
        const zona = crear('path', { d: t.d, class: 'sim-pa-zona' });
        zona.addEventListener('click', () => {
            detener(raiz);
            seleccionar(raiz, t.fase);
        });
        zonas.appendChild(zona);
    });
    svg.appendChild(zonas);

    ROTULOS.forEach((r) => {
        svg.appendChild(crear('text', {
            class: 'sim-pa-rotulo sim-pa-fase--' + r.fase, x: r.x, y: r.y
        }, r.fase));
    });

    svg.appendChild(crear('circle', { class: 'sim-pa-punto', r: 7, cx: 60, cy: 324 }));
    return svg;
}

function construirPestanas(raiz) {
    const barra = raiz.querySelector('.sim-pa-tabs');
    if (!barra) return;
    barra.textContent = '';

    ORDEN.forEach((fase) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sim-pa-tab sim-pa-fase--' + fase;
        b.dataset.fase = fase;
        b.textContent = 'Fase ' + fase;
        b.addEventListener('click', () => { detener(raiz); seleccionar(raiz, fase); });
        barra.appendChild(b);
    });

    // El botón de reproducir vive en la cabecera, no entre las pestañas: no
    // selecciona una fase, recorre todas.
    const hueco = raiz.querySelector('.sim-pa-play-wrap');
    if (!hueco) return;
    hueco.textContent = '';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'sim-pa-play';
    play.textContent = '▶ Reproducir';
    play.addEventListener('click', () => alternarReproduccion(raiz));
    hueco.appendChild(play);
}

// --- SELECCIÓN ---

function seleccionar(raiz, fase, sinPropagar) {
    raiz.dataset.fase = fase;

    raiz.querySelectorAll('.sim-pa-tramo').forEach((t) => {
        t.classList.toggle('activo', t.dataset.fase === fase);
    });
    raiz.querySelectorAll('.sim-pa-tab').forEach((b) => {
        b.classList.toggle('activo', b.dataset.fase === fase);
    });

    const datos = FASES[fase];
    const mv = raiz.querySelector('.sim-pa-mv');
    if (mv) mv.textContent = datos.mv;

    const lista = raiz.querySelector('.sim-pa-corrientes');
    if (lista) {
        lista.innerHTML = datos.corrientes.map(([ion, sentido, corriente]) => {
            const clase = sentido.indexOf('entra') === 0 ? 'entra' : 'sale';
            return '<div class="sim-pa-corriente"><b>' + ion +
                ' <span class="' + clase + '">' + sentido + '</span></b><small>' +
                corriente + '</small></div>';
        }).join('');
    }

    if (!sinPropagar) activarTextoAsociado(raiz, fase);
}

// El recorrido de la izquierda y la curva de la derecha describen la misma
// fase, así que se mueven juntos.
function activarTextoAsociado(raiz, fase) {
    const fila = raiz.closest('.pa-fila');
    if (!fila) return;
    const boton = fila.querySelector('.stepper-nav button[data-fase="' + fase + '"]');
    if (boton && typeof activarPasoStepper === 'function') {
        activarPasoStepper(boton, 'fase' + fase);
    }
}

// Se llama desde el onclick de los botones del recorrido de texto.
function sincronizar(boton, fase) {
    const fila = boton.closest('.pa-fila');
    if (!fila) return;
    const raiz = fila.querySelector('.sim-pa');
    if (!raiz) return;
    detener(raiz);
    seleccionar(raiz, fase, true);
}

// --- REPRODUCCIÓN ---

function detener(raiz) {
    if (animacion) cancelAnimationFrame(animacion);
    animacion = null;
    const play = raiz.querySelector('.sim-pa-play');
    if (play) { play.textContent = '▶ Reproducir'; play.classList.remove('reproduciendo'); }
}

function alternarReproduccion(raiz) {
    if (animacion) { detener(raiz); return; }

    const play = raiz.querySelector('.sim-pa-play');
    const punto = raiz.querySelector('.sim-pa-punto');
    if (!punto) return;
    if (play) { play.textContent = '■ Detener'; play.classList.add('reproduciendo'); }

    let i = 0;
    let inicio = performance.now();

    const paso = (ahora) => {
        const tramo = TRAMOS[i];
        const trazo = raiz.querySelector('.sim-pa-tramo[data-tramo="' + tramo.id + '"]');
        if (!trazo) { detener(raiz); return; }

        const avance = Math.min((ahora - inicio) / tramo.ms, 1);
        if (raiz.dataset.fase !== tramo.fase) seleccionar(raiz, tramo.fase);

        const p = trazo.getPointAtLength(trazo.getTotalLength() * avance);
        punto.setAttribute('cx', p.x);
        punto.setAttribute('cy', p.y);

        if (avance >= 1) {
            i++;
            inicio = ahora;
            if (i >= TRAMOS.length) { detener(raiz); return; }
        }
        animacion = requestAnimationFrame(paso);
    };

    animacion = requestAnimationFrame(paso);
}

// --- MONTAJE ---

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';

    const lienzo = raiz.querySelector('.sim-pa-lienzo');
    if (lienzo) { lienzo.textContent = ''; lienzo.appendChild(construirSvg(raiz)); }
    construirPestanas(raiz);
    seleccionar(raiz, raiz.dataset.fase || '0', true);
}

const observador = new MutationObserver((mutaciones) => {
    mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('sim-pa')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.sim-pa')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.SimuladorPotencial.sincronizar = sincronizar;
    OVA.SimuladorPotencial.montar = montar;

})(window.OVA = window.OVA || {});

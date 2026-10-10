(function (OVA) {
    OVA.Wiggers = OVA.Wiggers || {};

// --- DIAGRAMA DE WIGGERS (Módulo 01, Unidad 3) ---
//
// Las cuatro curvas del ciclo cardíaco sobre un mismo eje de tiempo, con el
// ECG debajo y las válvulas en su propia banda. Lo que enseña este recurso es
// a LEER el diagrama: qué pasa a la vez en la presión, el volumen y el
// trazado en cada instante del latido.
//
// Es distinto del diagrama de fases (js/29-ciclo-cardiaco.js), que muestra el
// interior del corazón fase a fase. Aquí no hay anatomía; allí no hay curvas.
// Los dos leen la misma fisiología de js/27-ciclo-cardiaco-datos.js, así que
// no pueden contradecirse.
//
// Las curvas se calculan punto a punto con OVA.CicloCardiaco.valorEn(): no
// son caminos SVG dibujados a ojo. La consecuencia práctica es que la línea
// de volumen está plana exactamente durante las dos fases isovolumétricas, y
// que la aórtica y la ventricular coinciden exactamente mientras la válvula
// está abierta, sin que haya que cuadrarlo a mano.
//
// Los módulos se inyectan con innerHTML, así que el montaje va por el mismo
// MutationObserver sobre #vista-modulo que los demás widgets del OVA.

const NS = 'http://www.w3.org/2000/svg';

// Lienzo. El eje de tiempo ocupa todo el ancho; la altura se reparte entre el
// panel de presiones (el más alto, porque es donde se cruzan las tres curvas),
// el de volumen, el de válvulas y el del ECG.
const L = {
    ancho: 980, alto: 560,
    margenIzq: 92, margenDer: 26, margenSup: 34,
    presiones: { y: 34,  alto: 210, min: 0,  max: 130 },
    volumen:   { y: 268, alto: 92,  min: 30, max: 135 },
    valvulas:  { y: 382, alto: 56 },
    ecg:       { y: 454, alto: 86 }
};

let instancias = 0;

function crear(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
}

function x(t) {
    const C = OVA.CicloCardiaco;
    const util = L.ancho - L.margenIzq - L.margenDer;
    return L.margenIzq + (t / C.DURACION) * util;
}

function yEn(panel, valor) {
    const p = L[panel];
    const frac = (valor - p.min) / (p.max - p.min);
    return p.y + p.alto - frac * p.alto;
}

// --- CONSTRUCCIÓN DEL SVG ---

function construirSvg(raiz) {
    const C = OVA.CicloCardiaco;
    const px = raiz.dataset.wgPrefijo;
    const svg = crear('svg', {
        viewBox: '0 0 ' + L.ancho + ' ' + L.alto,
        class: 'wg-svg',
        role: 'img',
        'aria-label': 'Diagrama de Wiggers: presiones, volumen ventricular, estado de las válvulas y electrocardiograma a lo largo de un ciclo cardíaco de 0,8 segundos.'
    });

    // Bandas de fase al fondo, para que cada tramo del diagrama quede
    // visualmente asociado a su fase.
    const fondo = crear('g', { class: 'wg-bandas' });
    C.FASES.forEach(function (f) {
        const banda = crear('rect', {
            x: x(f.desde), y: L.margenSup - 6,
            width: x(f.hasta) - x(f.desde),
            height: L.ecg.y + L.ecg.alto - L.margenSup + 6,
            class: 'wg-banda wg-banda--' + f.periodo,
            'data-fase': f.id
        });
        fondo.appendChild(banda);
        // Línea divisoria entre fases
        fondo.appendChild(crear('line', {
            x1: x(f.desde), x2: x(f.desde),
            y1: L.margenSup - 6, y2: L.ecg.y + L.ecg.alto,
            class: 'wg-divisoria'
        }));
    });
    svg.appendChild(fondo);

    // --- Panel de presiones ---
    svg.appendChild(ejeY('presiones', [0, 40, 80, 120], 'mmHg'));
    ['presionAorta', 'presionVI', 'presionAI'].forEach(function (clave) {
        svg.appendChild(crear('path', {
            d: camino(clave, 'presiones'),
            class: 'wg-curva wg-curva--' + clave,
            id: px + 'curva-' + clave
        }));
    });

    // --- Panel de volumen ---
    svg.appendChild(ejeY('volumen', [50, 90, 120], 'mL'));
    svg.appendChild(crear('path', {
        d: camino('volumen', 'volumen'),
        class: 'wg-curva wg-curva--volumen',
        id: px + 'curva-volumen'
    }));

    // --- Banda de válvulas ---
    svg.appendChild(bandaValvulas(px));

    // --- ECG ---
    svg.appendChild(crear('line', {
        x1: L.margenIzq, x2: L.ancho - L.margenDer,
        y1: L.ecg.y + L.ecg.alto * 0.72, y2: L.ecg.y + L.ecg.alto * 0.72,
        class: 'wg-ecg-base'
    }));
    svg.appendChild(crear('path', { d: caminoEcg(), class: 'wg-ecg' }));
    svg.appendChild(rotulo(L.margenIzq - 10, L.ecg.y + L.ecg.alto * 0.55, 'ECG', 'wg-rotulo-eje'));
    [['P', 0.045], ['QRS', 0.178], ['T', 0.43]].forEach(function (o) {
        svg.appendChild(rotulo(x(o[1]), L.ecg.y + L.ecg.alto + 16, o[0], 'wg-rotulo-onda', 'middle'));
    });

    // --- Eje de tiempo ---
    const ejeT = crear('g', { class: 'wg-eje-tiempo' });
    for (let t = 0; t <= C.DURACION + 0.001; t += 0.1) {
        ejeT.appendChild(crear('line', {
            x1: x(t), x2: x(t), y1: L.ecg.y + L.ecg.alto, y2: L.ecg.y + L.ecg.alto + 5,
            class: 'wg-marca'
        }));
        ejeT.appendChild(rotulo(x(t), L.ecg.y + L.ecg.alto + 30, t.toFixed(1), 'wg-rotulo-tiempo', 'middle'));
    }
    ejeT.appendChild(rotulo(L.ancho - L.margenDer, L.ecg.y + L.ecg.alto + 46, 'segundos', 'wg-rotulo-eje', 'end'));
    svg.appendChild(ejeT);

    // --- Nombres de fase, arriba ---
    const nombres = crear('g', { class: 'wg-nombres' });
    C.FASES.forEach(function (f) {
        const centro = (x(f.desde) + x(f.hasta)) / 2;
        const g = crear('g', { class: 'wg-nombre', 'data-fase': f.id, tabindex: '0', role: 'button' });
        g.appendChild(crear('title', {})).textContent = f.nombre + '. ' + f.resumen;
        g.appendChild(rotulo(centro, 20, f.corto, 'wg-nombre-texto', 'middle'));
        nombres.appendChild(g);
    });
    svg.appendChild(nombres);

    // --- Cursor: el instante actual ---
    const cursor = crear('g', { class: 'wg-cursor', id: px + 'cursor' });
    cursor.appendChild(crear('line', {
        x1: 0, x2: 0, y1: L.margenSup - 6, y2: L.ecg.y + L.ecg.alto,
        class: 'wg-cursor-linea'
    }));
    ['presionAorta', 'presionVI', 'presionAI'].forEach(function (c) {
        cursor.appendChild(crear('circle', { r: 4.5, class: 'wg-cursor-punto wg-cursor-punto--' + c, 'data-curva': c }));
    });
    cursor.appendChild(crear('circle', { r: 4.5, class: 'wg-cursor-punto wg-cursor-punto--volumen', 'data-curva': 'volumen' }));
    svg.appendChild(cursor);

    return svg;
}

function camino(clave, panel) {
    const C = OVA.CicloCardiaco;
    const pasos = 340;
    let d = '';
    for (let i = 0; i <= pasos; i++) {
        const t = (i / pasos) * C.DURACION;
        const p = x(t).toFixed(2) + ',' + yEn(panel, C.valorEn(clave, t)).toFixed(2);
        d += (i === 0 ? 'M' : 'L') + p;
    }
    return d;
}

function caminoEcg() {
    const C = OVA.CicloCardiaco;
    const base = L.ecg.y + L.ecg.alto * 0.72;
    const escala = L.ecg.alto * 0.62;
    const pasos = 560;
    let d = '';
    for (let i = 0; i <= pasos; i++) {
        const t = (i / pasos) * C.DURACION;
        const p = x(t).toFixed(2) + ',' + (base - C.ecgEn(t) * escala).toFixed(2);
        d += (i === 0 ? 'M' : 'L') + p;
    }
    return d;
}

function ejeY(panel, valores, unidad) {
    const g = crear('g', { class: 'wg-eje-y' });
    valores.forEach(function (v) {
        const y = yEn(panel, v);
        g.appendChild(crear('line', {
            x1: L.margenIzq, x2: L.ancho - L.margenDer, y1: y, y2: y, class: 'wg-rejilla'
        }));
        g.appendChild(rotulo(L.margenIzq - 8, y + 4, String(v), 'wg-rotulo-valor', 'end'));
    });
    g.appendChild(rotulo(L.margenIzq - 8, L[panel].y - 6, unidad, 'wg-rotulo-eje', 'end'));
    return g;
}

// Cada válvula ocupa su carril. El tramo coloreado es el intervalo en que
// está abierta; las auriculoventriculares aparecen partidas en dos porque su
// apertura cruza el final del ciclo.
function bandaValvulas(px) {
    const C = OVA.CicloCardiaco;
    const g = crear('g', { class: 'wg-valvulas' });
    const claves = ['mitral', 'aortica', 'tricuspide', 'pulmonar'];
    const altoCarril = L.valvulas.alto / claves.length;

    claves.forEach(function (clave, i) {
        const v = C.VALVULAS[clave];
        const y = L.valvulas.y + i * altoCarril;
        g.appendChild(crear('line', {
            x1: L.margenIzq, x2: L.ancho - L.margenDer,
            y1: y + altoCarril / 2, y2: y + altoCarril / 2,
            class: 'wg-valvula-carril'
        }));

        const tramos = v.abre < v.cierra
            ? [[v.abre, v.cierra]]
            : [[v.abre, C.DURACION], [0, v.cierra]];

        tramos.forEach(function (tr) {
            g.appendChild(crear('rect', {
                x: x(tr[0]), y: y + altoCarril / 2 - 5,
                width: Math.max(1, x(tr[1]) - x(tr[0])), height: 10, rx: 5,
                class: 'wg-valvula-abierta wg-valvula-abierta--' + v.tipo,
                id: px + 'valvula-' + clave + '-' + Math.round(tr[0] * 100)
            }));
        });

        g.appendChild(rotulo(L.margenIzq - 8, y + altoCarril / 2 + 4, v.nombre, 'wg-rotulo-valvula', 'end'));
    });

    g.appendChild(rotulo(L.margenIzq - 8, L.valvulas.y - 6, 'Válvulas', 'wg-rotulo-eje', 'end'));
    return g;
}

function rotulo(cx, cy, texto, clase, anclaje) {
    const t = crear('text', { x: cx, y: cy, class: clase });
    if (anclaje) t.setAttribute('text-anchor', anclaje);
    t.textContent = texto;
    return t;
}

// --- ESTADO Y REPRODUCCIÓN ---

const estados = new WeakMap();

function leer(raiz) {
    if (!estados.has(raiz)) estados.set(raiz, { t: 0, animando: false, rafId: null, ultimo: 0 });
    return estados.get(raiz);
}

function actualizar(raiz, t) {
    const C = OVA.CicloCardiaco;
    const px = raiz.dataset.wgPrefijo;
    const svg = raiz.querySelector('.wg-svg');
    if (!svg) return;

    const cursor = svg.querySelector('#' + px + 'cursor');
    cursor.querySelector('.wg-cursor-linea').setAttribute('x1', x(t));
    cursor.querySelector('.wg-cursor-linea').setAttribute('x2', x(t));
    cursor.querySelectorAll('.wg-cursor-punto').forEach(function (p) {
        const clave = p.dataset.curva;
        const panel = clave === 'volumen' ? 'volumen' : 'presiones';
        p.setAttribute('cx', x(t));
        p.setAttribute('cy', yEn(panel, C.valorEn(clave, t)));
    });

    const fase = C.faseEn(t);
    svg.querySelectorAll('.wg-banda').forEach(function (b) {
        b.classList.toggle('activa', b.dataset.fase === fase.id);
    });
    svg.querySelectorAll('.wg-nombre').forEach(function (n) {
        n.classList.toggle('activo', n.dataset.fase === fase.id);
    });

    pintarLectura(raiz, t, fase);
    leer(raiz).t = t;
}

// Panel lateral: los valores del instante actual y la explicación de la fase.
// Es lo que convierte el cursor en una lectura y no en un adorno que se mueve.
function pintarLectura(raiz, t, fase) {
    const C = OVA.CicloCardiaco;
    const panel = raiz.querySelector('.wg-lectura');
    if (!panel) return;

    const val = function (c) { return Math.round(C.valorEn(c, t)); };
    const valvulas = C.estadoValvulas(t);

    panel.querySelector('[data-campo="fase"]').textContent = fase.nombre;
    panel.querySelector('[data-campo="periodo"]').textContent =
        fase.periodo === 'sistole' ? 'Sístole ventricular' : 'Diástole ventricular';
    panel.querySelector('[data-campo="periodo"]').dataset.periodo = fase.periodo;
    panel.querySelector('[data-campo="tiempo"]').textContent = t.toFixed(2).replace('.', ',') + ' s';
    panel.querySelector('[data-campo="ecg"]').textContent = fase.ecg;
    panel.querySelector('[data-campo="detalle"]').textContent = fase.detalle;

    panel.querySelector('[data-campo="presionVI"]').textContent = val('presionVI') + ' mmHg';
    panel.querySelector('[data-campo="presionAorta"]').textContent = val('presionAorta') + ' mmHg';
    panel.querySelector('[data-campo="presionAI"]').textContent = val('presionAI') + ' mmHg';
    panel.querySelector('[data-campo="volumen"]').textContent = val('volumen') + ' mL';

    panel.querySelectorAll('[data-valvula]').forEach(function (el) {
        const abierta = valvulas[el.dataset.valvula];
        el.dataset.estado = abierta ? 'abierta' : 'cerrada';
        el.querySelector('.wg-valvula-estado').textContent = abierta ? 'Abierta' : 'Cerrada';
    });

    const evento = panel.querySelector('[data-campo="evento"]');
    evento.textContent = fase.evento || '';
    evento.hidden = !fase.evento;
}

function reproducir(raiz) {
    const C = OVA.CicloCardiaco;
    const st = leer(raiz);
    if (st.animando) return;
    st.animando = true;
    st.ultimo = performance.now();
    raiz.querySelector('[data-accion="reproducir"]').textContent = 'Pausar';

    // Cuatro veces más lento que el corazón real: a 0,8 s por ciclo no da
    // tiempo a leer nada.
    const FACTOR = 0.25;

    const paso = function (ahora) {
        if (!raiz.isConnected) { st.animando = false; return; }   // el módulo se reemplaza con innerHTML
        const dt = Math.min(100, ahora - st.ultimo) / 1000;
        st.ultimo = ahora;
        let t = st.t + dt * FACTOR;
        if (t >= C.DURACION) t -= C.DURACION;
        actualizar(raiz, t);
        if (st.animando) st.rafId = requestAnimationFrame(paso);
    };
    st.rafId = requestAnimationFrame(paso);
}

function pausar(raiz) {
    const st = leer(raiz);
    st.animando = false;
    if (st.rafId) cancelAnimationFrame(st.rafId);
    const btn = raiz.querySelector('[data-accion="reproducir"]');
    if (btn) btn.textContent = 'Reproducir';
}

// --- MONTAJE ---

function plantilla(px) {
    const C = OVA.CicloCardiaco;
    const valvulas = ['mitral', 'aortica', 'tricuspide', 'pulmonar'].map(function (k) {
        return '<li class="wg-valvula-ficha" data-valvula="' + k + '">'
             + '<span class="wg-valvula-nombre">' + C.VALVULAS[k].nombre + '</span>'
             + '<span class="wg-valvula-estado">Cerrada</span></li>';
    }).join('');

    const botonesFase = C.FASES.map(function (f, i) {
        return '<button type="button" class="wg-fase-btn" data-ir-fase="' + f.id + '"'
             + (i === 0 ? ' aria-current="true"' : '') + '>' + f.corto + '</button>';
    }).join('');

    return ''
      + '<div class="wg-controles">'
      + '  <button type="button" class="btn-accion" data-accion="reproducir">Reproducir</button>'
      + '  <button type="button" class="btn-accion" data-accion="reiniciar">Reiniciar</button>'
      + '  <label class="wg-tiempo-control">Momento del ciclo'
      + '    <input type="range" min="0" max="799" value="0" step="1" data-accion="deslizar"'
      + '           aria-label="Momento del ciclo cardíaco, en milisegundos">'
      + '  </label>'
      + '</div>'
      + '<div class="wg-fases">' + botonesFase + '</div>'
      + '<div class="wg-cuerpo">'
      + '  <div class="wg-lienzo"></div>'
      + '  <aside class="wg-lectura">'
      + '    <p class="wg-lectura-periodo"><span data-campo="periodo" data-periodo="diastole"></span>'
      + '       <span class="wg-lectura-tiempo" data-campo="tiempo"></span></p>'
      + '    <h5 class="wg-lectura-fase" data-campo="fase"></h5>'
      + '    <p class="wg-lectura-evento" data-campo="evento" hidden></p>'
      + '    <dl class="wg-cifras">'
      + '      <div><dt>Presión ventricular</dt><dd data-campo="presionVI"></dd></div>'
      + '      <div><dt>Presión aórtica</dt><dd data-campo="presionAorta"></dd></div>'
      + '      <div><dt>Presión auricular</dt><dd data-campo="presionAI"></dd></div>'
      + '      <div><dt>Volumen ventricular</dt><dd data-campo="volumen"></dd></div>'
      + '    </dl>'
      + '    <ul class="wg-valvulas-lista">' + valvulas + '</ul>'
      + '    <p class="wg-lectura-ecg"><strong>En el ECG:</strong> <span data-campo="ecg"></span></p>'
      + '    <p class="wg-lectura-detalle" data-campo="detalle"></p>'
      + '  </aside>'
      + '</div>';
}

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    if (!OVA.CicloCardiaco) return;
    raiz.dataset.listo = 'true';
    raiz.dataset.wgPrefijo = 'wg' + (++instancias) + '-';

    raiz.innerHTML = plantilla(raiz.dataset.wgPrefijo);
    raiz.querySelector('.wg-lienzo').appendChild(construirSvg(raiz));

    const C = OVA.CicloCardiaco;
    const rango = raiz.querySelector('[data-accion="deslizar"]');

    raiz.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.accion === 'reproducir') {
            leer(raiz).animando ? pausar(raiz) : reproducir(raiz);
        } else if (btn.dataset.accion === 'reiniciar') {
            pausar(raiz);
            actualizar(raiz, 0);
            rango.value = 0;
            marcarFase(raiz, C.FASES[0].id);
        } else if (btn.dataset.irFase) {
            pausar(raiz);
            const f = C.FASES.find(function (x) { return x.id === btn.dataset.irFase; });
            // Se sitúa un poco dentro de la fase, no en su borde exacto: en el
            // límite, las dos fases son igual de válidas y el panel parpadea.
            const t = f.desde + (f.hasta - f.desde) * 0.35;
            actualizar(raiz, t);
            rango.value = Math.round(t * 1000);
            marcarFase(raiz, f.id);
        }
    });

    // Clic sobre el nombre de fase dentro del diagrama: el mismo efecto que
    // el botón, para que las dos formas de navegar hagan lo mismo.
    raiz.querySelector('.wg-svg').addEventListener('click', function (e) {
        const n = e.target.closest('.wg-nombre');
        if (!n) return;
        const btn = raiz.querySelector('[data-ir-fase="' + n.dataset.fase + '"]');
        if (btn) btn.click();
    });

    rango.addEventListener('input', function () {
        pausar(raiz);
        const t = Number(rango.value) / 1000;
        actualizar(raiz, t);
        marcarFase(raiz, C.faseEn(t).id);
    });

    actualizar(raiz, 0);
}

function marcarFase(raiz, id) {
    raiz.querySelectorAll('.wg-fase-btn').forEach(function (b) {
        if (b.dataset.irFase === id) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
    });
}

const observador = new MutationObserver(function (mutaciones) {
    mutaciones.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('wg-diagrama')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.wg-diagrama')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.Wiggers.montar = montar;

})(window.OVA = window.OVA || {});

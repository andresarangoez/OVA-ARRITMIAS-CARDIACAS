(function (OVA) {
    OVA.CicloFases = OVA.CicloFases || {};

// --- DIAGRAMA INTERACTIVO DEL CICLO CARDÍACO (Módulo 01, Unidad 3) ---
//
// Objetivo distinto del diagrama de Wiggers, aunque el tema sea el mismo. El
// de Wiggers (js/28-diagrama-wiggers.js) enseña a LEER las curvas: qué valor
// tiene cada variable en cada instante. Este enseña QUÉ PASA DENTRO del
// corazón en cada fase: qué cámara se contrae, qué válvula se abre, hacia
// dónde va la sangre.
//
// Por eso aquí no hay ejes ni curvas, sino un esquema del corazón que cambia
// con la fase, y la navegación no es un deslizador continuo sino un anillo de
// cinco fases que se recorre paso a paso. Son los dos modos de mirar lo
// mismo, y el documento pide explícitamente que no se dupliquen.
//
// La fisiología —tiempos, válvulas, presiones y volúmenes— sale de
// js/27-ciclo-cardiaco-datos.js, la misma fuente que el de Wiggers.
//
// Representación bidimensional a propósito: un modelo 3D pesaría más y
// explicaría menos que un corte esquemático donde se ven las cuatro cámaras y
// las cuatro válvulas a la vez.

const NS = 'http://www.w3.org/2000/svg';
let instancias = 0;

// Qué cámaras están contraídas en cada fase, y por dónde entra o sale sangre.
// Se declara aquí y no en el módulo de datos porque es específico de esta
// representación: el diagrama de Wiggers no dibuja cámaras.
const ESCENA = {
    'sistole-auricular': {
        auriculas: 'contraida', ventriculos: 'relajado',
        flujo: ['auricula-ventriculo'],
        nota: 'Las aurículas se contraen y terminan de llenar los ventrículos.'
    },
    'contraccion-isovolumetrica': {
        auriculas: 'relajada', ventriculos: 'contrayendo',
        flujo: [],
        nota: 'Los ventrículos se contraen, pero la sangre no tiene por dónde salir.'
    },
    'eyeccion': {
        auriculas: 'relajada', ventriculos: 'contraido',
        flujo: ['ventriculo-arteria'],
        nota: 'La sangre sale hacia la aorta y la arteria pulmonar.'
    },
    'relajacion-isovolumetrica': {
        auriculas: 'relajada', ventriculos: 'relajando',
        flujo: [],
        nota: 'Los ventrículos se relajan con todo cerrado; la sangre vuelve a llenar las aurículas.'
    },
    'llenado': {
        auriculas: 'relajada', ventriculos: 'relajado',
        flujo: ['auricula-ventriculo'],
        nota: 'La sangre pasa de las aurículas a los ventrículos por su propia diferencia de presión.'
    }
};

function crear(tag, attrs, texto) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (texto != null) el.textContent = texto;
    return el;
}

// --- ESQUEMA DEL CORAZÓN ---
// Corte frontal esquemático: aurículas arriba, ventrículos abajo, lado
// derecho del paciente a la izquierda de la imagen, como en toda la
// iconografía clínica.
function construirCorazon(px) {
    const svg = crear('svg', {
        viewBox: '0 0 360 320', class: 'cf-corazon', role: 'img',
        'aria-label': 'Esquema del corazón con sus cuatro cámaras y sus cuatro válvulas; cambia según la fase seleccionada.'
    });

    // Punta de flecha para las líneas de flujo.
    const defs = crear('defs', {});
    const marca = crear('marker', {
        id: px + 'punta', viewBox: '0 0 10 10', refX: '7', refY: '5',
        markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse'
    });
    marca.appendChild(crear('path', { d: 'M0,1 L9,5 L0,9 Z', class: 'cf-punta' }));
    defs.appendChild(marca);
    svg.appendChild(defs);

    // Grandes vasos
    svg.appendChild(crear('path', { d: 'M92,66 C92,30 84,22 84,6', class: 'cf-vaso cf-vaso--vena' }));
    svg.appendChild(crear('path', { d: 'M152,52 C152,22 176,18 178,4', class: 'cf-vaso cf-vaso--arteria' }));
    svg.appendChild(crear('path', { d: 'M210,52 C210,20 188,16 186,4', class: 'cf-vaso cf-vaso--aorta' }));
    svg.appendChild(crear('path', { d: 'M272,66 C272,30 280,22 280,6', class: 'cf-vaso cf-vaso--vena' }));

    // Pared del ventrículo izquierdo. Se dibuja antes que las cámaras, como
    // una capa de miocardio por detrás: el VI trabaja contra la presión
    // sistémica y su pared es unas tres veces más gruesa que la del derecho.
    // No es decoración, es de las diferencias anatómicas que el módulo nombra.
    svg.appendChild(crear('path', {
        d: 'M198,132 L306,132 L306,236 C306,278 276,306 250,306 C222,306 198,276 198,236 Z',
        class: 'cf-miocardio cf-miocardio--izq'
    }));
    svg.appendChild(crear('path', {
        d: 'M58,136 L156,136 L156,232 C156,268 128,292 104,292 C80,292 58,266 58,232 Z',
        class: 'cf-miocardio cf-miocardio--der'
    }));

    // Aurículas
    svg.appendChild(crear('path', {
        d: 'M66,92 C66,62 94,52 116,56 C138,60 148,74 148,92 L148,124 L66,124 Z',
        class: 'cf-camara cf-auricula', id: px + 'auricula-der'
    }));
    svg.appendChild(crear('path', {
        d: 'M216,92 C216,62 244,52 266,56 C288,60 298,74 298,92 L298,124 L216,124 Z',
        class: 'cf-camara cf-auricula', id: px + 'auricula-izq'
    }));

    // Ventrículos (la cavidad, dentro de su pared)
    svg.appendChild(crear('path', {
        d: 'M68,146 L146,146 L146,230 C146,260 124,282 104,282 C84,282 68,260 68,230 Z',
        class: 'cf-camara cf-ventriculo', id: px + 'ventriculo-der'
    }));
    svg.appendChild(crear('path', {
        d: 'M212,146 L292,146 L292,232 C292,266 270,292 250,292 C228,292 212,266 212,232 Z',
        class: 'cf-camara cf-ventriculo', id: px + 'ventriculo-izq'
    }));

    // Tabique
    svg.appendChild(crear('line', { x1: 182, y1: 58, x2: 182, y2: 300, class: 'cf-tabique' }));

    // Válvulas. El estado se lee en la FORMA, no solo en el color: cerradas,
    // las dos valvas se juntan en el centro; abiertas, se separan y dejan el
    // paso libre. Las auriculoventriculares, además, se abomban hacia la
    // aurícula cuando se cierran, que es lo que de verdad ocurre al subir la
    // presión ventricular.
    svg.appendChild(valvula(px, 'tricuspide', 107, 135, 'Tricúspide', 'av'));
    svg.appendChild(valvula(px, 'mitral', 252, 135, 'Mitral', 'av'));
    svg.appendChild(valvula(px, 'pulmonar', 152, 56, 'Pulmonar', 'semilunar'));
    svg.appendChild(valvula(px, 'aortica', 210, 56, 'Aórtica', 'semilunar'));

    // Flechas de flujo, ocultas salvo en las fases que corresponda.
    svg.appendChild(flecha(px, 'flujo-av-der', 'M107,104 L107,176', 'auricula-ventriculo'));
    svg.appendChild(flecha(px, 'flujo-av-izq', 'M252,104 L252,176', 'auricula-ventriculo'));
    svg.appendChild(flecha(px, 'flujo-art-der', 'M152,116 L152,40', 'ventriculo-arteria'));
    svg.appendChild(flecha(px, 'flujo-art-izq', 'M210,116 L210,40', 'ventriculo-arteria'));

    // Rótulos de cámara
    [['AD', 107, 98], ['AI', 257, 98], ['VD', 107, 205], ['VI', 252, 210]].forEach(function (r) {
        svg.appendChild(crear('text', { x: r[1], y: r[2], class: 'cf-rotulo-camara', 'text-anchor': 'middle' }, r[0]));
    });

    return svg;
}

// Cada válvula son dos valvas. Se dibujan las dos posiciones y se muestra una
// u otra según el estado: así la transición es un cambio de forma visible, y
// no hace falta confiar en que el estudiante distinga dos tonos de color.
//
//   AV cerrada      → las valvas se abomban hacia la aurícula (hacia arriba)
//   AV abierta      → cuelgan hacia el ventrículo, dejando el centro libre
//   Semilunar cerrada → las valvas se juntan en el centro del vaso
//   Semilunar abierta → se pliegan contra la pared del vaso
function valvula(px, clave, cx, cy, nombre, tipo) {
    const g = crear('g', { class: 'cf-valvula cf-valvula--' + tipo, id: px + 'valvula-' + clave, 'data-valvula': clave });
    g.appendChild(crear('title', {}, nombre));
    const a = 15;   // media anchura del orificio valvular

    if (tipo === 'av') {
        g.appendChild(crear('path', {
            d: 'M' + (cx - a) + ',' + cy + ' Q' + (cx - a / 2) + ',' + (cy - 9) + ' ' + cx + ',' + (cy - 7) +
               ' Q' + (cx + a / 2) + ',' + (cy - 9) + ' ' + (cx + a) + ',' + cy,
            class: 'cf-valva cf-valva--cerrada'
        }));
        g.appendChild(crear('path', {
            d: 'M' + (cx - a) + ',' + cy + ' Q' + (cx - a - 2) + ',' + (cy + 13) + ' ' + (cx - a + 3) + ',' + (cy + 20) +
               ' M' + (cx + a) + ',' + cy + ' Q' + (cx + a + 2) + ',' + (cy + 13) + ' ' + (cx + a - 3) + ',' + (cy + 20),
            class: 'cf-valva cf-valva--abierta'
        }));
    } else {
        g.appendChild(crear('path', {
            d: 'M' + (cx - a) + ',' + cy + ' Q' + (cx - a / 2) + ',' + (cy + 8) + ' ' + cx + ',' + (cy + 6) +
               ' Q' + (cx + a / 2) + ',' + (cy + 8) + ' ' + (cx + a) + ',' + cy,
            class: 'cf-valva cf-valva--cerrada'
        }));
        g.appendChild(crear('path', {
            d: 'M' + (cx - a) + ',' + (cy + 1) + ' L' + (cx - a + 2) + ',' + (cy - 11) +
               ' M' + (cx + a) + ',' + (cy + 1) + ' L' + (cx + a - 2) + ',' + (cy - 11),
            class: 'cf-valva cf-valva--abierta'
        }));
    }
    return g;
}

function flecha(px, id, d, tipo) {
    const g = crear('g', { class: 'cf-flujo', id: px + id, 'data-flujo': tipo });
    g.appendChild(crear('path', {
        d: d, class: 'cf-flujo-linea',
        'marker-end': 'url(#' + px + 'punta)'
    }));
    return g;
}

// --- ANILLO DE FASES ---
// Disposición circular, como los esquemas de referencia del ciclo cardíaco:
// deja ver de un vistazo que el ciclo se repite y dónde está cada fase
// respecto a la sístole y la diástole.
function construirAnillo(px) {
    const C = OVA.CicloCardiaco;
    const svg = crear('svg', {
        viewBox: '0 0 300 300', class: 'cf-anillo', role: 'group',
        'aria-label': 'Las cinco fases del ciclo cardíaco dispuestas en círculo.'
    });

    const cx = 150, cy = 150, r = 108;

    // Arcos de sístole y diástole al fondo
    svg.appendChild(crear('circle', { cx: cx, cy: cy, r: r, class: 'cf-anillo-base' }));

    C.FASES.forEach(function (f, i) {
        const ang = (-90 + (i / C.FASES.length) * 360) * Math.PI / 180;
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang);

        const g = crear('g', {
            class: 'cf-nodo cf-nodo--' + f.periodo, 'data-fase': f.id,
            tabindex: '0', role: 'button', 'aria-label': f.nombre
        });
        g.appendChild(crear('title', {}, f.nombre + '. ' + f.resumen));
        g.appendChild(crear('circle', { cx: x, cy: y, r: 23, class: 'cf-nodo-circulo' }));
        g.appendChild(crear('text', { x: x, y: y + 5, class: 'cf-nodo-numero', 'text-anchor': 'middle' }, String(i + 1)));
        svg.appendChild(g);
    });

    // Centro: el periodo al que pertenece la fase activa
    svg.appendChild(crear('circle', { cx: cx, cy: cy, r: 58, class: 'cf-anillo-centro', id: px + 'centro' }));
    svg.appendChild(crear('text', { x: cx, y: cy - 4, class: 'cf-centro-periodo', 'text-anchor': 'middle', id: px + 'centro-periodo' }, ''));
    svg.appendChild(crear('text', { x: cx, y: cy + 15, class: 'cf-centro-duracion', 'text-anchor': 'middle', id: px + 'centro-duracion' }, ''));

    return svg;
}

// --- ESTADO ---

const estados = new WeakMap();
function leer(raiz) {
    if (!estados.has(raiz)) estados.set(raiz, { i: 0, animando: false, temporizador: null });
    return estados.get(raiz);
}

function mostrar(raiz, indice) {
    const C = OVA.CicloCardiaco;
    const px = raiz.dataset.cfPrefijo;
    const fase = C.FASES[indice];
    // Se consulta a mitad de fase: en el borde exacto, el instante pertenece
    // ya a la siguiente y las válvulas se mostrarían cambiadas.
    const t = fase.desde + (fase.hasta - fase.desde) / 2;
    const valvulas = C.estadoValvulas(t);
    const escena = ESCENA[fase.id];

    leer(raiz).i = indice;

    // Anillo
    raiz.querySelectorAll('.cf-nodo').forEach(function (n) {
        n.classList.toggle('activo', n.dataset.fase === fase.id);
    });
    raiz.querySelector('#' + px + 'centro').setAttribute('class', 'cf-anillo-centro cf-anillo-centro--' + fase.periodo);
    raiz.querySelector('#' + px + 'centro-periodo').textContent =
        fase.periodo === 'sistole' ? 'Sístole' : 'Diástole';
    raiz.querySelector('#' + px + 'centro-duracion').textContent =
        ((fase.hasta - fase.desde) * 1000).toFixed(0) + ' ms';

    // Corazón: cámaras
    const corazon = raiz.querySelector('.cf-corazon');
    corazon.querySelectorAll('.cf-auricula').forEach(function (c) {
        c.setAttribute('class', 'cf-camara cf-auricula cf-camara--' + escena.auriculas);
    });
    corazon.querySelectorAll('.cf-ventriculo').forEach(function (c) {
        c.setAttribute('class', 'cf-camara cf-ventriculo cf-camara--' + escena.ventriculos);
    });

    // Corazón: válvulas
    corazon.querySelectorAll('.cf-valvula').forEach(function (v) {
        v.classList.toggle('abierta', !!valvulas[v.dataset.valvula]);
    });

    // Corazón: flujo
    corazon.querySelectorAll('.cf-flujo').forEach(function (f) {
        f.classList.toggle('visible', escena.flujo.indexOf(f.dataset.flujo) !== -1);
    });

    // Panel
    const p = raiz.querySelector('.cf-panel');
    p.querySelector('[data-campo="numero"]').textContent = 'Fase ' + (indice + 1) + ' de ' + C.FASES.length;
    p.querySelector('[data-campo="nombre"]').textContent = fase.nombre;
    p.querySelector('[data-campo="periodo"]').textContent =
        fase.periodo === 'sistole' ? 'Sístole ventricular' : 'Diástole ventricular';
    p.querySelector('[data-campo="periodo"]').dataset.periodo = fase.periodo;
    p.querySelector('[data-campo="resumen"]').textContent = escena.nota;
    p.querySelector('[data-campo="detalle"]').textContent = fase.detalle;
    p.querySelector('[data-campo="ecg"]').textContent = fase.ecg;

    p.querySelector('[data-campo="presion"]').textContent =
        Math.round(C.valorEn('presionVI', t)) + ' mmHg';
    p.querySelector('[data-campo="volumen"]').textContent =
        Math.round(C.valorEn('volumen', t)) + ' mL';
    const cambio = p.querySelector('[data-campo="cambio"]');
    const dV = C.valorEn('volumen', fase.hasta) - C.valorEn('volumen', fase.desde);
    cambio.textContent = Math.abs(dV) < 0.5
        ? 'El volumen no cambia'
        : (dV > 0 ? 'El volumen sube ' : 'El volumen baja ') + Math.abs(Math.round(dV)) + ' mL';
    cambio.dataset.tipo = Math.abs(dV) < 0.5 ? 'constante' : (dV > 0 ? 'sube' : 'baja');

    p.querySelectorAll('[data-valvula-ficha]').forEach(function (el) {
        const abierta = valvulas[el.dataset.valvulaFicha];
        el.dataset.estado = abierta ? 'abierta' : 'cerrada';
        el.querySelector('.cf-ve').textContent = abierta ? 'Abierta' : 'Cerrada';
    });

    const evento = p.querySelector('[data-campo="evento"]');
    evento.textContent = fase.evento || '';
    evento.hidden = !fase.evento;
}

function avanzar(raiz, paso) {
    const C = OVA.CicloCardiaco;
    const st = leer(raiz);
    mostrar(raiz, (st.i + paso + C.FASES.length) % C.FASES.length);
}

// El recorrido automático usa setInterval y no requestAnimationFrame: aquí no
// se anima un trazo continuo, se pasa de una fase a la siguiente. El ritmo lo
// marca la duración real de cada fase, escalada para que dé tiempo a leer.
function reproducir(raiz) {
    const C = OVA.CicloCardiaco;
    const st = leer(raiz);
    if (st.animando) return;
    st.animando = true;
    raiz.querySelector('[data-accion="reproducir"]').textContent = 'Pausar';

    const siguiente = function () {
        if (!raiz.isConnected) { pausar(raiz); return; }   // el módulo se reemplaza con innerHTML
        avanzar(raiz, 1);
        const f = C.FASES[leer(raiz).i];
        // Cada fase se muestra en proporción a su duración real, con un
        // mínimo para que las isovolumétricas —de 50 y 80 ms— no pasen
        // desapercibidas.
        const ms = Math.max(1600, (f.hasta - f.desde) * 9000);
        st.temporizador = setTimeout(siguiente, ms);
    };
    const f = C.FASES[st.i];
    st.temporizador = setTimeout(siguiente, Math.max(1600, (f.hasta - f.desde) * 9000));
}

function pausar(raiz) {
    const st = leer(raiz);
    st.animando = false;
    if (st.temporizador) clearTimeout(st.temporizador);
    const b = raiz.querySelector('[data-accion="reproducir"]');
    if (b) b.textContent = 'Recorrer el ciclo';
}

// --- MONTAJE ---

function plantilla() {
    const C = OVA.CicloCardiaco;
    const fichas = ['mitral', 'aortica', 'tricuspide', 'pulmonar'].map(function (k) {
        return '<li class="cf-valvula-ficha" data-valvula-ficha="' + k + '">'
             + '<span class="cf-vn">' + C.VALVULAS[k].nombre + '</span>'
             + '<span class="cf-ve">Cerrada</span></li>';
    }).join('');

    return ''
      + '<div class="cf-cuerpo">'
      + '  <div class="cf-escena">'
      + '    <div class="cf-corazon-caja"></div>'
      + '    <div class="cf-anillo-caja"></div>'
      + '  </div>'
      + '  <aside class="cf-panel">'
      + '    <p class="cf-panel-cabecera">'
      + '      <span data-campo="numero"></span>'
      + '      <span class="cf-panel-periodo" data-campo="periodo" data-periodo="diastole"></span>'
      + '    </p>'
      + '    <h5 class="cf-panel-nombre" data-campo="nombre"></h5>'
      + '    <p class="cf-panel-resumen" data-campo="resumen"></p>'
      + '    <p class="cf-panel-evento" data-campo="evento" hidden></p>'
      + '    <dl class="cf-cifras">'
      + '      <div><dt>Presión ventricular</dt><dd data-campo="presion"></dd></div>'
      + '      <div><dt>Volumen ventricular</dt><dd data-campo="volumen"></dd></div>'
      + '    </dl>'
      + '    <p class="cf-cambio" data-campo="cambio" data-tipo="constante"></p>'
      + '    <ul class="cf-valvulas">' + fichas + '</ul>'
      + '    <p class="cf-panel-ecg"><strong>En el ECG:</strong> <span data-campo="ecg"></span></p>'
      + '    <p class="cf-panel-detalle" data-campo="detalle"></p>'
      + '  </aside>'
      + '</div>'
      + '<div class="cf-controles">'
      + '  <button type="button" class="btn-accion" data-accion="anterior">← Fase anterior</button>'
      + '  <button type="button" class="btn-accion" data-accion="reproducir">Recorrer el ciclo</button>'
      + '  <button type="button" class="btn-accion" data-accion="siguiente">Fase siguiente →</button>'
      + '</div>';
}

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    if (!OVA.CicloCardiaco) return;
    raiz.dataset.listo = 'true';
    const px = 'cf' + (++instancias) + '-';
    raiz.dataset.cfPrefijo = px;

    raiz.innerHTML = plantilla();
    raiz.querySelector('.cf-corazon-caja').appendChild(construirCorazon(px));
    raiz.querySelector('.cf-anillo-caja').appendChild(construirAnillo(px));

    raiz.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (btn) {
            const a = btn.dataset.accion;
            if (a === 'anterior')  { pausar(raiz); avanzar(raiz, -1); }
            if (a === 'siguiente') { pausar(raiz); avanzar(raiz, 1); }
            if (a === 'reproducir') { leer(raiz).animando ? pausar(raiz) : reproducir(raiz); }
            return;
        }
        const nodo = e.target.closest('.cf-nodo');
        if (nodo) {
            pausar(raiz);
            mostrar(raiz, OVA.CicloCardiaco.FASES.findIndex(function (f) { return f.id === nodo.dataset.fase; }));
        }
    });

    // Teclado: Enter o espacio sobre un nodo del anillo, y flechas para
    // recorrer las fases sin salir del componente.
    raiz.addEventListener('keydown', function (e) {
        const nodo = e.target.closest && e.target.closest('.cf-nodo');
        if (nodo && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            pausar(raiz);
            mostrar(raiz, OVA.CicloCardiaco.FASES.findIndex(function (f) { return f.id === nodo.dataset.fase; }));
        } else if (nodo && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
            e.preventDefault();
            pausar(raiz);
            avanzar(raiz, e.key === 'ArrowRight' ? 1 : -1);
            const activo = raiz.querySelector('.cf-nodo.activo');
            if (activo) activo.focus();
        }
    });

    mostrar(raiz, 0);
}

const observador = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('cf-ciclo')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.cf-ciclo')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.CicloFases.montar = montar;

})(window.OVA = window.OVA || {});

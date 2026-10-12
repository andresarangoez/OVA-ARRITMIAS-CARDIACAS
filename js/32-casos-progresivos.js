(function (OVA) {
    OVA.CasosProgresivos = OVA.CasosProgresivos || {};

// --- CASOS PROGRESIVOS CON EL ALGORITMO DIAGNÓSTICO (Módulo 03, Unidad 7) ---
//
// El objetivo de la Unidad 7 es «aplicar un algoritmo diagnóstico que ordene
// la clasificación de las arritmias según la frecuencia cardíaca y la anchura
// del complejo QRS». Aquí el estudiante hace justo eso sobre casos reales, en
// tres tramos:
//
//   1. Recorre el algoritmo: frecuencia → anchura del QRS → regularidad →
//      actividad auricular. Cada decisión estrecha el grupo de ritmos
//      posibles, y se ve cómo se estrecha.
//   2. Nombra el ritmo entre los candidatos que quedan.
//   3. Justifica: elige el hallazgo que sostiene el diagnóstico.
//
// Ese tercer paso es el que pide el encargo —«justificar sus decisiones»— y
// es también el que distingue acertar de adivinar: se puede dar con el nombre
// correcto por eliminación y seguir sin saber en qué te apoyas.
//
// Es la continuación del recurso del Módulo 02 (js/31-lectura-sistematica.js),
// donde se describe el trazado sin nombrarlo. Aquí se nombra y se defiende.
//
// Las tiras las dibuja OVA.TiraECG con el motor matemático del OVA.

// Los ritmos que el algoritmo puede devolver, con los rasgos por los que se
// clasifican. Las claves son las de RITMOS_DB (js/01-data-ritmos.js).
const RITMOS = {
    sinusal:       { nombre: 'Ritmo sinusal',                         fc: 'normal', qrs: 'estrecho', reg: 'regular',   p: 'normal' },
    bradi_sinusal: { nombre: 'Bradicardia sinusal',                   fc: 'lenta',  qrs: 'estrecho', reg: 'regular',   p: 'normal' },
    bav1:          { nombre: 'Bloqueo AV de primer grado',            fc: 'normal', qrs: 'estrecho', reg: 'regular',   p: 'normal' },
    bav2_1:        { nombre: 'Bloqueo AV de segundo grado, Mobitz I', fc: 'lenta',  qrs: 'estrecho', reg: 'irregular', p: 'normal' },
    bav2_2:        { nombre: 'Bloqueo AV de segundo grado, Mobitz II',fc: 'lenta',  qrs: 'estrecho', reg: 'irregular', p: 'normal' },
    bav3:          { nombre: 'Bloqueo AV de tercer grado',            fc: 'lenta',  qrs: 'estrecho', reg: 'regular',   p: 'disociada' },
    taqui_sinusal: { nombre: 'Taquicardia sinusal',                   fc: 'rapida', qrs: 'estrecho', reg: 'regular',   p: 'normal' },
    flutter:       { nombre: 'Flutter auricular',                     fc: 'rapida', qrs: 'estrecho', reg: 'regular',   p: 'sierra' },
    fa:            { nombre: 'Fibrilación auricular',                 fc: 'rapida', qrs: 'estrecho', reg: 'irregular', p: 'ausente' },
    tv_mono:       { nombre: 'Taquicardia ventricular monomórfica',   fc: 'rapida', qrs: 'ancho',    reg: 'regular',   p: 'ausente' },
    tv_poli:       { nombre: 'Taquicardia ventricular polimórfica',   fc: 'rapida', qrs: 'ancho',    reg: 'irregular', p: 'ausente' },
    torsades:      { nombre: 'Torsión de puntas',                     fc: 'rapida', qrs: 'ancho',    reg: 'irregular', p: 'ausente' },
    fv:            { nombre: 'Fibrilación ventricular',               fc: 'rapida', qrs: 'ancho',    reg: 'irregular', p: 'ausente' },
    asistolia:     { nombre: 'Asistolia',                             fc: 'lenta',  qrs: 'ausente',  reg: 'regular',   p: 'ausente' },
    ev:            { nombre: 'Extrasístoles ventriculares',           fc: 'normal', qrs: 'mezcla',   reg: 'irregular', p: 'normal' },
    eap:           { nombre: 'Extrasístoles auriculares',             fc: 'normal', qrs: 'estrecho', reg: 'irregular', p: 'normal' }
};

// Los cuatro pasos del algoritmo, en el orden que marca la Unidad 7.
const PASOS = [
    {
        id: 'fc', titulo: 'Frecuencia cardíaca',
        pregunta: '¿A qué frecuencia va el trazado?',
        opciones: [
            { id: 'lenta',  texto: 'Menos de 60 lpm' },
            { id: 'normal', texto: 'Entre 60 y 100 lpm' },
            { id: 'rapida', texto: 'Más de 100 lpm' }
        ]
    },
    {
        id: 'qrs', titulo: 'Anchura del QRS',
        pregunta: '¿Cómo son los complejos?',
        opciones: [
            { id: 'estrecho', texto: 'Estrechos: menos de 0,12 s' },
            { id: 'ancho',    texto: 'Anchos: 0,12 s o más' },
            { id: 'mezcla',   texto: 'Estrechos, con algún complejo ancho aislado' },
            { id: 'ausente',  texto: 'No hay complejos' }
        ]
    },
    {
        id: 'reg', titulo: 'Regularidad',
        pregunta: '¿Los intervalos R-R son constantes?',
        opciones: [
            { id: 'regular',   texto: 'Regulares' },
            { id: 'irregular', texto: 'Irregulares' }
        ]
    },
    {
        id: 'p', titulo: 'Actividad auricular',
        pregunta: '¿Qué ocurre con las ondas P?',
        opciones: [
            { id: 'normal',    texto: 'Una P igual antes de cada QRS' },
            { id: 'disociada', texto: 'Hay P, pero sin relación con el QRS' },
            { id: 'ausente',   texto: 'No se identifican ondas P' },
            { id: 'sierra',    texto: 'Actividad continua en dientes de sierra' }
        ]
    }
];

const CASOS = [
    {
        nivel: 1, ritmo: 'bradi_sinusal',
        titulo: 'Mareo al incorporarse',
        historia: 'Mujer de 67 años que consulta por mareo al ponerse de pie. Está consciente, orientada, con la piel templada. Toma un betabloqueador desde hace un mes.',
        constantes: 'PA 100/62 · SpO₂ 97 % · FR 16',
        justificaciones: [
            { id: 'a', texto: 'Cada QRS va precedido de una onda P igual, y el PR es constante: el impulso nace en el nodo sinusal y se conduce con normalidad; lo único alterado es la frecuencia.', correcta: true },
            { id: 'b', texto: 'No hay ondas P identificables y los R-R son irregulares.', correcta: false },
            { id: 'c', texto: 'Los complejos son anchos, lo que indica un origen ventricular.', correcta: false }
        ],
        cierre: 'Antes de tratar la frecuencia conviene revisar la causa: el betabloqueador es un desencadenante reversible de los que la Unidad 4 del Módulo 02 agrupa como factores farmacológicos.'
    },
    {
        nivel: 1, ritmo: 'taqui_sinusal',
        titulo: 'Taquicardia con fiebre',
        historia: 'Hombre de 42 años con fiebre de 39 °C y tos desde hace tres días. Está alerta, bien perfundido, y refiere notar el corazón acelerado.',
        constantes: 'PA 118/70 · SpO₂ 95 % · FR 22 · T 39 °C',
        justificaciones: [
            { id: 'a', texto: 'Los complejos son estrechos, el ritmo es regular y cada QRS mantiene su onda P delante: es el ritmo normal, acelerado. El origen sigue siendo el nodo sinusal.', correcta: true },
            { id: 'b', texto: 'La actividad auricular aparece como dientes de sierra continuos.', correcta: false },
            { id: 'c', texto: 'Los intervalos R-R varían sin patrón, lo que indica una conducción auriculoventricular caótica.', correcta: false }
        ],
        cierre: 'La taquicardia aquí es una respuesta, no la enfermedad. El Módulo 05 insiste en ello: el tratamiento eléctrico de una taquicardia de complejo estrecho solo se justifica cuando la taquicardia es la causa de la inestabilidad, y no una respuesta a otra cosa, como la fiebre.'
    },
    {
        nivel: 2, ritmo: 'fa',
        titulo: 'Palpitaciones de inicio impreciso',
        historia: 'Hombre de 76 años con palpitaciones que no sabe cuándo empezaron. Está consciente y sin dolor torácico. Antecedente de hipertensión.',
        constantes: 'PA 112/74 · SpO₂ 96 % · FR 18',
        justificaciones: [
            { id: 'a', texto: 'No se identifican ondas P y los R-R varían de un latido a otro sin seguir ningún ciclo: la activación auricular es desorganizada y solo algunos impulsos atraviesan el nodo AV.', correcta: true },
            { id: 'b', texto: 'El PR se alarga progresivamente hasta que falta un complejo.', correcta: false },
            { id: 'c', texto: 'Hay ondas P regulares que no guardan relación con los complejos.', correcta: false }
        ],
        cierre: 'Que el inicio sea impreciso no es un detalle de la historia: condiciona el riesgo de embolia y, con él, la decisión de cardiovertir, que el Módulo 05 desarrolla en la Unidad 3.'
    },
    {
        nivel: 2, ritmo: 'bav2_1',
        titulo: 'Latidos que se saltan',
        historia: 'Mujer de 58 años que nota que algunos latidos «se le saltan». Está asintomática por lo demás, con buena perfusión.',
        constantes: 'PA 124/78 · SpO₂ 98 % · FR 15',
        justificaciones: [
            { id: 'a', texto: 'Las ondas P son regulares y todas iguales, pero el PR se alarga latido a latido hasta que una P se queda sin su QRS; después el ciclo recomienza. Hay más P que complejos.', correcta: true },
            { id: 'b', texto: 'El PR es constante y largo, y ninguna onda P deja de conducirse.', correcta: false },
            { id: 'c', texto: 'Las P y los QRS van cada uno a su propio ritmo, sin ninguna relación.', correcta: false }
        ],
        cierre: 'La distinción importa: este bloqueo se localiza en el nodo AV y suele responder a la atropina, mientras que el Mobitz II es infranodal y rara vez responde — una diferencia que el Módulo 05 recoge al hablar de las precauciones de ese fármaco.'
    },
    {
        nivel: 3, ritmo: 'bav3',
        titulo: 'Bradicardia que no responde',
        historia: 'Hombre de 81 años traído por un episodio sincopal. Está pálido, con la piel fría y sudorosa, y responde con lentitud a las preguntas.',
        constantes: 'PA 72/40 · SpO₂ 92 % · FR 18',
        justificaciones: [
            { id: 'a', texto: 'Hay ondas P regulares y complejos regulares, pero cada uno a su propia frecuencia y sin relación entre sí: ninguna P manda sobre ningún QRS. Es una disociación completa.', correcta: true },
            { id: 'b', texto: 'El PR se alarga progresivamente hasta que se pierde un complejo.', correcta: false },
            { id: 'c', texto: 'No hay actividad auricular reconocible y los R-R son irregulares.', correcta: false }
        ],
        cierre: 'Fíjate en que aquí el trazado y la clínica apuntan a lo mismo: la presión, la perfusión y el estado de conciencia señalan inestabilidad. El Módulo 05 ordena la conducta en ese caso, y la atropina no es lo que cabe esperar que funcione.'
    },
    {
        nivel: 3, ritmo: 'tv_mono',
        titulo: 'Taquicardia de complejo ancho',
        historia: 'Hombre de 64 años con antecedente de infarto hace dos años. Refiere palpitaciones y opresión torácica. Está consciente y tiene pulso.',
        constantes: 'PA 96/58 · SpO₂ 94 % · FR 20',
        justificaciones: [
            { id: 'a', texto: 'Los complejos son anchos y todos de la misma forma, a frecuencia alta y con R-R constantes: la activación ventricular no usa la vía rápida normal y se repite igual en cada latido.', correcta: true },
            { id: 'b', texto: 'Los complejos son estrechos y hay una onda P antes de cada uno.', correcta: false },
            { id: 'c', texto: 'La amplitud de los complejos va creciendo y decreciendo alrededor de la línea de base.', correcta: false }
        ],
        cierre: 'Ante una taquicardia de complejo ancho, el Módulo 05 es explícito: la adenosina está contraindicada si es irregular o polimórfica, y la decisión depende antes que nada de si el paciente está estable o no.'
    },
    {
        nivel: 3, ritmo: 'ev',
        titulo: 'Extrasístoles en el monitor',
        historia: 'Mujer de 55 años ingresada por neumonía. La enfermera avisa de que el monitor muestra latidos adelantados. La paciente está asintomática.',
        constantes: 'PA 118/72 · SpO₂ 94 % · FR 19',
        justificaciones: [
            { id: 'a', texto: 'Sobre un ritmo de base con P y complejos estrechos aparecen latidos adelantados, anchos y de forma distinta, sin onda P propia delante: nacen por debajo de la unión AV.', correcta: true },
            { id: 'b', texto: 'Todos los complejos son anchos y de la misma forma.', correcta: false },
            { id: 'c', texto: 'Los latidos adelantados son estrechos y van precedidos de una P de forma distinta a las demás.', correcta: false }
        ],
        cierre: 'La opción C describe la extrasístole auricular, que es justo la distinción de la Unidad 3: lo que cambia no es que el latido se adelante, sino de dónde sale, y eso se lee en la anchura del complejo.'
    }
];

const NIVELES = { 1: 'Inicial', 2: 'Intermedio', 3: 'Avanzado' };

let instancias = 0;
const estados = new WeakMap();
function leer(raiz) {
    if (!estados.has(raiz)) estados.set(raiz, { caso: 0, etapa: 0, algoritmo: {}, ritmo: null, justif: null, resueltos: 0 });
    return estados.get(raiz);
}

function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Ritmos que siguen siendo compatibles con lo respondido hasta ahora. Es lo
// que convierte el algoritmo en algo visible: cada respuesta descarta
// candidatos, y se ve cuántos quedan.
function candidatos(resp) {
    return Object.keys(RITMOS).filter(function (k) {
        return Object.keys(resp).every(function (campo) { return RITMOS[k][campo] === resp[campo]; });
    });
}

function plantilla() {
    return ''
      + '<div class="cp-cabecera">'
      + '  <div>'
      + '    <h4 class="cp-titulo">Casos progresivos</h4>'
      + '    <p class="cp-intro">Aplica el algoritmo sobre el trazado: frecuencia, anchura del QRS, regularidad y actividad auricular. Cada respuesta descarta ritmos; al final, nombra el que queda y defiende por qué.</p>'
      + '  </div>'
      + '  <p class="cp-marcador">Casos resueltos <span data-campo="marcador">0 / ' + CASOS.length + '</span></p>'
      + '</div>'
      + '<div class="cp-caso">'
      + '  <p class="cp-caso-meta"><span class="cp-nivel" data-campo="nivel"></span><span data-campo="titulo"></span></p>'
      + '  <p class="cp-historia" data-campo="historia"></p>'
      + '  <p class="cp-constantes" data-campo="constantes"></p>'
      + '</div>'
      + '<div class="cp-tira tira-ecg" data-listo="true"></div>'
      + '<div class="cp-algoritmo" data-campo="algoritmo"></div>'
      + '<div class="cp-trabajo" data-campo="trabajo"></div>'
      + '<div class="cp-controles">'
      + '  <button type="button" class="btn-accion" data-accion="reiniciar">Reiniciar el caso</button>'
      + '  <button type="button" class="btn-accion" data-accion="siguiente" disabled>Caso siguiente →</button>'
      + '</div>';
}

function pintarCaso(raiz) {
    const st = leer(raiz);
    const caso = CASOS[st.caso];

    raiz.querySelector('[data-campo="nivel"]').textContent = NIVELES[caso.nivel];
    raiz.querySelector('[data-campo="nivel"]').dataset.nivel = caso.nivel;
    raiz.querySelector('[data-campo="titulo"]').textContent = caso.titulo;
    raiz.querySelector('[data-campo="historia"]').textContent = caso.historia;
    raiz.querySelector('[data-campo="constantes"]').textContent = caso.constantes;

    const caja = raiz.querySelector('.cp-tira');
    caja.innerHTML = '';
    const info = OVA.TiraECG.crear({
        ritmo: caso.ritmo, segundos: 6,
        etiqueta: 'Trazado del caso, 6 segundos a 25 mm/s.'
    });
    if (info) caja.appendChild(info.nodo);
    const pie = document.createElement('p');
    pie.className = 'tira-ecg-pie';
    pie.innerHTML = '<span class="tira-ecg-calibre">6 s · 25 mm/s · 10 mm/mV</span>';
    caja.appendChild(pie);
}

function pintarAlgoritmo(raiz) {
    const st = leer(raiz);
    const quedan = candidatos(st.algoritmo);
    const caja = raiz.querySelector('[data-campo="algoritmo"]');

    caja.innerHTML = PASOS.map(function (p, i) {
        const dada = st.algoritmo[p.id];
        const estado = dada ? 'hecho' : (i === st.etapa ? 'actual' : 'pendiente');
        const op = dada ? p.opciones.find(function (o) { return o.id === dada; }) : null;
        return '<div class="cp-eslabon" data-estado="' + estado + '">'
             + '<span class="cp-eslabon-t">' + esc(p.titulo) + '</span>'
             + '<span class="cp-eslabon-v">' + (op ? esc(op.texto) : '—') + '</span></div>';
    }).join('')
    + '<p class="cp-quedan"><strong>' + quedan.length + '</strong> ritmo' + (quedan.length === 1 ? '' : 's')
    + ' compatible' + (quedan.length === 1 ? '' : 's') + ' con lo respondido'
    + (Object.keys(st.algoritmo).length && quedan.length <= 5 && quedan.length > 0
        ? ': <span class="cp-lista">' + quedan.map(function (k) { return esc(RITMOS[k].nombre); }).join(' · ') + '</span>'
        : '') + '</p>';
}

function pintarTrabajo(raiz) {
    const st = leer(raiz);
    const caso = CASOS[st.caso];
    const caja = raiz.querySelector('[data-campo="trabajo"]');

    // Etapa 1: recorrer el algoritmo
    if (st.etapa < PASOS.length) {
        const p = PASOS[st.etapa];
        caja.innerHTML = '<p class="cp-pregunta"><span class="cp-etapa">Paso ' + (st.etapa + 1) + ' de 4</span> ' + esc(p.pregunta) + '</p>'
            + '<div class="cp-opciones">' + p.opciones.map(function (o) {
                return '<button type="button" class="cp-opcion" data-alg="' + o.id + '">' + esc(o.texto) + '</button>';
              }).join('') + '</div>';
        return;
    }

    // Etapa 2: nombrar el ritmo, entre los que han sobrevivido al algoritmo
    if (!st.ritmo) {
        let quedan = candidatos(st.algoritmo);
        if (quedan.indexOf(caso.ritmo) === -1) quedan = quedan.concat([caso.ritmo]);
        caja.innerHTML = '<p class="cp-pregunta"><span class="cp-etapa">Diagnóstico</span> ¿Qué ritmo es?</p>'
            + '<div class="cp-opciones">' + quedan.map(function (k) {
                return '<button type="button" class="cp-opcion" data-ritmo="' + k + '">' + esc(RITMOS[k].nombre) + '</button>';
              }).join('') + '</div>';
        return;
    }

    // Etapa 3: justificar
    if (!st.justif) {
        caja.innerHTML = '<div class="cp-veredicto" data-tipo="' + (st.ritmo === caso.ritmo ? 'acierto' : 'fallo') + '">'
            + (st.ritmo === caso.ritmo
                ? '<strong>Diagnóstico correcto:</strong> ' + esc(RITMOS[caso.ritmo].nombre) + '.'
                : '<strong>No es ' + esc(RITMOS[st.ritmo].nombre) + '.</strong> El trazado corresponde a ' + esc(RITMOS[caso.ritmo].nombre) + '.')
            + '</div>'
            + '<p class="cp-pregunta"><span class="cp-etapa">Justificación</span> ¿En qué hallazgo te apoyas?</p>'
            + '<div class="cp-opciones cp-opciones--largas">' + caso.justificaciones.map(function (j) {
                return '<button type="button" class="cp-opcion cp-opcion--larga" data-justif="' + j.id + '">' + esc(j.texto) + '</button>';
              }).join('') + '</div>';
        return;
    }

    // Resuelto
    const j = caso.justificaciones.find(function (x) { return x.id === st.justif; });
    const buena = caso.justificaciones.find(function (x) { return x.correcta; });
    caja.innerHTML = '<div class="cp-veredicto" data-tipo="' + (j.correcta ? 'acierto' : 'fallo') + '">'
        + (j.correcta
            ? '<strong>Bien justificado.</strong> ' + esc(buena.texto)
            : '<strong>Esa no es la razón.</strong> Lo que sostiene el diagnóstico es: ' + esc(buena.texto))
        + '</div>'
        + '<p class="cp-cierre">' + esc(caso.cierre) + '</p>';
    raiz.querySelector('[data-accion="siguiente"]').disabled = false;
}

function pintar(raiz) {
    pintarAlgoritmo(raiz);
    pintarTrabajo(raiz);
    const st = leer(raiz);
    raiz.querySelector('[data-campo="marcador"]').textContent = st.resueltos + ' / ' + CASOS.length;
}

function reiniciarCaso(raiz) {
    const st = leer(raiz);
    st.etapa = 0; st.algoritmo = {}; st.ritmo = null; st.justif = null;
    raiz.querySelector('[data-accion="siguiente"]').disabled = true;
    pintar(raiz);
}

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    if (!OVA.TiraECG || !OVA.MotorECG) return;
    raiz.dataset.listo = 'true';
    raiz.dataset.cpPrefijo = 'cp' + (++instancias) + '-';

    raiz.innerHTML = plantilla();
    pintarCaso(raiz);
    pintar(raiz);

    raiz.addEventListener('click', function (e) {
        const st = leer(raiz);
        const alg = e.target.closest('[data-alg]');
        if (alg) {
            st.algoritmo[PASOS[st.etapa].id] = alg.dataset.alg;
            st.etapa++;
            pintar(raiz);
            return;
        }
        const rit = e.target.closest('[data-ritmo]');
        if (rit) { st.ritmo = rit.dataset.ritmo; pintar(raiz); return; }

        const jus = e.target.closest('[data-justif]');
        if (jus) {
            st.justif = jus.dataset.justif;
            const caso = CASOS[st.caso];
            const j = caso.justificaciones.find(function (x) { return x.id === st.justif; });
            if (st.ritmo === caso.ritmo && j.correcta) st.resueltos++;
            pintar(raiz);
            return;
        }

        const btn = e.target.closest('button[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'reiniciar') reiniciarCaso(raiz);
        if (btn.dataset.accion === 'siguiente') {
            st.caso = (st.caso + 1) % CASOS.length;
            pintarCaso(raiz);
            reiniciarCaso(raiz);
            raiz.querySelector('.cp-caso').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    });
}

const observador = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('cp-casos')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.cp-casos')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.CasosProgresivos.montar = montar;
    OVA.CasosProgresivos.CASOS = CASOS;
    OVA.CasosProgresivos.RITMOS = RITMOS;

})(window.OVA = window.OVA || {});

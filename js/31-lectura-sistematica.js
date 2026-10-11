(function (OVA) {
    OVA.LecturaSistematica = OVA.LecturaSistematica || {};

// --- LECTURA SISTEMÁTICA DEL ECG (Módulo 02, Unidad 6) ---
//
// El objetivo de la Unidad 6 es literal: «Describir un trazado
// electrocardiográfico mediante un método sistemático de interpretación,
// PREVIO a la identificación del ritmo». Este recurso hace exactamente eso y
// nada más: el estudiante recorre los ocho pasos de la Tabla 2.7 sobre una
// tira real y describe lo que ve. En ningún momento se le pide el nombre del
// ritmo, y la retroalimentación nunca lo adelanta.
//
// Esa frontera es deliberada y es lo que lo distingue del recurso del Módulo
// 03 (js/32-casos-progresivos.js), donde sí se nombra el ritmo y se justifica
// la decisión. Aquí se aprende a mirar; allí, a concluir.
//
// Las tiras las dibuja OVA.TiraECG con el motor matemático del OVA, así que
// lo que el estudiante mide es un trazado de verdad y no un dibujo.

const PASOS = [
    {
        n: 1, parametro: 'Frecuencia cardíaca',
        pregunta: '¿En qué rango está la frecuencia?',
        comoSeAnaliza: 'Cuenta los complejos QRS de la tira (6 s) y multiplica por 10. En un ritmo regular también sirve dividir 300 entre el número de cuadros grandes entre dos R.',
        opciones: [
            { id: 'lenta',   texto: 'Por debajo de 60 lpm' },
            { id: 'normal',  texto: 'Entre 60 y 100 lpm' },
            { id: 'rapida',  texto: 'Por encima de 100 lpm' }
        ]
    },
    {
        n: 2, parametro: 'Ritmo y regularidad',
        pregunta: '¿Los intervalos R-R son constantes?',
        comoSeAnaliza: 'Compara la distancia entre cada par de R a lo largo de toda la tira.',
        opciones: [
            { id: 'regular',   texto: 'Regulares: la distancia R-R se mantiene' },
            { id: 'irregular', texto: 'Irregulares: la distancia R-R cambia' }
        ]
    },
    {
        n: 3, parametro: 'Onda P',
        pregunta: '¿Cómo es la actividad auricular?',
        comoSeAnaliza: '¿Hay una onda P antes de cada QRS? ¿Tienen todas la misma forma?',
        opciones: [
            { id: 'normal',    texto: 'Una P igual antes de cada QRS' },
            { id: 'disociada', texto: 'Hay ondas P, pero sin relación fija con el QRS' },
            { id: 'ausente',   texto: 'No se identifican ondas P definidas' },
            { id: 'sierra',    texto: 'Actividad auricular continua, en dientes de sierra' }
        ]
    },
    {
        n: 4, parametro: 'Intervalo PR',
        pregunta: '¿Cómo se comporta el PR?',
        comoSeAnaliza: 'Mide del inicio de la P al inicio del QRS. Lo normal son 0,12 a 0,20 s (de 3 a 5 cuadros pequeños).',
        opciones: [
            { id: 'normal',      texto: 'Constante y dentro de 0,12-0,20 s' },
            { id: 'largo',       texto: 'Constante, pero por encima de 0,20 s' },
            { id: 'progresivo',  texto: 'Se alarga latido a latido hasta que falta un QRS' },
            { id: 'variable',    texto: 'No hay PR medible: la P no manda sobre el QRS' },
            { id: 'nomedible',   texto: 'No puede medirse: no hay ondas P definidas' }
        ]
    },
    {
        n: 5, parametro: 'Complejo QRS',
        pregunta: '¿Cómo es la activación ventricular?',
        comoSeAnaliza: 'Mide la anchura del QRS. El límite son 0,12 s, es decir, 3 cuadros pequeños.',
        opciones: [
            { id: 'estrecho', texto: 'Estrecho (menos de 0,12 s) y de forma constante' },
            { id: 'ancho',    texto: 'Ancho (0,12 s o más)' },
            { id: 'mezcla',   texto: 'La mayoría estrechos, con algún complejo ancho aislado' }
        ]
    },
    {
        n: 6, parametro: 'Segmento ST',
        pregunta: '¿Dónde está el segmento ST?',
        comoSeAnaliza: 'Compara el tramo entre el final del QRS y el inicio de la T con la línea de base.',
        opciones: [
            { id: 'isoelectrico', texto: 'Sobre la línea de base' },
            { id: 'desviado',     texto: 'Desplazado respecto a la línea de base' },
            { id: 'novalorable',  texto: 'No valorable en este trazado' }
        ]
    },
    {
        n: 7, parametro: 'Onda T',
        pregunta: '¿Cómo es la onda T?',
        comoSeAnaliza: 'Observa su dirección respecto al QRS que la precede y su forma.',
        opciones: [
            { id: 'normal',      texto: 'Presente, con la misma polaridad que el QRS' },
            { id: 'novalorable', texto: 'No valorable: no se distingue del resto del trazado' }
        ]
    },
    {
        n: 8, parametro: 'Intervalo QT',
        pregunta: '¿Qué puede decirse del QT?',
        comoSeAnaliza: 'Se mide del inicio del QRS al final de la T, y se interpreta corregido según la frecuencia (QTc).',
        opciones: [
            { id: 'proporcionado', texto: 'Proporcionado a la frecuencia del trazado' },
            { id: 'novalorable',   texto: 'No valorable: no se identifica el final de la onda T' }
        ]
    }
];

// Las respuestas correctas de cada tira salen de los criterios que el Módulo
// 03 da para ese ritmo, no de una interpretación propia. La explicación de
// cada paso describe el hallazgo SIN nombrar el ritmo: nombrarlo sería
// resolver el ejercicio del módulo siguiente.
const TIRAS = [
    {
        ritmo: 'sinusal', nivel: 1,
        contexto: 'Hombre de 34 años, control preoperatorio, asintomático.',
        claves: { 1: 'normal', 2: 'regular', 3: 'normal', 4: 'normal', 5: 'estrecho',
                  6: 'isoelectrico', 7: 'normal', 8: 'proporcionado' },
        porque: {
            1: 'Se cuentan 8 complejos en los 6 segundos de la tira: 80 lpm.',
            2: 'La distancia entre cada par de R se mantiene a lo largo de toda la tira.',
            3: 'Hay una onda P de la misma forma antes de cada complejo.',
            4: 'El PR se mantiene constante y mide unos 4 cuadros pequeños, 0,16 s.',
            5: 'Los complejos miden menos de 3 cuadros pequeños: la conducción ventricular usa el sistema His-Purkinje con normalidad.',
            6: 'El tramo entre el final del QRS y la onda T coincide con la línea de base.',
            7: 'La onda T sigue a cada QRS con su misma polaridad.',
            8: 'El QT ocupa una proporción habitual del intervalo R-R para esta frecuencia.'
        }
    },
    {
        ritmo: 'bradi_sinusal', nivel: 1,
        contexto: 'Mujer de 61 años en reposo, sin síntomas en el momento del registro.',
        claves: { 1: 'lenta', 2: 'regular', 3: 'normal', 4: 'normal', 5: 'estrecho',
                  6: 'isoelectrico', 7: 'normal', 8: 'proporcionado' },
        porque: {
            1: 'Solo 4 complejos en 6 segundos: 40 lpm, por debajo del límite inferior.',
            2: 'Los R-R son iguales entre sí: la frecuencia es baja, pero el ritmo es regular.',
            3: 'Cada complejo va precedido de una onda P de la misma morfología.',
            4: 'El PR se mantiene constante dentro del rango normal.',
            5: 'Los complejos siguen siendo estrechos: el impulso baja por la vía normal.',
            6: 'El segmento ST no se desvía de la línea de base.',
            7: 'La onda T conserva su dirección respecto al QRS.',
            8: 'El QT se alarga al bajar la frecuencia, que es lo esperado; por eso se interpreta corregido.'
        }
    },
    {
        ritmo: 'bav1', nivel: 2,
        contexto: 'Hombre de 70 años, hallazgo en un ECG de rutina.',
        claves: { 1: 'normal', 2: 'regular', 3: 'normal', 4: 'largo', 5: 'estrecho',
                  6: 'isoelectrico', 7: 'normal', 8: 'proporcionado' },
        porque: {
            1: 'Se cuentan 6 complejos en la tira: 60 lpm, dentro del rango normal. La frecuencia no es lo que define este trazado.',
            2: 'Los R-R se mantienen constantes.',
            3: 'Hay una P antes de cada QRS, todas iguales: la actividad auricular es normal.',
            4: 'Aquí está el hallazgo. El PR es constante, pero supera los 5 cuadros pequeños: el impulso tarda más de lo normal en atravesar el nodo AV. Ninguna P deja de conducirse.',
            5: 'Los complejos son estrechos: el retraso está por encima de los ventrículos.',
            6: 'El ST permanece en la línea de base.',
            7: 'La onda T es normal.',
            8: 'El QT es proporcionado a la frecuencia.'
        }
    },
    {
        ritmo: 'bav2_1', nivel: 3,
        contexto: 'Mujer de 58 años con sensación de latidos que «se saltan».',
        claves: { 1: 'lenta', 2: 'irregular', 3: 'normal', 4: 'progresivo', 5: 'estrecho',
                  6: 'isoelectrico', 7: 'normal', 8: 'proporcionado' },
        porque: {
            1: 'La frecuencia ventricular queda por debajo de 60 lpm porque algunos impulsos no llegan.',
            2: 'Los R-R no son constantes: aparece una pausa cada vez que falta un complejo.',
            3: 'Las ondas P sí son regulares y todas iguales — el nodo sinusal funciona bien. Fíjate en que hay más P que QRS.',
            4: 'Este es el hallazgo que ordena todo lo demás: el PR se va alargando latido a latido hasta que una P se queda sin su QRS, y después el ciclo vuelve a empezar.',
            5: 'Los complejos que sí conducen son estrechos.',
            6: 'El ST no está desviado.',
            7: 'Las ondas T son normales.',
            8: 'El QT es proporcionado.'
        }
    },
    {
        ritmo: 'fa', nivel: 2,
        contexto: 'Hombre de 76 años con palpitaciones de inicio impreciso.',
        claves: { 1: 'rapida', 2: 'irregular', 3: 'ausente', 4: 'nomedible', 5: 'estrecho',
                  6: 'novalorable', 7: 'normal', 8: 'novalorable' },
        porque: {
            1: 'Se cuentan unos 14 complejos en 6 segundos: alrededor de 140 lpm.',
            2: 'Los R-R cambian de un latido a otro sin ningún patrón: la irregularidad no sigue ciclos.',
            3: 'No se identifican ondas P: en su lugar la línea de base tiembla de forma continua.',
            4: 'Sin ondas P definidas no hay PR que medir. No es que esté alterado: no existe.',
            5: 'Los complejos son estrechos, así que el impulso llega a los ventrículos por la vía normal.',
            6: 'La línea de base irregular impide valorar el ST con fiabilidad.',
            7: 'Las ondas T se distinguen tras cada complejo.',
            8: 'Con R-R variables, el QT cambia latido a latido y no puede darse un valor único.'
        }
    },
    {
        ritmo: 'flutter', nivel: 3,
        contexto: 'Mujer de 68 años con disnea de esfuerzo de dos semanas.',
        claves: { 1: 'rapida', 2: 'regular', 3: 'sierra', 4: 'nomedible', 5: 'estrecho',
                  6: 'novalorable', 7: 'normal', 8: 'novalorable' },
        porque: {
            1: 'La frecuencia ventricular está claramente por encima de 100 lpm.',
            2: 'Los R-R se mantienen constantes: se conduce siempre la misma proporción de ondas auriculares. Esto ya lo separa del trazado anterior, donde eran irregulares.',
            3: 'Aquí está la diferencia con el caso anterior: la actividad auricular no desaparece, se vuelve continua y regular, con el aspecto de dientes de sierra.',
            4: 'No hay una P aislada de la que partir, así que no se mide un PR.',
            5: 'Los complejos siguen siendo estrechos.',
            6: 'Las ondas auriculares se superponen al ST e impiden valorarlo.',
            7: 'Se identifican ondas T tras los complejos.',
            8: 'La actividad auricular continua impide delimitar el final de la T con seguridad.'
        }
    },
    {
        ritmo: 'tv_mono', nivel: 3,
        contexto: 'Hombre de 64 años con antecedente de infarto, consciente y con pulso.',
        claves: { 1: 'rapida', 2: 'regular', 3: 'ausente', 4: 'nomedible', 5: 'ancho',
                  6: 'novalorable', 7: 'novalorable', 8: 'novalorable' },
        porque: {
            1: 'Se cuentan unos 16 complejos en 6 segundos: alrededor de 160 lpm.',
            2: 'Pese a la frecuencia, los R-R son constantes.',
            3: 'No se identifican ondas P relacionadas con los complejos.',
            4: 'Sin P reconocibles no hay PR que medir.',
            5: 'Este es el hallazgo determinante: los complejos son anchos y todos de la misma forma. Un QRS ancho indica que la activación ventricular no usa la vía rápida normal.',
            6: 'Con complejos anchos, la repolarización se deforma y el ST no se valora de forma aislada.',
            7: 'La onda T no se distingue del complejo ensanchado.',
            8: 'Sin un final de T identificable, el QT no puede medirse.'
        }
    }
];

const NIVELES = {
    1: { rotulo: 'Inicial', pista: 'Trazados con todos los parámetros dentro de lo esperado o con una sola alteración evidente.' },
    2: { rotulo: 'Intermedio', pista: 'Aparece una alteración que obliga a fijarse en un parámetro concreto.' },
    3: { rotulo: 'Avanzado', pista: 'Varios parámetros alterados a la vez; conviene seguir el orden sin saltarse pasos.' }
};

let instancias = 0;
const estados = new WeakMap();

function leer(raiz) {
    if (!estados.has(raiz)) estados.set(raiz, { tira: 0, paso: 0, respuestas: {}, aciertos: 0, intentos: 0 });
    return estados.get(raiz);
}

function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plantilla() {
    return ''
      + '<div class="ls-cabecera">'
      + '  <div>'
      + '    <h4 class="ls-titulo">Lectura sistemática del trazado</h4>'
      + '    <p class="ls-intro">Recorre los ocho pasos de la Tabla 2.7 sobre la tira. No se trata de nombrar el ritmo —eso es el Módulo 03—, sino de <strong>describir</strong> lo que hay, en orden y sin saltarse ningún parámetro.</p>'
      + '  </div>'
      + '  <p class="ls-marcador">Aciertos <span data-campo="marcador">0 / 0</span></p>'
      + '</div>'
      + '<div class="ls-caso">'
      + '  <span class="ls-nivel" data-campo="nivel"></span>'
      + '  <span class="ls-contexto" data-campo="contexto"></span>'
      + '</div>'
      + '<div class="tira-ecg ls-tira" data-listo="true"></div>'
      + '<ol class="ls-pasos" data-campo="pasos"></ol>'
      + '<div class="ls-trabajo">'
      + '  <p class="ls-parametro"><span data-campo="numero"></span> <span data-campo="parametro"></span></p>'
      + '  <p class="ls-pregunta" data-campo="pregunta"></p>'
      + '  <p class="ls-como" data-campo="como"></p>'
      + '  <div class="ls-opciones" data-campo="opciones"></div>'
      + '  <div class="ls-respuesta" data-campo="respuesta" hidden></div>'
      + '</div>'
      + '<div class="ls-controles">'
      + '  <button type="button" class="btn-accion" data-accion="anterior">← Paso anterior</button>'
      + '  <button type="button" class="btn-accion" data-accion="siguiente">Paso siguiente →</button>'
      + '  <button type="button" class="btn-accion" data-accion="otra">Otro trazado</button>'
      + '</div>';
}

function pintarTira(raiz) {
    const st = leer(raiz);
    const tira = TIRAS[st.tira];
    const caja = raiz.querySelector('.ls-tira');
    caja.innerHTML = '';

    const lienzo = document.createElement('canvas');
    lienzo.className = 'tira-ecg-lienzo';
    lienzo.setAttribute('role', 'img');
    caja.appendChild(lienzo);
    const info = OVA.TiraECG.dibujar(lienzo, { ritmo: tira.ritmo, segundos: 6 });
    if (info) {
        lienzo.setAttribute('aria-label', 'Trazado para la lectura sistemática, 6 segundos a 25 mm/s.');
    }
    const pie = document.createElement('p');
    pie.className = 'tira-ecg-pie';
    pie.innerHTML = '<span class="tira-ecg-calibre">6 s · 25 mm/s · 10 mm/mV</span> '
                  + 'Un cuadro pequeño son 0,04 s; uno grande, 0,20 s.';
    caja.appendChild(pie);

    raiz.querySelector('[data-campo="nivel"]').textContent = NIVELES[tira.nivel].rotulo;
    raiz.querySelector('[data-campo="nivel"]').dataset.nivel = tira.nivel;
    raiz.querySelector('[data-campo="contexto"]').textContent = tira.contexto;
}

function pintarPasos(raiz) {
    const st = leer(raiz);
    const ol = raiz.querySelector('[data-campo="pasos"]');
    ol.innerHTML = PASOS.map(function (p, i) {
        const r = st.respuestas[p.n];
        const estado = r ? (r.correcta ? 'acierto' : 'fallo') : (i === st.paso ? 'actual' : 'pendiente');
        return '<li class="ls-paso" data-estado="' + estado + '" data-paso="' + i + '">'
             + '<button type="button" class="ls-paso-btn" data-ir-paso="' + i + '">'
             + '<span class="ls-paso-n">' + p.n + '</span>'
             + '<span class="ls-paso-t">' + esc(p.parametro) + '</span></button></li>';
    }).join('');
}

function pintarPaso(raiz) {
    const st = leer(raiz);
    const paso = PASOS[st.paso];
    const tira = TIRAS[st.tira];
    const dada = st.respuestas[paso.n];

    raiz.querySelector('[data-campo="numero"]').textContent = 'Paso ' + paso.n + ' de 8 ·';
    raiz.querySelector('[data-campo="parametro"]').textContent = paso.parametro;
    raiz.querySelector('[data-campo="pregunta"]').textContent = paso.pregunta;
    raiz.querySelector('[data-campo="como"]').textContent = paso.comoSeAnaliza;

    const caja = raiz.querySelector('[data-campo="opciones"]');
    caja.innerHTML = paso.opciones.map(function (o) {
        let clase = 'ls-opcion';
        if (dada) {
            if (o.id === tira.claves[paso.n]) clase += ' correcta';
            else if (o.id === dada.id) clase += ' elegida-mal';
        }
        return '<button type="button" class="' + clase + '" data-opcion="' + o.id + '"'
             + (dada ? ' disabled' : '') + '>' + esc(o.texto) + '</button>';
    }).join('');

    const resp = raiz.querySelector('[data-campo="respuesta"]');
    if (dada) {
        const buena = paso.opciones.find(function (o) { return o.id === tira.claves[paso.n]; });
        resp.hidden = false;
        resp.dataset.tipo = dada.correcta ? 'acierto' : 'fallo';
        resp.innerHTML = '<p class="ls-veredicto">' + (dada.correcta ? 'Correcto.' : 'No es lo que muestra el trazado.') + '</p>'
            + (dada.correcta ? '' : '<p class="ls-correcta"><strong>Lo que se ve:</strong> ' + esc(buena ? buena.texto : '') + '</p>')
            + '<p class="ls-porque">' + esc(tira.porque[paso.n]) + '</p>';
    } else {
        resp.hidden = true;
        resp.innerHTML = '';
    }

    raiz.querySelector('[data-campo="marcador"]').textContent = st.aciertos + ' / ' + st.intentos;
    pintarPasos(raiz);
}

function responder(raiz, id) {
    const st = leer(raiz);
    const paso = PASOS[st.paso];
    if (st.respuestas[paso.n]) return;
    const correcta = TIRAS[st.tira].claves[paso.n] === id;
    st.respuestas[paso.n] = { id: id, correcta: correcta };
    st.intentos++;
    if (correcta) st.aciertos++;
    pintarPaso(raiz);
}

function irAPaso(raiz, i) {
    const st = leer(raiz);
    st.paso = Math.max(0, Math.min(PASOS.length - 1, i));
    pintarPaso(raiz);
}

function otraTira(raiz) {
    const st = leer(raiz);
    st.tira = (st.tira + 1) % TIRAS.length;
    st.paso = 0;
    st.respuestas = {};
    pintarTira(raiz);
    pintarPaso(raiz);
    raiz.querySelector('.ls-caso').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    if (!OVA.TiraECG || !OVA.MotorECG) return;
    raiz.dataset.listo = 'true';
    raiz.dataset.lsPrefijo = 'ls' + (++instancias) + '-';

    raiz.innerHTML = plantilla();
    pintarTira(raiz);
    pintarPaso(raiz);

    raiz.addEventListener('click', function (e) {
        const op = e.target.closest('[data-opcion]');
        if (op && !op.disabled) { responder(raiz, op.dataset.opcion); return; }

        const ir = e.target.closest('[data-ir-paso]');
        if (ir) { irAPaso(raiz, Number(ir.dataset.irPaso)); return; }

        const btn = e.target.closest('button[data-accion]');
        if (!btn) return;
        if (btn.dataset.accion === 'anterior')  irAPaso(raiz, leer(raiz).paso - 1);
        if (btn.dataset.accion === 'siguiente') irAPaso(raiz, leer(raiz).paso + 1);
        if (btn.dataset.accion === 'otra')      otraTira(raiz);
    });
}

const observador = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('ls-lectura')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.ls-lectura')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.LecturaSistematica.montar = montar;
    OVA.LecturaSistematica.PASOS = PASOS;
    OVA.LecturaSistematica.TIRAS = TIRAS;

})(window.OVA = window.OVA || {});

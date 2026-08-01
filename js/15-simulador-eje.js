(function (OVA) {
    OVA.SimuladorEje = OVA.SimuladorEje || {};

// --- SIMULADOR DE EJE ELÉCTRICO CARDÍACO (Módulo 01, Unidad 5) ---
//
// El cálculo de amplitud por derivación (proyección coseno del vector del
// eje sobre cada derivación) y la clasificación en 4 categorías están
// adaptados del principio matemático de ECG Axis Trainer, David Schaack,
// 2022, licencia MIT — https://github.com/david-shrk/ecgaxistrainer.
// Ningún archivo de ese proyecto fue copiado ni modificado; esta es una
// reescritura propia dentro del namespace y arquitectura del OVA.
//
// Convención angular: 0° = derivación I (derecha), 90° = aVF (abajo),
// los grados aumentan en sentido horario — igual que el sistema hexaxial
// clínico estándar. El diagrama hexaxial ya viene con marcado estático por
// defecto en modules/modulo-01.html (ángulo inicial 45°); el trazado de las
// 6 derivaciones sí necesita JavaScript para dibujarse (ver el listener de
// "animationstart" más abajo). El resto de la interacción reacciona a los
// eventos onpointerdown/onclick declarados en el HTML — mismo patrón que el
// resto de los widgets de aprendizaje del proyecto.

const DERIVACIONES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];
const GRADOS_DERIVACION = { I: 0, II: 60, III: 120, aVR: 210, aVL: 330, aVF: 90 };

const CUADRANTES = [
    { clase: 'normal', nombre: 'Normal', desde: -30, hasta: 90 },
    { clase: 'derecha', nombre: 'Desviación derecha', desde: 90, hasta: 180 },
    { clase: 'indeterminado', nombre: 'Indeterminado', desde: 180, hasta: 270 },
    { clase: 'izquierda', nombre: 'Desviación izquierda', desde: 270, hasta: 330 }
];

let arrastreActivo = null; // { raiz } — null cuando no se está arrastrando

function gradosARad(g) {
    return g * Math.PI / 180;
}

function normalizar360(g) {
    return ((g % 360) + 360) % 360;
}

function calcularAmplitud(anguloEje, anguloDerivacion) {
    return Math.cos(gradosARad(anguloEje) - gradosARad(anguloDerivacion));
}

function clasificarEje(grado) {
    const g360 = normalizar360(grado);
    const gComparable = g360 >= 330 ? g360 - 360 : g360; // [330,360) -> [-30,0) para comparar contra el rango Normal
    return CUADRANTES.find(c => gComparable >= c.desde && gComparable < c.hasta) || CUADRANTES[0];
}

// --- TRAZADO DE LAS 6 DERIVACIONES ---
//
// Geometría de cada latido (arco P, PQ, complejo QRS con lógica de umbral
// R/S, ST, arco T) reproducida sin modificaciones a partir de drawQRS() y
// drawEcgLine() en resources/js/ecgDrawing.js del proyecto original —
// mismo origen y licencia que la nota del encabezado. Traducida de llamadas
// canvas (ctx.arc/ctx.lineTo) a comandos de un path SVG equivalente, para
// no depender de <canvas> ni de un paso de inicialización (ver más abajo).

const UMBRAL_QRS = 0.25;
const FACTOR_TRAZO = 17; // "1 cm" del ECG, en unidades del viewBox
const X_INICIO_TRAZO = 30;
const ALTO_FILA = 35;
const LATIDOS_POR_TIRA = 3;

function arcoSuperior(cx, cy, r) {
    // Asume que el trazo ya está en (cx-r, cy); dibuja el semicírculo
    // superior hasta (cx+r, cy) — equivalente a ctx.arc(cx, cy, r, PI, 0).
    return ' A ' + r.toFixed(1) + ',' + r.toFixed(1) + ' 0 0,1 ' + (cx + r).toFixed(1) + ',' + cy;
}

function segmentoLatido(x0, y, amplitud) {
    const f = FACTOR_TRAZO;
    let d = arcoSuperior(x0 + 0.25 * f, y, 0.25 * f); // onda P

    const finPQ = x0 + f;
    d += ' L ' + finPQ.toFixed(1) + ',' + y; // segmento PQ

    let p1y, p2y;
    if (amplitud >= UMBRAL_QRS) {
        p1y = y - amplitud * f * 2;
        p2y = y + amplitud * f * 0.6;
    } else if (amplitud >= 0) {
        p1y = y - UMBRAL_QRS * f * 2;
        p2y = y + Math.max(UMBRAL_QRS * 0.6, (UMBRAL_QRS - amplitud) * 2) * f;
    } else if (amplitud > -UMBRAL_QRS) {
        p1y = y - Math.max(UMBRAL_QRS * 0.6, (UMBRAL_QRS + amplitud) * 2) * f;
        p2y = y + UMBRAL_QRS * 2 * f;
    } else {
        p1y = y + amplitud * f * 0.6;
        p2y = y - amplitud * f * 2;
    }
    const p1x = x0 + f + f * 0.17;
    const p2x = x0 + f + f * 0.34;
    const p3x = x0 + f + f * 0.5;
    d += ' L ' + p1x.toFixed(1) + ',' + p1y.toFixed(1);
    d += ' L ' + p2x.toFixed(1) + ',' + p2y.toFixed(1);
    d += ' L ' + p3x.toFixed(1) + ',' + y; // fin del QRS

    const inicioST = x0 + 2.6 * f - 0.4 * f;
    d += ' L ' + inicioST.toFixed(1) + ',' + y; // segmento ST (plano)
    d += arcoSuperior(x0 + 2.6 * f, y, 0.4 * f); // onda T

    return d;
}

function construirTrazado(amplitud, y) {
    let d = 'M ' + X_INICIO_TRAZO + ',' + y;
    let x = X_INICIO_TRAZO;
    for (let i = 0; i < LATIDOS_POR_TIRA; i++) {
        d += segmentoLatido(x, y, amplitud);
        const siguiente = x + 5 * FACTOR_TRAZO;
        d += ' L ' + siguiente.toFixed(1) + ',' + y; // línea isoeléctrica hasta el próximo latido
        x = siguiente;
    }
    return d;
}

function dibujarTrazado(raiz, angulo) {
    DERIVACIONES.forEach((nombre, indice) => {
        const trazo = raiz.querySelector('.simulador-eje-trazo[data-derivacion="' + nombre + '"]');
        if (!trazo) return;
        const amplitud = calcularAmplitud(angulo, GRADOS_DERIVACION[nombre]);
        const y = ALTO_FILA / 2 + indice * ALTO_FILA;
        trazo.setAttribute('d', construirTrazado(amplitud, y));
    });
}

// El HTML de cada módulo se inyecta con innerHTML (js/03-navegacion.js) y
// los <script> inyectados así no se ejecutan — no hay ningún momento
// "el módulo ya cargó" al que engancharse para dibujar el trazado por
// primera vez. Un MutationObserver sobre #vista-modulo (ancestro estable,
// siempre presente en index.html) detecta la inserción sin importar en qué
// módulo ocurra ni qué tan anidado esté el widget — no depende de
// animaciones/compositing, a diferencia de otros trucos de "detectar
// montaje" (se probó con CSS animationstart y no disparaba de forma
// confiable). El guardado en dataset evita redibujar en cada mutación no
// relacionada que ocurra en el resto del módulo (mini-retos, autoevaluación).
const observadorMontajeEje = new MutationObserver((mutaciones) => {
    mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('simulador-eje')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.simulador-eje')) : []);
            raices.forEach((raiz) => {
                if (raiz.dataset.trazadoListo === 'true') return;
                raiz.dataset.trazadoListo = 'true';
                dibujarTrazado(raiz, parseFloat(raiz.dataset.angulo) || 45);
            });
        });
    });
});

const vistaModuloEje = document.getElementById('vista-modulo');
if (vistaModuloEje) observadorMontajeEje.observe(vistaModuloEje, { childList: true, subtree: true });

// --- DIBUJO (actualiza el vector, la lectura y el trazado) ---

function actualizarDiagrama(raiz, angulo, ocultarLectura) {
    const rad = gradosARad(angulo);
    const largo = 68;
    const vector = raiz.querySelector('.simulador-eje-vector');
    const asa = raiz.querySelector('.simulador-eje-asa');
    const x2 = (largo * Math.cos(rad)).toFixed(1);
    const y2 = (largo * Math.sin(rad)).toFixed(1);
    if (vector) { vector.setAttribute('x2', x2); vector.setAttribute('y2', y2); }
    if (asa) { asa.setAttribute('cx', x2); asa.setAttribute('cy', y2); }

    const cuadrante = clasificarEje(angulo);
    const lectura = raiz.querySelector('.simulador-eje-lectura');
    if (lectura) {
        lectura.textContent = ocultarLectura
            ? '¿Qué eje corresponde?'
            : cuadrante.nombre + ' · ' + Math.round(normalizar360(angulo)) + '°';
    }

    dibujarTrazado(raiz, angulo);

    return cuadrante;
}

// --- ARRASTRE (modo exploración) ---

function calcularAnguloDesdePuntero(svg, evento) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(evento.clientY - cy, evento.clientX - cx) * 180 / Math.PI;
}

function iniciarArrastre(evento) {
    const svg = evento.currentTarget.closest('svg');
    const raiz = svg && svg.closest('.simulador-eje');
    if (!svg || !raiz || raiz.dataset.modoPractica === 'true') return;
    evento.preventDefault();
    arrastreActivo = { raiz, svg };
    const angulo = calcularAnguloDesdePuntero(svg, evento);
    raiz.dataset.angulo = angulo;
    actualizarDiagrama(raiz, angulo, false);
}

document.addEventListener('pointermove', (evento) => {
    if (!arrastreActivo) return;
    const angulo = calcularAnguloDesdePuntero(arrastreActivo.svg, evento);
    arrastreActivo.raiz.dataset.angulo = angulo;
    actualizarDiagrama(arrastreActivo.raiz, angulo, false);
});

document.addEventListener('pointerup', () => { arrastreActivo = null; });
document.addEventListener('pointercancel', () => { arrastreActivo = null; });

// --- MODO PRÁCTICA (casos al azar + puntaje, reutiliza el mismo diagrama) ---

// Banco fijo de 16 casos (≥ 4 por cuadrante), con margen respecto a cada
// límite para que ningún caso quede ambiguo entre dos categorías.
const CASOS_PRACTICA = [
    -15, 15, 45, 75,        // normal
    105, 130, 150, 170,     // desviación derecha
    195, 215, 235, 255,     // indeterminado
    280, 295, 310, 322      // desviación izquierda
];

function anguloAleatorioValido() {
    return CASOS_PRACTICA[Math.floor(Math.random() * CASOS_PRACTICA.length)];
}

function nuevoCaso(boton) {
    const raiz = (boton ? boton.closest('.simulador-eje') : document.querySelector('.simulador-eje[data-modo-practica="true"]'));
    if (!raiz) return;
    const angulo = anguloAleatorioValido();
    raiz.dataset.angulo = angulo;
    const feedback = raiz.querySelector('.simulador-eje-feedback');
    if (feedback) { feedback.textContent = ''; feedback.className = 'simulador-eje-feedback'; }
    actualizarDiagrama(raiz, angulo, true);
}

function alternarModoPractica(boton) {
    const raiz = boton.closest('.simulador-eje');
    if (!raiz) return;
    const activo = raiz.dataset.modoPractica === 'true';
    const panel = raiz.querySelector('.simulador-eje-respuestas');

    if (activo) {
        raiz.dataset.modoPractica = 'false';
        boton.textContent = 'Practicar con casos';
        if (panel) panel.hidden = true;
        const anguloExploracion = 45;
        raiz.dataset.angulo = anguloExploracion;
        actualizarDiagrama(raiz, anguloExploracion, false);
    } else {
        raiz.dataset.modoPractica = 'true';
        boton.textContent = 'Volver a modo exploración';
        if (panel) panel.hidden = false;
        nuevoCaso(boton);
    }
}

function responder(boton, clase) {
    const raiz = boton.closest('.simulador-eje');
    if (!raiz) return;

    const angulo = parseFloat(raiz.dataset.angulo);
    const cuadrante = clasificarEje(angulo);
    const acierto = clase === cuadrante.clase;

    const aciertos = parseInt(raiz.dataset.aciertos || '0', 10) + (acierto ? 1 : 0);
    const intentos = parseInt(raiz.dataset.intentos || '0', 10) + 1;
    raiz.dataset.aciertos = aciertos;
    raiz.dataset.intentos = intentos;

    const marcador = raiz.querySelector('.simulador-eje-marcador');
    if (marcador) marcador.textContent = aciertos + '/' + intentos;

    const feedback = raiz.querySelector('.simulador-eje-feedback');
    if (feedback) {
        feedback.textContent = acierto ? 'Correcto — ' + cuadrante.nombre + '.' : 'No — el vector corresponde a ' + cuadrante.nombre + '.';
        feedback.className = 'simulador-eje-feedback ' + (acierto ? 'correcto' : 'incorrecto');
    }

    actualizarDiagrama(raiz, angulo, false);
}

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.SimuladorEje.iniciarArrastre = iniciarArrastre;
    OVA.SimuladorEje.alternarModoPractica = alternarModoPractica;
    OVA.SimuladorEje.responder = responder;
    OVA.SimuladorEje.nuevoCaso = nuevoCaso;

})(window.OVA = window.OVA || {});

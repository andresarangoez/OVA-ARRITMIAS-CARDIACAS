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
// clínico estándar. No requiere inicialización: el diagrama SVG y las
// derivaciones en miniatura ya vienen con marcado estático por defecto en
// modules/modulo-01.html (ángulo inicial 45°), y este archivo solo
// reacciona a los eventos onpointerdown/onclick declarados ahí — mismo
// patrón que el resto de los widgets de aprendizaje del proyecto.

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

// --- DIBUJO (actualiza el vector, la lectura y las 6 tiras en miniatura) ---

function puntosTira(amplitud) {
    const base = 15;
    const pico = (base - amplitud * 12).toFixed(1);
    const rebote = (base + amplitud * 4).toFixed(1);
    return `0,${base} 35,${base} 45,${pico} 55,${rebote} 65,${base} 100,${base}`;
}

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

    DERIVACIONES.forEach(nombre => {
        const tira = raiz.querySelector('.simulador-eje-tira[data-derivacion="' + nombre + '"] polyline');
        if (!tira) return;
        const amplitud = calcularAmplitud(angulo, GRADOS_DERIVACION[nombre]);
        tira.setAttribute('points', puntosTira(amplitud));
    });

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

function anguloAleatorioValido() {
    const cuadrante = CUADRANTES[Math.floor(Math.random() * CUADRANTES.length)];
    const margen = 8; // evita ángulos justo en el límite entre dos cuadrantes
    const min = cuadrante.desde + margen;
    const max = cuadrante.hasta - margen;
    return min + Math.random() * (max - min);
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

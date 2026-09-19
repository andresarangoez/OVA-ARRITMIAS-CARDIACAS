(function (OVA) {
    OVA.MotorECG = OVA.MotorECG || {};

// --- NÚCLEO MATEMÁTICO INTEGRADOR (Versión 11.0 — Generadores por Arritmia) ---
//
// ARQUITECTURA:
// El motor se divide en dos responsabilidades separadas:
//
// 1. RELOJ DEL MOTOR (dentro de la clase MotorMatematicoECG): fases, avance de
//    las secuencias de conducción AV y lógica de extrasístoles. Esto es mecánica compartida del
//    "reloj clínico", no pertenece a ninguna arritmia en particular.
//
// 2. GENERADORES POR ARRITMIA (GENERADORES_RITMO): cada arritmia tiene su propia
//    función, independiente de las demás. Añadir, corregir o reemplazar una
//    arritmia significa tocar únicamente su función — nunca las de las otras.
//    Las funciones dibujarP/dibujarQRS/dibujarT son primitivas de dibujo
//    compartidas (no "el algoritmo" de ninguna arritmia), igual que dos
//    generadores pueden compartir una misma primitiva geométrica sin dejar
//    de ser modelos independientes.

// --- DURACIONES DEL LATIDO (milisegundos reales, no fracciones del ciclo) ---
// La despolarización dura lo que dura: al subir la frecuencia cardíaca el PR y
// el QRS no se acortan de forma apreciable, lo que se acorta es la diástole.
// Por eso estas medidas van en tiempo real. Definidas como fracción del ciclo
// —como estaban antes— el mismo trazado daba un PR de 80 ms a 75 lpm y de
// 150 ms a 40 lpm: ninguno medible como en un ECG real, y a frecuencias
// normales la P quedaba pegada al QRS sin segmento PR visible.
const P_INICIO_MS = 40;
const P_DURACION_MS = 90;                                   // normal < 120 ms
const PR_INTERVALO_MS = 160;                                // inicio de P → inicio de QRS (normal 120-200 ms)
const QRS_INICIO_MS = P_INICIO_MS + PR_INTERVALO_MS;        // 200 ms

// Q + R + S = 80 ms → QRS angosto (normal < 120 ms).
const Q_DURACION_MS = 18;
const R_DURACION_MS = 34;
const S_DURACION_MS = 28;
const QRS_ANCHO_DURACION_MS = 140;                          // > 120 ms = inequívocamente ancho

const QTC_MS = 400;                                         // QT corregido normal

// --- PRIMITIVAS DE DIBUJO (compartidas entre generadores) ---
// Todas reciben `ms` = milisegundos transcurridos desde el inicio del latido.

function dibujarP(ms) {
    if (ms > P_INICIO_MS && ms < P_INICIO_MS + P_DURACION_MS) {
        return 12 * Math.sin((ms - P_INICIO_MS) * Math.PI / P_DURACION_MS);
    }
    return 0;
}

function dibujarQRS(ms, ancho = false) {
    const desde = ms - QRS_INICIO_MS;
    if (desde < 0) return 0;

    if (ancho) {
        // Complejo ancho para EV, escape ventricular o bloqueo infra-Hisiano
        if (desde < QRS_ANCHO_DURACION_MS) {
            return 35 * Math.sin(desde * Math.PI / QRS_ANCHO_DURACION_MS);
        }
        return 0;
    }

    if (desde < Q_DURACION_MS) return -15;
    if (desde < Q_DURACION_MS + R_DURACION_MS) return 80;
    if (desde < Q_DURACION_MS + R_DURACION_MS + S_DURACION_MS) return -25;
    return 0;
}

// La repolarización SÍ depende de la frecuencia: se aplica la fórmula de
// Bazett (QT = QTc · √RR) para que el QT se acorte al subir la FC, como en un
// ECG real. El tope impide que a frecuencias altas la T invada el latido
// siguiente, cosa que la cortaría en seco a mitad de onda.
function calcularQtMs(ciclo) {
    const qtBazett = QTC_MS * Math.sqrt(ciclo / 1000);
    const qtMaximo = ciclo * 0.92 - QRS_INICIO_MS;
    return Math.max(120, Math.min(qtBazett, qtMaximo));
}

function dibujarT(ms, ciclo, invertida = false) {
    const qt = calcularQtMs(ciclo);
    // La T ocupa el último 45% del QT; el tramo previo es el segmento ST.
    const inicio = QRS_INICIO_MS + qt * 0.55;
    const fin = QRS_INICIO_MS + qt;

    if (ms > inicio && ms < fin) {
        const val = 18 * Math.sin((ms - inicio) * Math.PI / (fin - inicio));
        return invertida ? -val : val;
    }
    return 0;
}

// --- GENERADORES INDEPENDIENTES POR ARRITMIA ---
// Cada función recibe el "contexto" del reloj (fase actual, tipo de latido,
// latido AV en curso) y devuelve la amplitud de la señal en ese instante.

// Ritmos organizados con lógica de extrasístoles espontáneas (sinusal,
// bradicardia sinusal, taquicardia sinusal, AESP, y las vistas dedicadas
// de extrasístole auricular/ventricular).
function generarConExtrasistoles(ctx) {
    let amplitud = 0;
    const ms = ctx.ms;
    if (ctx.tipoLatidoActual === 'EV') {
        amplitud += dibujarQRS(ms, true) + dibujarT(ms, ctx.ciclo, true); // QRS ancho y T invertida
    } else if (ctx.tipoLatidoActual === 'EAP') {
        // Foco auricular ectópico: la P nace fuera del nodo sinusal y conduce
        // por una vía más corta, así que el PR queda acortado (120 ms).
        amplitud += dibujarP(ms - 40) + dibujarQRS(ms) + dibujarT(ms, ctx.ciclo);
    } else {
        amplitud += dibujarP(ms) + dibujarQRS(ms) + dibujarT(ms, ctx.ciclo); // Normal
    }
    return amplitud;
}

// Bloqueo AV 1er grado: retraso de conducción NODAL puro — todo impulso
// auricular conduce (1:1, nunca se cae un latido), P y QRS normales, el
// único hallazgo es un PR fijo y prolongado (> 200 ms; aquí 280 ms, un valor
// inequívocamente patológico para que sea fácil de reconocer).
//
// El retraso es la diferencia entre el PR patológico buscado y el PR normal
// del modelo (PR_INTERVALO_MS): se le suma al QRS y arrastra con él a la T,
// dejando la P donde estaba. Al estar todo en milisegundos reales, el PR
// resultante es el mismo sin importar a qué FC esté configurado el ritmo en
// 01-data-ritmos.js.
function generarBav1(ctx) {
    const ms = ctx.ms;
    const PR_OBJETIVO_MS = 280;
    const retraso = PR_OBJETIVO_MS - PR_INTERVALO_MS;

    return dibujarP(ms) + dibujarQRS(ms - retraso) + dibujarT(ms - retraso, ctx.ciclo);
}

// --- BLOQUEOS AV DE 2DO GRADO: SECUENCIAS DE CONDUCCIÓN ---
//
// El nodo sinusal no se entera del bloqueo: sigue disparando a ritmo regular.
// Por eso en estos ritmos cada ciclo del reloj es un intervalo P-P, y lo único
// que cambia de un ciclo a otro es qué hace el sistema de conducción con esa
// P: dejarla pasar con cierto PR, o no dejarla pasar.
//
// Cada bloqueo se describe entonces como una secuencia con un elemento por
// onda P del grupo: un número es el PR (ms) con el que esa P conduce, y
// `null` es una P bloqueada. El reloj la recorre en bucle y el generador
// dibuja el QRS a la distancia de su P que marca ese PR: el QRS se desplaza de
// verdad en el tiempo, no se le cambia una etiqueta.

// Mobitz I (Wenckebach), conducción 5:4. Fatiga progresiva del nodo AV: cada
// P lo encuentra menos recuperado que la anterior y tarda más en cruzarlo,
// hasta que una no pasa. La pausa le da tiempo de recuperarse, y la P
// siguiente vuelve a conducir con el PR más corto del grupo.
//
// Los incrementos van DECRECIENDO (+60, +40, +30 ms), como en el Wenckebach
// típico. Es lo que hace que el R-R se acorte antes de la pausa, tal como lo
// enseña el Módulo 03: con incrementos iguales el R-R quedaría constante y el
// trazado contradiría el texto. Ningún escalón baja de 30 ms, para que el
// desplazamiento del QRS se vea latido a latido.
const SECUENCIA_WENCKEBACH = [160, 220, 260, 290, null];

// Mobitz II, conducción 3:2. Bloqueo INFRA-HISIANO: el PR es FIJO —nunca se
// alarga— y una P se queda sin QRS de forma súbita, sin aviso previo.
//
// 3:2 y no 2:1 a propósito: en un 2:1 nunca hay dos latidos conducidos
// seguidos, así que no hay forma de ver si el PR es fijo o se alarga, y el
// trazado es indistinguible de un Wenckebach 2:1. Para reconocer Mobitz II
// hacen falta al menos dos PR consecutivos iguales antes de la P bloqueada.
const SECUENCIA_MOBITZ_II = [180, 180, null];

// La pausa sale sola de la secuencia, sin programarla: el R-R que contiene la
// P bloqueada mide dos P-P menos lo que se acortó el PR. En Wenckebach eso da
// MENOS de dos P-P (el PR pasa de 290 a 160); en Mobitz II, como el PR no
// cambia, da EXACTAMENTE dos P-P. Esa diferencia también es diagnóstica.

// Wenckebach: QRS angosto — el bloqueo es nodal y el His-Purkinje está intacto.
function generarBav2Wenckebach(ctx) {
    const { ms, latido } = ctx;
    let amplitud = dibujarP(ms); // la P se dibuja SIEMPRE, conduzca o no

    if (latido.conducido) {
        const retraso = latido.prMs - PR_INTERVALO_MS;
        amplitud += dibujarQRS(ms - retraso) + dibujarT(ms - retraso, ctx.ciclo);
    }
    return amplitud;
}

// Mobitz II: QRS ANCHO con T invertida (cambios secundarios de
// repolarización). El bloqueo infra-Hisiano casi siempre coexiste con
// enfermedad del sistema de conducción distal (bloqueo de rama de base). Ese
// contraste QRS angosto (Wenckebach) vs QRS ancho (Mobitz II) es, junto con
// el PR que se alarga o no, la clave para diferenciarlos.
function generarBav2Mobitz2(ctx) {
    const { ms, latido } = ctx;
    let amplitud = dibujarP(ms); // la P se dibuja SIEMPRE, conduzca o no

    if (latido.conducido) {
        const retraso = latido.prMs - PR_INTERVALO_MS;
        amplitud += dibujarQRS(ms - retraso, true) + dibujarT(ms - retraso, ctx.ciclo, true);
    }
    return amplitud;
}

// Bloqueo AV 3er grado (completo): disociación AV total. Este es el modelo
// que MENOS necesitaba cambios — ya estaba correctamente diseñado con dos
// relojes verdaderamente independientes:
//   - Auricular (ctx.t_aur): nodo sinusal a 800ms/75lpm, propio marcapasos.
//   - Ventricular (ctx.t): escape de origen bajo (His-Purkinje/miocardio
//     ventricular) a la FC propia del ritmo (30 lpm en 01-data-ritmos.js),
//     QRS ancho — coherente: un escape lento y ancho indica un marcapasos
//     de rescate bajo, no de la unión AV (que sería más rápido y angosto).
// Al no compartir el mismo reloj, la relación P-QRS queda genuinamente
// aleatoria (las P "caminan" a través del ciclo, a veces caen dentro del
// QRS o la T) — exactamente el hallazgo diagnóstico de la disociación AV,
// que no se puede lograr sincronizando ambas ondas al mismo reloj.
function generarBav3(ctx) {
    let amplitud = 0;
    amplitud += dibujarP(ctx.ms_aur);
    amplitud += dibujarQRS(ctx.ms, true) + dibujarT(ctx.ms, ctx.ciclo, true);
    return amplitud;
}

// Flutter auricular: ondas en "dientes de sierra" a su propio reloj auricular,
// conectadas a un QRS de conducción regular.
function generarFlutter(ctx) {
    let amplitud = 0;
    amplitud += 8 * Math.sin(ctx.t_aur * Math.PI * 2);
    amplitud += dibujarQRS(ctx.ms) + dibujarT(ctx.ms, ctx.ciclo);
    return amplitud;
}

// Fibrilación Auricular: línea de base irregular ("fibrilatoria") sin onda P,
// con QRS estrecho de conducción irregular.
function generarFA(ctx) {
    // Donde iría la P hay ondas f a ~430/min (período de 138 ms), no una P.
    let amplitud = 4 * Math.sin(ctx.ms / 22) + 3 * Math.random();
    amplitud += dibujarQRS(ctx.ms) + dibujarT(ctx.ms, ctx.ciclo);
    return amplitud;
}

// Taquicardia Ventricular Monomórfica.
function generarTVMonomorfica(ctx) {
    return 60 * Math.sin(ctx.t * Math.PI * 2);
}

// Fibrilación Ventricular: caos eléctrico total, sin complejos organizados
// ni ciclo cardíaco reconocible. Se genera con osciladores de alta frecuencia
// independientes del reloj de latido (ctx.t no se usa) más ruido aleatorio,
// para que nunca se repita un patrón.
function generarFV() {
    const caos = Math.sin(performance.now() / 47) * 25
               + Math.sin(performance.now() / 91) * 18
               + Math.sin(performance.now() / 23) * 12;
    return caos + 15 * (Math.random() - 0.5);
}

// Asistolia: ausencia total de actividad eléctrica organizada. Se registra
// explícitamente (en vez de dejarla sin generador) para que quede claro que
// la línea isoeléctrica es una decisión deliberada, no un hueco sin implementar.
function generarAsistolia() {
    return 0;
}

// Taquicardia Ventricular Polimórfica: caótica e irregular, sin patrón
// repetitivo — osciladores rápidos y asimétricos más ruido.
function generarTVPolimorfica(ctx) {
    let variacionCaotica = 40 + 15 * Math.sin(performance.now() / 113) + 20 * Math.cos(performance.now() / 239);
    return variacionCaotica * Math.sin(ctx.t * Math.PI * 2) + 8 * (Math.random() - 0.5);
}

// Torsades de Pointes: patrón cíclico organizado ("huso") — envolvente lenta
// que crece y decrece limpiamente (torsión de eje).
function generarTorsades(ctx) {
    let huso = 15 + 40 * Math.sin(performance.now() / 700);
    return huso * Math.sin(ctx.t * Math.PI * 2);
}

// --- REGISTRO: qué generador le corresponde a cada arritmia ---
// Para añadir una arritmia nueva: escribir su función arriba y agregar
// una línea aquí. Nunca hay que tocar las demás entradas.
const GENERADORES_RITMO = {
    sinusal: generarConExtrasistoles,
    bradi_sinusal: generarConExtrasistoles,
    taqui_sinusal: generarConExtrasistoles,
    aesp: generarConExtrasistoles,
    eap: generarConExtrasistoles,
    ev: generarConExtrasistoles,

    bav1: generarBav1,
    bav2_1: generarBav2Wenckebach,
    bav2_2: generarBav2Mobitz2,
    bav3: generarBav3,
    flutter: generarFlutter,

    fa: generarFA,
    tv_mono: generarTVMonomorfica,
    tv_poli: generarTVPolimorfica,
    torsades: generarTorsades,

    fv: generarFV,
    asistolia: generarAsistolia,
};

// Ritmos cuyo reloj marca las P y no los QRS, con su secuencia de conducción.
const SECUENCIAS_CONDUCCION_AV = {
    bav2_1: SECUENCIA_WENCKEBACH,
    bav2_2: SECUENCIA_MOBITZ_II,
};

// Largo del ciclo P-P. La FC del monitor cuenta QRS, y en un bloqueo de 2do
// grado hay más P que QRS: la frecuencia auricular es la ventricular por la
// proporción P/QRS de la secuencia. Antes el reloj tomaba la FC ventricular
// como si fuera la auricular, y las P salían a 45 y 35 lpm — una bradicardia
// sinusal que no existe, con las P tan separadas que el patrón no se leía.
function calcularCicloAuricularAV(secuencia, fc) {
    const conducidas = secuencia.filter(pr => pr !== null).length;
    return (60000 / fc) * conducidas / secuencia.length;
}

// El evento del latido en curso: cuándo aparece la P, si conduce, con qué PR
// y cuándo aparece su QRS. Los generadores dibujan a partir de él sin volver
// a decidir nada sobre la conducción. Tiempos en ms desde el inicio del ciclo.
function describirLatidoAV(secuencia, indice, cicloMs) {
    const posicion = indice % secuencia.length;
    const prMs = secuencia[posicion];
    const conducido = prMs !== null;
    return {
        posicionEnGrupo: posicion + 1,
        cicloMs,                                             // intervalo P-P
        eventoAuricularMs: P_INICIO_MS,                      // inicio de la P
        conducido,
        prMs: conducido ? prMs : null,
        eventoVentricularMs: conducido ? P_INICIO_MS + prMs : null, // inicio del QRS
    };
}

class MotorMatematicoECG {
    constructor() {
        // Relojes (El cerebro clínico)
        this.fase = 0; // Fase global/ventricular (0 a 1)
        this.faseAuricular = 0; // Reloj independiente para aurículas (Disociación/Flutter)
        this.indiceConduccion = 0; // Posición de la P actual dentro de su secuencia de conducción AV
        this.latidoActual = null;  // Evento del latido en curso (solo bloqueos de 2do grado)

        // Lógica de extrasístoles
        this.contadorLatido = 0; // Para intercalar la extrasístole cada 4 latidos
        this.tipoLatidoActual = 'NORMAL';
        this.pausaCompensatoria = false;
    }

    // Reinicia el estado interno del motor (relojes, contadores y lógica de
    // extrasístoles/pausas). Debe invocarse SIEMPRE que el usuario cambie de
    // ritmo clínico, para que el ritmo nuevo no "herede" el estado del anterior
    // (ej. una pausa compensatoria arrastrada desde una extrasístole ventricular).
    reiniciar() {
        this.fase = 0;
        this.faseAuricular = 0;
        this.indiceConduccion = 0;
        this.latidoActual = null;
        this.contadorLatido = 0;
        this.tipoLatidoActual = 'NORMAL';
        this.pausaCompensatoria = false;
    }

    obtenerVoltaje(deltaTime, ritmo, fc) {
        if (fc === 0 && !['fv', 'asistolia', 'aesp'].includes(ritmo)) return 0;

        const cicloBase = fc > 0 ? 60000 / fc : 1000;
        let cicloActual = cicloBase;

        // 1. Aplicamos modificadores de ciclo si es una extrasístole o pausa
        if (this.tipoLatidoActual === 'EAP') cicloActual = cicloBase * 0.70;
        if (this.tipoLatidoActual === 'EV') cicloActual = cicloBase * 0.60;
        if (this.pausaCompensatoria) cicloActual = cicloBase * 1.40;

        // En los bloqueos de 2do grado el ciclo es el P-P, no el R-R.
        const secuenciaAV = SECUENCIAS_CONDUCCION_AV[ritmo];
        if (secuenciaAV) cicloActual = calcularCicloAuricularAV(secuenciaAV, fc);

        // 2. Avanzamos los relojes
        this.fase += deltaTime / cicloActual;

        // El reloj auricular va a su propio ritmo en BAV3 o Flutter
        const cicloAuricular = (ritmo === 'bav3') ? 800 : (ritmo === 'flutter' ? 200 : cicloActual);
        this.faseAuricular += deltaTime / cicloAuricular;

        // 3. Reseteo y cálculo del PRÓXIMO ciclo (El "Marcapasos")
        if (this.fase > 1) {
            this.fase -= 1; // Reinicio limpio

            // Gestión de pausas (Se ejecuta al terminar el latido anterior)
            if (this.tipoLatidoActual === 'EV') this.pausaCompensatoria = true;
            else if (this.tipoLatidoActual === 'EAP') this.pausaCompensatoria = false;
            else if (this.pausaCompensatoria) this.pausaCompensatoria = false;

            // Extrasístoles: SOLO en las dos vistas dedicadas a ellas.
            //
            // El ritmo sinusal y la bradicardia sinusal deben verse
            // perfectamente regulares: son la referencia contra la cual el
            // estudiante compara todo lo demás. Antes recibían un 8% de
            // latidos ventriculares y un 8% de auriculares al azar, así que
            // el "ritmo normal" aparecía irregular y con complejos anchos
            // intercalados — imposible aprender la alteración si la
            // referencia ya está alterada.
            //
            // Y una extrasístole es, por definición, un latido aislado sobre
            // un ritmo de base normal: se intercala 1 cada 4, no en todos
            // (antes, en las vistas 'ev'/'eap', TODOS los latidos eran
            // ectópicos, que es otra arritmia distinta).
            if (ritmo === 'ev' || ritmo === 'eap') {
                this.contadorLatido++;
                const tocaEctopico = this.contadorLatido % 4 === 0 && !this.pausaCompensatoria;
                this.tipoLatidoActual = tocaEctopico ? (ritmo === 'ev' ? 'EV' : 'EAP') : 'NORMAL';
            } else {
                this.tipoLatidoActual = 'NORMAL';
            }

            // Bloqueos de 2do grado: pasa a la P siguiente de la secuencia.
            if (secuenciaAV) this.indiceConduccion = (this.indiceConduccion + 1) % secuenciaAV.length;
        }

        if (this.faseAuricular > 1) this.faseAuricular -= 1;

        this.latidoActual = secuenciaAV
            ? describirLatidoAV(secuenciaAV, this.indiceConduccion, cicloActual)
            : null;

        // 4. Delegamos el cálculo de amplitud al generador propio de este ritmo.
        //    Si el ritmo no tiene generador registrado todavía, se comporta
        //    igual que antes del refactor: amplitud 0 (línea plana).
        const contexto = {
            // Fases normalizadas (0 a 1). Las siguen usando los ritmos cuyo
            // trazado es una oscilación continua sin latidos discretos (TV,
            // Torsades, dientes de sierra del flutter).
            t: this.fase,
            t_aur: this.faseAuricular,

            // Tiempo real transcurrido dentro del latido, en milisegundos: es
            // lo que usan las primitivas P/QRS/T para que el PR y el QRS midan
            // siempre lo mismo, independientemente de la frecuencia cardíaca.
            ms: this.fase * cicloActual,
            ms_aur: this.faseAuricular * cicloAuricular,

            ciclo: cicloActual, // largo real del ciclo (ms), necesario para el QT de Bazett

            tipoLatidoActual: this.tipoLatidoActual,
            latido: this.latidoActual,
        };

        const generador = GENERADORES_RITMO[ritmo];
        return generador ? generador(contexto) : 0;
    }
}

    // --- API PÚBLICA DEL NAMESPACE ---
    // Las primitivas de dibujo y los generadores por arritmia quedan privados
    // dentro de este archivo; solo se expone la clase que orquesta el reloj.
    OVA.MotorECG.MotorMatematicoECG = MotorMatematicoECG;

    // --- Alias bajo el Motor Clínico (Etapa 2.1) — ver 00-motor-clinico.js ---
    MotorClinico.ECG = MotorMatematicoECG;

})(window.OVA = window.OVA || {});

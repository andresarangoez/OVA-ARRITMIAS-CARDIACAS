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

// Q + R + S = 80 ms → QRS angosto (normal < 120 ms). El reparto entre las tres
// ondas está en QRS_ANGOSTO, más abajo.
const QRS_ANCHO_DURACION_MS = 140;                          // > 120 ms = inequívocamente ancho

const QTC_MS = 400;                                         // QT corregido normal

// --- PRIMITIVAS DE DIBUJO (compartidas entre generadores) ---
// Todas reciben `ms` = milisegundos transcurridos desde el inicio del latido.

// Interpolación lineal entre vértices, que es como se ve una deflexión en el
// papel: el QRS de un ECG real no es una curva suave ni una escalera, son
// tramos rectos que se cortan en ángulo.
//
// Cada tramo del QRS devolvía antes una constante (-15 en la Q, 80 en la R,
// -25 en la S), así que el complejo se dibujaba como una escalera de saltos
// verticales y mesetas planas. En el monitor, a 16 ms por muestra, el salto
// pasaba por una línea; en una tira quieta a 25 mm/s, con muestras cada 2 ms,
// el escalón se ve.
function porVertices(ms, vertices) {
    const ultimo = vertices.length - 1;
    if (ms < vertices[0][0] || ms > vertices[ultimo][0]) return 0;
    for (let i = 1; i <= ultimo; i++) {
        const t1 = vertices[i][0];
        if (ms <= t1) {
            const t0 = vertices[i - 1][0], v0 = vertices[i - 1][1], v1 = vertices[i][1];
            return v0 + (v1 - v0) * (ms - t0) / (t1 - t0);
        }
    }
    return 0;
}

function dibujarP(ms) {
    if (ms > P_INICIO_MS && ms < P_INICIO_MS + P_DURACION_MS) {
        return 12 * Math.sin((ms - P_INICIO_MS) * Math.PI / P_DURACION_MS);
    }
    return 0;
}

// Complejo angosto, qRs: Q pequeña de 18 ms, R de 34 ms que llega a 80 y S de
// 28 ms. Los picos valen lo mismo que antes —el umbral de detección de R de
// js/30-tira-ecg.js y la escala del monitor dependen de ellos—; lo que cambia
// es que ahora hay rampas entre un vértice y el siguiente.
//
// El vértice de la R no es una punta geométrica sino un romo de 8 ms. No es
// decorativo: el monitor muestrea una vez por fotograma (unos 16 ms), y con
// una punta perfecta la muestra caería unas veces en el vértice y otras en la
// rampa, así que la altura de la R cambiaría de un latido a otro. Con el romo,
// y con los hombros a 66 que lo flanquean, la peor muestra posible dibuja la R
// a un 83% de su altura en lugar de a la mitad. A 25 mm/s esos 8 ms miden dos
// décimas de milímetro: en la tira, y ampliándola, se lee como una punta.
const QRS_ANGOSTO = [
    [0, 0], [10, -15], [20, 0],                             // Q
    [25, 66], [30, 80], [38, 80], [43, 66], [48, 0],        // R
    [59, -25], [80, 0]                                      // S
];

// Complejo ancho (EV, escape ventricular, bloqueo infra-Hisiano): deflexión
// única de 140 ms, asimétrica, con el ascenso lento y el vértice pasada la
// mitad. Era una media senoidal perfectamente simétrica, que es la misma
// forma de la onda P pero más grande; lo que distingue a un complejo ancho de
// verdad es justamente el empastamiento inicial, porque el impulso viaja de
// músculo a músculo y no por el His.
const QRS_ANCHO = [
    [0, 0], [18, 6], [40, 26], [58, 35], [78, 22], [105, 6], [QRS_ANCHO_DURACION_MS, 0]
];

function dibujarQRS(ms, ancho = false) {
    const desde = ms - QRS_INICIO_MS;
    if (desde < 0) return 0;
    return porVertices(desde, ancho ? QRS_ANCHO : QRS_ANGOSTO);
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
        // La T es asimétrica: sube despacio y baja más rápido. Con una media
        // senoidal salía perfectamente simétrica, que es la forma de la P.
        // El vértice se coloca al 62% de su duración y cada mitad se dibuja
        // con su propio cuarto de senoidal, así que el empalme en el vértice
        // queda liso.
        const dur = fin - inicio, x = ms - inicio, vertice = dur * 0.62;
        const val = 18 * (x < vertice
            ? Math.sin(x * Math.PI / (2 * vertice))
            : Math.cos((x - vertice) * Math.PI / (2 * (dur - vertice))));
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
// Escalones iguales de 100 ms, dimensionados para la escala del monitor: a
// 120 px/s cada uno corre el QRS 12 px respecto de su P, y en el cuarto latido
// la P ya queda a medio camino entre la T anterior y su propio QRS. Con
// escalones de 30-60 ms (4-7 px en un ciclo de ~110 px) el alargamiento
// existía en la señal, pero en el monitor el PR se veía constante y el
// trazado no se distinguía de un Mobitz II.
const SECUENCIA_WENCKEBACH = [160, 260, 360, 460, null];

// Mobitz II, conducción 4:3. El PR es FIJO —nunca se alarga— y una P se queda
// sin QRS de forma súbita, sin aviso previo.
//
// Tres PR iguales seguidos antes de la P bloqueada: es lo que permite ver que
// el PR no cambia. En un 2:1 nunca hay dos latidos conducidos seguidos, así
// que no se podría distinguir de un Wenckebach 2:1.
const SECUENCIA_MOBITZ_II = [180, 180, 180, null];

// La pausa sale sola de la secuencia, sin programarla: el R-R que contiene la
// P bloqueada mide dos P-P menos lo que se acortó el PR. En Wenckebach eso da
// MENOS de dos P-P (el PR pasa de 460 a 160); en Mobitz II, como el PR no
// cambia, da EXACTAMENTE dos P-P.

// Generador común a Mobitz I y Mobitz II. Cada latido conducido es el mismo
// latido del ritmo sinusal —misma P, mismo QRS con Q, R y S, misma T— con el
// QRS y la T corridos en bloque hasta donde marca su PR. Lo único que
// distingue a los dos bloqueos es su secuencia de conducción.
//
// Mobitz II usaba antes el QRS "ancho" (una sola joroba senoidal, sin Q/R/S,
// con la misma forma que la P pero más grande) y la T invertida: el complejo
// parecía una P gigante y no se reconocía como QRS.
function generarBloqueoAV2doGrado(ctx) {
    const { ms, latido } = ctx;
    let amplitud = dibujarP(ms); // la P se dibuja SIEMPRE, conduzca o no

    if (latido.conducido) {
        const retraso = latido.prMs - PR_INTERVALO_MS;
        amplitud += dibujarQRS(ms - retraso) + dibujarT(ms - retraso, ctx.ciclo);
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

// Flutter auricular: ondas F en dientes de sierra a su propio reloj auricular
// (200 ms, 300/min), con un QRS de conducción regular encima.
//
// Las F eran una senoidal: el trazado ondulaba, pero el diente de sierra —el
// hallazgo que da el diagnóstico, y el que el Módulo 03 pide buscar en II, III
// y aVF— no estaba en ninguna parte. Un diente de sierra es una rampa lenta y
// una caída rápida, así que se dibuja como tal.
function generarFlutter(ctx) {
    const f = ctx.t_aur;
    const RAMPA = 0.72;
    const F = f < RAMPA
        ? -9 + (f / RAMPA) * 17
        : 8 - ((f - RAMPA) / (1 - RAMPA)) * 17;
    return F + dibujarQRS(ctx.ms) + dibujarT(ctx.ms, ctx.ciclo);
}

// Fibrilación Auricular: línea de base irregular ("fibrilatoria") sin onda P,
// con QRS estrecho de conducción irregular.
function generarFA(ctx) {
    // Donde iría la P hay ondas f, que no son una oscilación limpia ni ruido
    // blanco: son una ondulación de amplitud pequeña y período variable. Se
    // obtiene sumando tres senoidales de períodos no múltiplos entre sí, que
    // nunca vuelven a coincidir en fase.
    //
    // Antes era una senoidal más `3 * Math.random()` por muestra. En el
    // monitor, con una muestra cada 16 ms, pasaba por temblor; en una tira
    // quieta, con una cada 2 ms, son 500 Hz de ruido: pelusa, no ondas f. Y
    // al ir sobre el reloj del latido se repetía igual en cada ciclo.
    const r = ctx.relojMs;
    const base = 3.2 * Math.sin(r / 21) + 2.1 * Math.sin(r / 13 + 1.7) + 1.4 * Math.sin(r / 31 + 0.6);
    return base + dibujarQRS(ctx.ms) + dibujarT(ctx.ms, ctx.ciclo);
}

// Taquicardia Ventricular Monomórfica: complejos anchos, todos iguales, con la
// repolarización en sentido contrario.
//
// Era `60 · sen(t · 2π)`: una senoidal perfecta, un ciclo por latido. No se
// distinguía dónde acababa el complejo y empezaba la T, que es precisamente lo
// que hay que reconocer; y al ser simétrica no mostraba el ascenso empastado.
// Aquí el complejo ocupa el 42% del ciclo con el vértice pasada la mitad, y el
// resto es la T discordante.
function generarTVMonomorfica(ctx) {
    const ciclo = ctx.ciclo, ms = ctx.ms;
    const anchoQrs = Math.min(150, ciclo * 0.42);
    if (ms < anchoQrs) {
        const u = ms / anchoQrs;
        return 58 * Math.sin(Math.pow(u, 1.25) * Math.PI);
    }
    const u = (ms - anchoQrs) / (ciclo - anchoQrs);
    return -24 * Math.sin(u * Math.PI);
}

// Fibrilación Ventricular: caos eléctrico total, sin complejos organizados
// ni ciclo cardíaco reconocible. Se genera con osciladores de alta frecuencia
// independientes del reloj de latido (ctx.t no se usa) más ruido, para que
// nunca se repita un patrón.
//
// Los tres osciladores iban sobre performance.now(), el reloj de pared. En el
// monitor da igual, porque el reloj de pared y el del motor avanzan a la vez;
// pero una tira quieta se dibuja entera en menos de un milisegundo, así que
// performance.now() valía prácticamente lo mismo en las 3000 muestras y la
// fibrilación salía como una línea casi recta. Con ctx.relojMs —el tiempo que
// el motor dice que ha pasado— la forma es la misma en los dos sitios.
function generarFV(ctx) {
    const t = ctx.relojMs;
    const caos = Math.sin(t / 47) * 25 + Math.sin(t / 91) * 18 + Math.sin(t / 23) * 12;
    return caos + 12 * ctx.ruido(16);
}

// Asistolia: ausencia total de actividad eléctrica organizada. Se registra
// explícitamente (en vez de dejarla sin generador) para que quede claro que
// la línea isoeléctrica es una decisión deliberada, no un hueco sin implementar.
function generarAsistolia() {
    return 0;
}

// Taquicardia Ventricular Polimórfica: caótica e irregular, sin patrón
// repetitivo — osciladores rápidos y asimétricos más ruido. Sobre el reloj del
// motor, por lo mismo que la FV.
function generarTVPolimorfica(ctx) {
    const t = ctx.relojMs;
    const variacionCaotica = 42 + 16 * Math.sin(t / 113) + 20 * Math.cos(t / 239);
    return variacionCaotica * Math.sin(ctx.t * Math.PI * 2) + 8 * ctx.ruido(20);
}

// Torsades de Pointes: husos de amplitud creciente y decreciente. La
// envolvente cruza el cero, y al cruzarlo el trazado cambia de polaridad: esa
// inversión es la torsión del eje que da nombre al ritmo.
//
// Iba también sobre el reloj de pared, con lo que en una tira quieta la
// envolvente valía lo mismo de principio a fin y el huso —el único hallazgo
// de este ritmo— no aparecía. El período del huso baja de 4,4 s a 1,8 s, que
// deja ver tres husos completos en los seis segundos de una tira.
function generarTorsades(ctx) {
    const huso = 55 * Math.sin(ctx.relojMs * Math.PI * 2 / 1800);
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
    bav2_1: generarBloqueoAV2doGrado,
    bav2_2: generarBloqueoAV2doGrado,
    bav3: generarBav3,
    flutter: generarFlutter,

    fa: generarFA,
    tv_mono: generarTVMonomorfica,
    tv_poli: generarTVPolimorfica,
    torsades: generarTorsades,

    fv: generarFV,
    asistolia: generarAsistolia,
};

// Ritmos a los que NO se les aplica la retención de pico (ver obtenerVoltaje).
// No tienen deflexiones finas que perder —su trazado es una oscilación
// continua— y su forma lleva ruido: volver a preguntar por el mismo fotograma
// consumiría ruido de más y ensancharía la amplitud hacia fuera.
const SIN_RETENCION = ['fv', 'tv_poli', 'torsades', 'asistolia'];

// Resolución con la que se busca el pico dentro de un fotograma, en ms.
const PASO_FINO_MS = 6;

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

        // Fibrilacion auricular: factor que alarga o acorta el ciclo de cada
        // latido. Sin el, la FA se dibujaba con los R-R perfectamente
        // constantes, cuando su rasgo definitorio —el que el Modulo 03 usa
        // para reconocerla— es justamente que sean irregularmente
        // irregulares. Se renueva en cada latido (ver obtenerVoltaje).
        this.variacionRR = 1;

        // Reloj simulado: la suma de todos los deltaTime que ha recibido el
        // motor. Lo usan los ritmos cuya forma no depende del latido sino del
        // paso del tiempo (FV, TV polimórfica, torsades, la línea de base de
        // la FA), que antes leían performance.now().
        this.relojMs = 0;

        // Azar reproducible. Con Math.random(), una tira quieta de fibrilación
        // auricular salía con R-R distintos en cada apertura del módulo, así
        // que el trazado que el estudiante mide no era el que se usó para
        // calcular la respuesta correcta. Con una semilla fija, la misma
        // llamada da siempre la misma tira.
        this.semilla = 20260101;
        this.azar = () => {
            this.semilla = (this.semilla * 1103515245 + 12345) & 0x7fffffff;
            return this.semilla / 0x7fffffff;
        };

        // Ruido de banda limitada, entre -1 y 1: sortea un valor nuevo cada
        // `periodo` milisegundos y se mueve en línea recta de uno al siguiente.
        //
        // El ruido de la FV y de la TV polimórfica era un sorteo por muestra.
        // En el monitor, con una muestra cada 16 ms, eso son 60 Hz, dentro del
        // ancho de banda de un ECG; en una tira quieta, con una cada 2 ms, son
        // 500 Hz — una frecuencia que ningún electrocardiógrafo registra, y que
        // en el papel se ve como pelusa en lugar de como un trazado caótico.
        // Fijando el período, el ruido es el mismo en los dos sitios.
        this.ruidoEstado = { hasta: 0, de: 0, a: 0 };
        this.ruido = (periodo) => {
            const r = this.ruidoEstado;
            while (this.relojMs >= r.hasta) {
                r.de = r.a;
                r.a = this.azar() * 2 - 1;
                r.hasta += periodo;
            }
            return r.de + (r.a - r.de) * (1 - (r.hasta - this.relojMs) / periodo);
        };
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
        this.variacionRR = 1;
        this.relojMs = 0;
        this.semilla = 20260101;
        this.ruidoEstado = { hasta: 0, de: 0, a: 0 };
    }

    obtenerVoltaje(deltaTime, ritmo, fc) {
        if (fc === 0 && !['fv', 'asistolia', 'aesp'].includes(ritmo)) return 0;
        this.relojMs += deltaTime;

        const cicloBase = fc > 0 ? 60000 / fc : 1000;
        let cicloActual = cicloBase;

        // 1. Aplicamos modificadores de ciclo si es una extrasístole o pausa
        if (this.tipoLatidoActual === 'EAP') cicloActual = cicloBase * 0.70;
        if (this.tipoLatidoActual === 'EV') cicloActual = cicloBase * 0.60;
        if (this.pausaCompensatoria) cicloActual = cicloBase * 1.40;

        // Fibrilación auricular: cada latido dura algo distinto del anterior.
        // El factor se sortea al cerrar el latido previo (más abajo) y se
        // aplica aquí, de modo que el ciclo es constante DENTRO del latido y
        // cambia ENTRE latidos — que es lo que produce un R-R irregularmente
        // irregular y no un trazado tembloroso.
        if (ritmo === 'fa') cicloActual = cicloActual * this.variacionRR;

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

            // Sortea la duración del latido que empieza ahora. El rango, de
            // 0,72 a 1,28 veces el ciclo base, da la variabilidad que se ve
            // en una FA con respuesta ventricular rápida sin llegar a
            // frecuencias que no corresponden al ritmo.
            if (ritmo === 'fa') this.variacionRR = 0.72 + this.azar() * 0.56;

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

            // Reloj simulado y azar reproducible (ver el constructor).
            relojMs: this.relojMs,
            azar: this.azar,
            ruido: this.ruido,

            tipoLatidoActual: this.tipoLatidoActual,
            latido: this.latidoActual,
        };

        const generador = GENERADORES_RITMO[ritmo];
        if (!generador) return 0;
        const valor = generador(contexto);

        // --- RETENCIÓN DE PICO ---
        //
        // El monitor pide una muestra por fotograma, unos 16 ms a 60 Hz. La
        // parte alta de la R dura 18 ms y su vértice 8: si la muestra cae en
        // la rampa, el complejo se pinta más bajo de lo que es, y como el
        // fotograma no va sincronizado con el latido, la altura de la R baila
        // de un latido al siguiente. Medido sobre un ritmo sinusal a 60 Hz, la
        // R oscilaba entre 68 y 80 — un 15% de salto, visible en pantalla.
        //
        // Un monitor real hace exactamente esto: muestrea mucho más rápido de
        // lo que pinta y lleva al trazado el valor más alejado de la línea de
        // base de cada intervalo. Aquí el reloj no se toca: se vuelve a
        // preguntar al generador por instantes anteriores dentro del mismo
        // fotograma, que para un ritmo con latidos es una función pura.
        if (deltaTime <= PASO_FINO_MS || SIN_RETENCION.includes(ritmo)) return valor;

        let extremo = valor;
        const pasos = Math.min(8, Math.ceil(deltaTime / PASO_FINO_MS));
        for (let i = 1; i < pasos; i++) {
            const atras = deltaTime * i / pasos;
            const v = generador({
                t: contexto.t - atras / cicloActual,
                t_aur: contexto.t_aur - atras / cicloAuricular,
                ms: contexto.ms - atras,
                ms_aur: contexto.ms_aur - atras,
                ciclo: cicloActual,
                relojMs: contexto.relojMs - atras,
                azar: contexto.azar,
                ruido: contexto.ruido,
                tipoLatidoActual: contexto.tipoLatidoActual,
                latido: contexto.latido,
            });
            if (Math.abs(v) > Math.abs(extremo)) extremo = v;
        }
        return extremo;
    }
}

    // --- API PÚBLICA DEL NAMESPACE ---
    // Las primitivas de dibujo y los generadores por arritmia quedan privados
    // dentro de este archivo; solo se expone la clase que orquesta el reloj.
    OVA.MotorECG.MotorMatematicoECG = MotorMatematicoECG;

    // --- Alias bajo el Motor Clínico (Etapa 2.1) — ver 00-motor-clinico.js ---
    MotorClinico.ECG = MotorMatematicoECG;

})(window.OVA = window.OVA || {});

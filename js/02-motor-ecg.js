(function (OVA) {
    OVA.MotorECG = OVA.MotorECG || {};

// --- NÚCLEO MATEMÁTICO INTEGRADOR (Versión 11.0 — Generadores por Arritmia) ---
//
// ARQUITECTURA:
// El motor se divide en dos responsabilidades separadas:
//
// 1. RELOJ DEL MOTOR (dentro de la clase MotorMatematicoECG): fases, contadores
//    de bloqueo AV y lógica de extrasístoles. Esto es mecánica compartida del
//    "reloj clínico", no pertenece a ninguna arritmia en particular.
//
// 2. GENERADORES POR ARRITMIA (GENERADORES_RITMO): cada arritmia tiene su propia
//    función, independiente de las demás. Añadir, corregir o reemplazar una
//    arritmia significa tocar únicamente su función — nunca las de las otras.
//    Las funciones dibujarP/dibujarQRS/dibujarT son primitivas de dibujo
//    compartidas (no "el algoritmo" de ninguna arritmia), igual que dos
//    generadores pueden compartir una misma primitiva geométrica sin dejar
//    de ser modelos independientes.

// --- PRIMITIVAS DE DIBUJO (compartidas entre generadores) ---
function dibujarP(tiempo) {
    if (tiempo > 0.05 && tiempo < 0.12) return 12 * Math.sin((tiempo - 0.05) * Math.PI / 0.07);
    return 0;
}

function dibujarQRS(tiempo, ancho = false) {
    let v = 0;
    if (ancho) {
        // Complejo ancho para EV o Escape Ventricular
        if (tiempo > 0.15 && tiempo < 0.28) v += 35 * Math.sin((tiempo - 0.15) * Math.PI / 0.13);
    } else {
        if (tiempo > 0.15 && tiempo < 0.17) v -= 15;
        else if (tiempo >= 0.17 && tiempo < 0.20) v += 80;
        else if (tiempo >= 0.20 && tiempo < 0.23) v -= 25;
    }
    return v;
}

function dibujarT(tiempo, invertida = false) {
    if (tiempo > 0.35 && tiempo < 0.50) {
        let val = 18 * Math.sin((tiempo - 0.35) * Math.PI / 0.15);
        return invertida ? -val : val;
    }
    return 0;
}

// --- GENERADORES INDEPENDIENTES POR ARRITMIA ---
// Cada función recibe el "contexto" del reloj (fase actual, tipo de latido,
// contadores de bloqueo) y devuelve la amplitud de la señal en ese instante.

// Ritmos organizados con lógica de extrasístoles espontáneas (sinusal,
// bradicardia sinusal, taquicardia sinusal, AESP, y las vistas dedicadas
// de extrasístole auricular/ventricular).
function generarConExtrasistoles(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    if (ctx.tipoLatidoActual === 'EV') {
        amplitud += dibujarQRS(t, true) + dibujarT(t, true); // QRS Ancho y T invertida
    } else if (ctx.tipoLatidoActual === 'EAP') {
        amplitud += dibujarP(t - 0.03) + dibujarQRS(t) + dibujarT(t); // P adelantada
    } else {
        amplitud += dibujarP(t) + dibujarQRS(t) + dibujarT(t); // Normal
    }
    return amplitud;
}

// Bloqueo AV 1er grado: PR fijo y alargado (retraso constante del QRS/T).
function generarBav1(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    amplitud += dibujarP(t);
    if (t - 0.08 > 0) amplitud += dibujarQRS(t - 0.08) + dibujarT(t - 0.08);
    return amplitud;
}

// Bloqueo AV 2do grado Mobitz I (Wenckebach): el PR se alarga progresivamente
// hasta que un latido se bloquea por completo (4to latido del ciclo).
function generarBav2Wenckebach(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    amplitud += dibujarP(t);
    let retrasoW = (ctx.contadorNodal - 1) * 0.04;
    let t_retrasadoW = t - retrasoW;
    if (ctx.contadorNodal < 4 && t_retrasadoW > 0) {
        amplitud += dibujarQRS(t_retrasadoW) + dibujarT(t_retrasadoW);
    }
    return amplitud;
}

// Bloqueo AV 2do grado Mobitz II: PR fijo, pero cada 3er latido se bloquea
// de forma súbita (sin alargamiento previo).
function generarBav2Mobitz2(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    amplitud += dibujarP(t);
    if (ctx.contadorRatio % 3 !== 0) {
        amplitud += dibujarQRS(t) + dibujarT(t);
    }
    return amplitud;
}

// Bloqueo AV 3er grado (completo): disociación AV total — la onda P sigue
// su propio reloj auricular, el QRS sigue su propio reloj ventricular de escape.
function generarBav3(ctx) {
    let amplitud = 0;
    amplitud += dibujarP(ctx.t_aur);
    amplitud += dibujarQRS(ctx.t, true) + dibujarT(ctx.t, true);
    return amplitud;
}

// Flutter auricular: ondas en "dientes de sierra" a su propio reloj auricular,
// conectadas a un QRS de conducción regular.
function generarFlutter(ctx) {
    let amplitud = 0;
    amplitud += 8 * Math.sin(ctx.t_aur * Math.PI * 2);
    amplitud += dibujarQRS(ctx.t) + dibujarT(ctx.t);
    return amplitud;
}

// Taquicardia Supraventricular Paroxística: QRS estrecho y rápido, sin onda P
// visible distinguible (oculta en el latido previo).
function generarTSVP(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    if (t > 0.10 && t < 0.13) amplitud -= 10;
    else if (t >= 0.13 && t < 0.16) amplitud += 70;
    else if (t >= 0.16 && t < 0.19) amplitud -= 20;
    if (t > 0.25 && t < 0.40) amplitud += 15 * Math.sin((t - 0.25) * Math.PI / 0.15);
    return amplitud;
}

// Fibrilación Auricular: línea de base irregular ("fibrilatoria") sin onda P,
// con QRS estrecho de conducción irregular.
function generarFA(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    amplitud += 4 * Math.sin(t * 40) + 3 * Math.random();
    if (t > 0.15 && t < 0.18) amplitud -= 10;
    else if (t >= 0.18 && t < 0.22) amplitud += 65;
    else if (t >= 0.22 && t < 0.25) amplitud -= 15;
    if (t > 0.35 && t < 0.45) amplitud += 12 * Math.sin((t - 0.35) * Math.PI / 0.10);
    return amplitud;
}

// Taquicardia Ventricular Monomórfica.
function generarTVMonomorfica(ctx) {
    return 60 * Math.sin(ctx.t * Math.PI * 2);
}

// Taquicardia Ventricular Sin Pulso. Función independiente de
// generarTVMonomorfica (se puede modificar una sin afectar la otra), pero
// produce intencionalmente la MISMA forma de onda: clínicamente, la TV con
// pulso y sin pulso pueden ser eléctricamente indistinguibles en el monitor.
// La diferencia la da la palpación del pulso, no el trazado — por eso no se
// le da una morfología distinta (sería enseñar una falsedad clínica).
function generarTVSinPulso(ctx) {
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

// Marcapasos: Captura Ventricular Efectiva. Espiga de estimulación (deflexión
// breve y aguda) inmediatamente seguida de un QRS ancho capturado —
// morfología ventricular, como un latido de escape pero a ritmo regular.
function generarMarcapasosVentricular(ctx) {
    let amplitud = 0;
    const t = ctx.t;
    if (t > 0.13 && t < 0.14) amplitud += 90; // espiga de marcapasos
    amplitud += dibujarQRS(t, true) + dibujarT(t, true);
    return amplitud;
}

// Marcapasos: Fallo de Estimulación. El dispositivo NO genera espiga (sin
// captura): a propósito no se dibuja ninguna espiga. El paciente queda
// dependiente de su ritmo de escape ventricular lento y ancho — el punto
// clínico es precisamente notar la ausencia de la espiga esperada.
function generarMarcapasosFalloEstimulacion(ctx) {
    return dibujarQRS(ctx.t, true) + dibujarT(ctx.t, true);
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

    tsvp: generarTSVP,
    fa: generarFA,
    tv_mono: generarTVMonomorfica,
    tvsp: generarTVSinPulso,
    tv_poli: generarTVPolimorfica,
    torsades: generarTorsades,

    fv: generarFV,
    asistolia: generarAsistolia,
    mp_ventricular: generarMarcapasosVentricular,
    mp_fallo_est: generarMarcapasosFalloEstimulacion,
};

class MotorMatematicoECG {
    constructor() {
        // Relojes (El cerebro clínico)
        this.fase = 0; // Fase global/ventricular (0 a 1)
        this.faseAuricular = 0; // Reloj independiente para aurículas (Disociación/Flutter)
        this.contadorNodal = 1; // Para Wenckebach (Mobitz I)
        this.contadorRatio = 1; // Para Mobitz II

        // Lógica de extrasístoles
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
        this.contadorNodal = 1;
        this.contadorRatio = 1;
        this.tipoLatidoActual = 'NORMAL';
        this.pausaCompensatoria = false;
    }

    obtenerVoltaje(deltaTime, ritmo, fc) {
        if (fc === 0 && !['fv', 'tvsp', 'asistolia', 'aesp'].includes(ritmo)) return 0;

        const cicloBase = fc > 0 ? 60000 / fc : 1000;
        let cicloActual = cicloBase;

        // 1. Aplicamos modificadores de ciclo si es una extrasístole o pausa
        if (this.tipoLatidoActual === 'EAP') cicloActual = cicloBase * 0.70;
        if (this.tipoLatidoActual === 'EV') cicloActual = cicloBase * 0.60;
        if (this.pausaCompensatoria) cicloActual = cicloBase * 1.40;

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

            // Generador espontáneo de extrasístoles
            if (['sinusal', 'bradi_sinusal', 'eap', 'ev'].includes(ritmo)) {
                let rng = Math.random() * 100;
                if (ritmo === 'ev' || (rng < 8 && !this.pausaCompensatoria)) {
                    this.tipoLatidoActual = 'EV';
                } else if (ritmo === 'eap' || (rng >= 8 && rng < 16 && !this.pausaCompensatoria)) {
                    this.tipoLatidoActual = 'EAP';
                } else {
                    this.tipoLatidoActual = 'NORMAL';
                }
            } else {
                this.tipoLatidoActual = 'NORMAL';
            }

            // Avance de contadores de bloqueo AV
            if (ritmo === 'bav2_1') {
                this.contadorNodal++;
                if (this.contadorNodal > 4) this.contadorNodal = 1;
            }
            if (ritmo === 'bav2_2') this.contadorRatio++;
        }

        if (this.faseAuricular > 1) this.faseAuricular -= 1;

        // 4. Delegamos el cálculo de amplitud al generador propio de este ritmo.
        //    Si el ritmo no tiene generador registrado todavía, se comporta
        //    igual que antes del refactor: amplitud 0 (línea plana).
        const contexto = {
            t: this.fase,
            t_aur: this.faseAuricular,
            tipoLatidoActual: this.tipoLatidoActual,
            contadorNodal: this.contadorNodal,
            contadorRatio: this.contadorRatio,
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

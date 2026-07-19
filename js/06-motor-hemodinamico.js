// ============================================================
// MOTOR HEMODINÁMICO (Etapa 2.3 — implementado según propuesta aprobada)
// ============================================================
//
// Flujo:
//     Base hemodinámica (RITMOS_DB[ritmo].hmd)
//              ↓
//     calcularEstado()  → aplica variabilidad biológica
//              ↓
//     clasificarEstadoClinico()  → estable / inestable / paro
//
// Decisiones ya acordadas con el usuario para esta etapa:
//   - Umbrales de clasificación: TAS < 90, FC > 150, FC < 40, SpO2 < 90.
//   - Sin cambios visuales todavía (el estado clínico se calcula y se
//     guarda, pero no se muestra ningún badge en el monitor).
//   - Se agrega variabilidad biológica ya (pequeña fluctuación aleatoria
//     en vez de copiar el valor fijo de RITMOS_DB tal cual).
//   - La variabilidad se aplica UNA VEZ, al momento de seleccionar el
//     ritmo (mismo punto donde ya se generaba el SpO2 con algo de
//     aleatoriedad). Una fluctuación CONTINUA en vivo (que los números
//     tiemblen mientras el monitor corre) queda para la Etapa 2.6
//     (evolución temporal), porque hoy no existe ningún bucle que
//     refresque los vitales de forma periódica — agregarlo ahora sería
//     adelantar trabajo de esa etapa.

// Pequeña fluctuación aleatoria alrededor de un valor base. Si el valor
// base es 0 (ej. FC en paro), NO se inventan signos vitales — un paciente
// en paro no tiene una "FC de 0 con variabilidad", simplemente no tiene FC.
function aplicarVariabilidad(valorBase, magnitud) {
    if (valorBase === 0) return 0;
    const delta = (Math.random() * 2 - 1) * magnitud;
    return valorBase + delta;
}

// Clasifica el estado clínico a partir de los signos vitales YA calculados
// (con variabilidad aplicada) y el ritmo actual. Función pura: no depende
// de nada más que sus parámetros, para que el futuro Motor de Eventos (2.5)
// y Motor de Pacientes (2.4) puedan reutilizarla sin duplicar la regla.
function clasificarEstadoClinico(vitales, ritmo) {
    const RITMOS_DE_PARO = ['fv', 'tvsp', 'asistolia', 'aesp'];

    if (RITMOS_DE_PARO.includes(ritmo) || vitales.fc === 0) {
        return 'paro';
    }

    const esInestable = vitales.sis < 90 || vitales.fc > 150 || vitales.fc < 40 || vitales.spo2 < 90;
    return esInestable ? 'inestable' : 'estable';
}

// Punto de entrada principal del motor. Recibe la base hemodinámica fija
// (RITMOS_DB[ritmo].hmd), el ritmo actual y si el ritmo tiene pulso, y
// devuelve el objeto completo de signos vitales + interpretación clínica.
//
// IMPORTANTE: conserva los mismos nombres de campo que ya usa
// 04-simulador.js (fc, sis, dia, fr, temp, spo2) para no obligar a
// renombrar nada en el resto del simulador — solo AGREGA campos nuevos
// (pam, perfusion, estadoClinico).
function calcularEstado(baseHemodinamica, ritmo, tienePulso) {
    const fc = Math.round(aplicarVariabilidad(baseHemodinamica.fc, 2));
    const sis = Math.round(aplicarVariabilidad(baseHemodinamica.sis, 3));
    const dia = Math.round(aplicarVariabilidad(baseHemodinamica.dia, 2));
    const fr = Math.round(aplicarVariabilidad(baseHemodinamica.fr, 1));
    const temp = Math.round(aplicarVariabilidad(baseHemodinamica.temp, 0.1) * 10) / 10;

    // El SpO2 mantiene la misma lógica que ya existía en cambiarRitmo()
    // antes de esta etapa (93-98 con pulso, 0 sin pulso) — no se cambia
    // su comportamiento, solo se traslada aquí.
    const spo2 = tienePulso ? (93 + Math.floor(Math.random() * 6)) : 0;

    const pam = sis > 0 ? Math.round((sis + 2 * dia) / 3) : 0;
    const perfusion = !tienePulso ? 'ausente' : (sis < 90 ? 'retardada' : 'buena');
    const estadoClinico = clasificarEstadoClinico({ fc, sis, spo2 }, ritmo);

    return { fc, sis, dia, fr, temp, spo2, pam, perfusion, estadoClinico };
}

MotorClinico.Hemodinamico = {
    calcularEstado,
    clasificarEstadoClinico,
};

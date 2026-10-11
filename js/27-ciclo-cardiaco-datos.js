(function (OVA) {
    OVA.CicloCardiaco = OVA.CicloCardiaco || {};

// --- FISIOLOGÍA DEL CICLO CARDÍACO (fuente única para los dos recursos) ---
//
// El Módulo 01 tiene dos recursos sobre el ciclo cardíaco con objetivos
// distintos: el diagrama de Wiggers (js/28-diagrama-wiggers.js), que enseña a
// leer las curvas simultáneas, y el diagrama de fases
// (js/29-ciclo-cardiaco.js), que enseña qué ocurre dentro del corazón en cada
// momento. Los dos leen de aquí.
//
// No es un detalle de organización: si cada uno llevara sus propios tiempos,
// bastaría un retoque en uno para que el estudiante viera la válvula aórtica
// abrirse en dos instantes distintos según el recurso que mirara.
//
// Todos los valores son representativos del adulto sano a 75 lpm, que es el
// ciclo de 0,8 s con el que trabajan los textos de fisiología. Las curvas NO
// son trazos decorativos: se calculan interpolando los puntos de referencia
// fisiológicos que están abajo, así que el valor en cualquier instante se
// corresponde con el momento del ciclo.

// Duración del ciclo a 75 lpm. El resto de tiempos se expresa en segundos
// dentro de este ciclo, con el origen en el inicio de la onda P.
const DURACION = 0.80;

// --- FASES ---
// El reparto respeta la proporción clásica: la sístole ventricular
// (contracción isovolumétrica + eyección) ocupa 0,31 s, algo menos de un
// tercio, y la diástole los 0,49 s restantes.
const FASES = [
    {
        id: 'sistole-auricular',
        nombre: 'Sístole auricular',
        corto: 'Sístole auricular',
        desde: 0.00, hasta: 0.14,
        periodo: 'diastole',
        resumen: 'La aurícula se contrae y añade el último volumen al ventrículo, que ya estaba casi lleno.',
        detalle: 'La onda P abre el ciclo: marca la despolarización auricular y precede a la contracción. Las válvulas auriculoventriculares siguen abiertas, así que esa contracción empuja hacia el ventrículo el volumen que faltaba — el llamado aporte auricular, que a frecuencia normal supone una fracción pequeña del llenado, pero se vuelve decisivo cuando la diástole se acorta. Al final de esta fase el ventrículo alcanza su volumen máximo, el volumen telediastólico.',
        ecg: 'Onda P',
        evento: null
    },
    {
        id: 'contraccion-isovolumetrica',
        nombre: 'Contracción isovolumétrica',
        corto: 'Contracción isovol.',
        desde: 0.14, hasta: 0.19,
        periodo: 'sistole',
        resumen: 'El ventrículo se contrae con las cuatro válvulas cerradas: sube la presión, no cambia el volumen.',
        detalle: 'El complejo QRS dispara la despolarización ventricular y, tras ella, la contracción. La presión ventricular supera de inmediato a la auricular y cierra la válvula mitral — el primer ruido cardíaco—, pero todavía no alcanza la presión aórtica, de modo que la válvula aórtica sigue cerrada. Con las cuatro válvulas cerradas la sangre no tiene salida: la presión sube muy deprisa mientras el volumen se mantiene exactamente igual. De ahí el nombre.',
        ecg: 'Complejo QRS',
        evento: 'Cierre de la mitral y la tricúspide (R1)'
    },
    {
        id: 'eyeccion',
        nombre: 'Eyección ventricular',
        corto: 'Eyección',
        desde: 0.19, hasta: 0.45,
        periodo: 'sistole',
        resumen: 'La presión ventricular supera la aórtica, la válvula se abre y la sangre sale.',
        detalle: 'Cuando la presión del ventrículo supera la de la aorta, la válvula aórtica se abre y comienza la salida de sangre. La presión sigue subiendo hasta su máximo, alrededor de 120 mmHg, y después empieza a caer a medida que el ventrículo se vacía. El volumen desciende desde el telediastólico hasta el telesistólico; la diferencia entre ambos es el volumen sistólico, lo que el corazón expulsa en cada latido.',
        ecg: 'Segmento ST y onda T',
        evento: 'Apertura de la aórtica y la pulmonar'
    },
    {
        id: 'relajacion-isovolumetrica',
        nombre: 'Relajación isovolumétrica',
        corto: 'Relajación isovol.',
        desde: 0.45, hasta: 0.53,
        periodo: 'diastole',
        resumen: 'El ventrículo se relaja con las cuatro válvulas cerradas: cae la presión, no cambia el volumen.',
        detalle: 'La presión ventricular cae por debajo de la aórtica y la válvula aórtica se cierra — el segundo ruido cardíaco—, pero la mitral aún no se abre, porque la presión del ventrículo sigue siendo mayor que la de la aurícula. Otra vez las cuatro válvulas cerradas: la presión se desploma mientras el volumen permanece en su valor telesistólico. Es la imagen especular de la contracción isovolumétrica.',
        ecg: 'Final de la onda T',
        evento: 'Cierre de la aórtica y la pulmonar (R2)'
    },
    {
        id: 'llenado',
        nombre: 'Llenado ventricular',
        corto: 'Llenado',
        desde: 0.53, hasta: 0.80,
        periodo: 'diastole',
        resumen: 'La mitral se abre y el ventrículo se llena: primero rápido, luego lento (diástasis).',
        detalle: 'En cuanto la presión ventricular cae por debajo de la auricular, la mitral se abre y la sangre acumulada en la aurícula pasa al ventrículo. El llenado es primero rápido, por la diferencia de presión, y se va frenando a medida que el ventrículo se acerca a su capacidad: esa fase lenta es la diástasis. Es el tramo que más se acorta cuando sube la frecuencia cardíaca, y por eso el corazón taquicárdico gana tiempo de eyección a costa de su tiempo de llenado.',
        ecg: 'Línea isoeléctrica, hasta la siguiente onda P',
        evento: 'Apertura de la mitral y la tricúspide'
    }
];

// --- ELECTROCARDIOGRAMA ---
// Cada onda precede al fenómeno mecánico que dispara, que es justamente lo
// que el apartado 3.3 del módulo pide poder comprobar.
const ECG = {
    p:   { desde: 0.00, hasta: 0.09 },
    qrs: { desde: 0.14, hasta: 0.22 },
    t:   { desde: 0.34, hasta: 0.52 }
};

// --- VÁLVULAS ---
// Los tiempos del lado derecho no son copia del izquierdo. La pulmonar se
// abre antes que la aórtica y se cierra después, porque el ventrículo derecho
// trabaja contra presiones mucho menores; ese desfase es el que produce el
// desdoblamiento fisiológico del segundo ruido.
const VALVULAS = {
    mitral:     { abre: 0.53, cierra: 0.14, lado: 'izquierdo', tipo: 'auriculoventricular', nombre: 'Mitral' },
    tricuspide: { abre: 0.52, cierra: 0.15, lado: 'derecho',   tipo: 'auriculoventricular', nombre: 'Tricúspide' },
    aortica:    { abre: 0.19, cierra: 0.45, lado: 'izquierdo', tipo: 'semilunar',           nombre: 'Aórtica' },
    pulmonar:   { abre: 0.18, cierra: 0.47, lado: 'derecho',   tipo: 'semilunar',           nombre: 'Pulmonar' }
};

// --- CURVAS ---
// Puntos de referencia fisiológicos [tiempo, valor]. Entre ellos se interpola
// con una curva suave (ver `valorEn`), de modo que el trazado completo sale de
// estos valores y no de un camino dibujado a mano.
const CURVAS = {
    // Presión del ventrículo izquierdo (mmHg).
    presionVI: {
        nombre: 'Presión ventricular izquierda', unidad: 'mmHg', color: '#c0392b',
        puntos: [[0.00, 6], [0.07, 11], [0.14, 9], [0.19, 80], [0.28, 120],
                 [0.38, 115], [0.45, 95], [0.49, 40], [0.53, 6], [0.62, 3],
                 [0.70, 5], [0.80, 6]]
    },
    // Presión aórtica. Coincide con la del ventrículo mientras la válvula está
    // abierta; el escalón de 0,47 s es la incisura dícrota, el rebote que deja
    // el cierre valvular.
    presionAorta: {
        nombre: 'Presión aórtica', unidad: 'mmHg', color: '#8e44ad',
        puntos: [[0.00, 82], [0.14, 80], [0.19, 80], [0.28, 120], [0.38, 115],
                 [0.45, 95], [0.47, 90], [0.50, 97], [0.60, 90], [0.70, 86],
                 [0.80, 82]]
    },
    // Presión de la aurícula izquierda, con sus tres ondas: a (contracción
    // auricular), c (abombamiento de la mitral al cerrarse) y v (llenado
    // auricular contra la válvula cerrada).
    presionAI: {
        nombre: 'Presión auricular izquierda', unidad: 'mmHg', color: '#2980b9',
        puntos: [[0.00, 8], [0.07, 13], [0.14, 9], [0.19, 11], [0.25, 8],
                 [0.35, 10], [0.45, 12], [0.53, 14], [0.58, 6], [0.70, 7],
                 [0.80, 8]]
    },
    // Volumen del ventrículo izquierdo (mL). Las mesetas de 0,14-0,19 y
    // 0,45-0,53 son las dos fases isovolumétricas: ahí el volumen no cambia.
    volumen: {
        nombre: 'Volumen ventricular', unidad: 'mL', color: '#16a085',
        puntos: [[0.00, 105], [0.10, 116], [0.14, 120], [0.19, 120], [0.28, 80],
                 [0.38, 58], [0.45, 50], [0.53, 50], [0.62, 95], [0.70, 102],
                 [0.80, 105]]
    }
};

// Cifras de referencia que el estudiante debe poder nombrar.
const REFERENCIAS = {
    volumenTelediastolico: 120,
    volumenTelesistolico: 50,
    volumenSistolico: 70,
    fraccionEyeccion: 58,
    presionSistolica: 120,
    presionDiastolica: 80
};

// --- CÁLCULO ---

// Interpolación suave entre los puntos de referencia. Se usa una curva de
// Hermite con tangentes acotadas (monótona a tramos): pasa exactamente por
// cada punto fisiológico y no inventa oscilaciones entre ellos, que es lo que
// haría una spline normal en los tramos casi verticales de las fases
// isovolumétricas.
function valorEn(curva, t) {
    const p = CURVAS[curva].puntos;
    t = ((t % DURACION) + DURACION) % DURACION;

    let i = 0;
    while (i < p.length - 2 && p[i + 1][0] <= t) i++;

    const [t0, v0] = p[i];
    const [t1, v1] = p[i + 1];
    const dt = t1 - t0;
    if (dt <= 0) return v0;

    const u = (t - t0) / dt;
    // Suavizado de Hermite (3u² − 2u³): llega a cada punto con pendiente cero,
    // lo que evita picos artificiales en los cambios de fase.
    const s = u * u * (3 - 2 * u);
    return v0 + (v1 - v0) * s;
}

// Trazado del ECG. Las ondas se sintetizan como campanas gaussianas, con el
// QRS compuesto de tres: la Q pequeña negativa, la R alta y la S negativa.
function ecgEn(t) {
    t = ((t % DURACION) + DURACION) % DURACION;
    const campana = (centro, ancho, alto) =>
        alto * Math.exp(-Math.pow((t - centro) / ancho, 2));

    return campana(0.045, 0.022, 0.15)     // P
         - campana(0.152, 0.006, 0.08)     // Q
         + campana(0.175, 0.011, 1.00)     // R
         - campana(0.205, 0.009, 0.22)     // S
         + campana(0.430, 0.040, 0.26);    // T
}

// Qué fase corresponde a un instante.
function faseEn(t) {
    t = ((t % DURACION) + DURACION) % DURACION;
    for (const f of FASES) if (t >= f.desde && t < f.hasta) return f;
    return FASES[FASES.length - 1];
}

// Si una válvula está abierta en un instante dado. Las auriculoventriculares
// abren al final del ciclo y cierran al principio del siguiente, así que su
// intervalo cruza el origen y hay que tratarlo aparte.
function valvulaAbierta(clave, t) {
    const v = VALVULAS[clave];
    t = ((t % DURACION) + DURACION) % DURACION;
    return v.abre < v.cierra
        ? (t >= v.abre && t < v.cierra)
        : (t >= v.abre || t < v.cierra);
}

function estadoValvulas(t) {
    const e = {};
    for (const k of Object.keys(VALVULAS)) e[k] = valvulaAbierta(k, t);
    return e;
}

    OVA.CicloCardiaco.DURACION = DURACION;
    OVA.CicloCardiaco.FASES = FASES;
    OVA.CicloCardiaco.ECG = ECG;
    OVA.CicloCardiaco.VALVULAS = VALVULAS;
    OVA.CicloCardiaco.CURVAS = CURVAS;
    OVA.CicloCardiaco.REFERENCIAS = REFERENCIAS;
    OVA.CicloCardiaco.valorEn = valorEn;
    OVA.CicloCardiaco.ecgEn = ecgEn;
    OVA.CicloCardiaco.faseEn = faseEn;
    OVA.CicloCardiaco.valvulaAbierta = valvulaAbierta;
    OVA.CicloCardiaco.estadoValvulas = estadoValvulas;

})(window.OVA = window.OVA || {});

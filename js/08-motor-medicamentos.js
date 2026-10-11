// ============================================================
// MOTOR DE INTERVENCIONES (antes: placeholder de Medicamentos)
// ============================================================
//
// Catálogo de las intervenciones que el estudiante puede aplicar sobre el
// paciente simulado, y la regla que decide si esa intervención está indicada
// para el ritmo que hay en pantalla en ese momento.
//
// Es la Etapa 2.5 descrita en 00-motor-clinico.js: aquí vive el "qué es
// correcto y por qué" y, desde ahora, también el "qué le pasa al paciente".
// Cada veredicto puede traer un bloque `efectos` con el cambio que produce
// sobre los signos vitales, que 04-simulador.js aplica al monitor. Antes una
// intervención solo podía reorganizar el ritmo o no hacer nada: el estudiante
// aplicaba atropina a una bradicardia y las cifras no se movían.
//
// Cada intervención declara sus ritmos por veredicto. Un ritmo que no aparece
// en ninguna lista cae en `porDefecto` y se evalúa como no indicado.
//
//   contraindicado → hacerlo empeora al paciente (se evalúa primero)
//   indicado       → es la conducta correcta según el algoritmo
//   parcial        → no daña, pero no es lo que este ritmo necesita ahora
//
// `resuelveA` + `probabilidad` describen qué tan seguido la intervención
// correcta reorganiza el ritmo. No son aleatoriedad decorativa: reflejan que
// ninguna maniobra revierte al 100% (la desfibrilación temprana ronda el 60%,
// la adrenalina en asistolia mucho menos).
//
// `efectos` son incrementos sobre las cifras actuales, no valores absolutos:
//   { fc: +30, sis: +15, dia: +8, spo2: 0, fr: 0, resumen: '...' }
// El resumen es lo que se escribe en el registro clínico. Son órdenes de
// magnitud docentes —no una farmacocinética— y por eso van declarados aquí,
// a la vista, y no escondidos en el simulador. En un ritmo sin pulso no se
// aplican: un paciente en paro no tiene cifras que subir.
//
// Las dosis, las clases y los ritmos de cada fármaco son los de la Unidad 2
// del Módulo 05, que es la misma fuente del tablero de fármacos
// (js/26-tablero-farmacos.js). No hay ninguna dosis añadida aquí.

(function () {

    const INTERVENCIONES = {

        // --- MEDICAMENTOS ---

        adenosina: {
            nombre: 'Adenosina',
            tipo: 'medicamento',
            clase: 'Nucleósido endógeno · frena el nodo AV',
            dosis: '6 mg IV en bolo rápido, seguidos de 20 mL de solución salina',
            parcial: {
                ritmos: ['flutter'],
                nota: 'Tiene valor diagnóstico: enlentece la conducción AV y desenmascara las ondas F, pero no revierte el flutter.',
                efectos: { fc: -18, resumen: 'Bloqueo AV transitorio: la respuesta ventricular cae unos segundos y deja ver las ondas auriculares.' }
            },
            contraindicado: {
                ritmos: ['bradi_sinusal', 'bav1', 'bav2_1', 'bav2_2', 'bav3', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'Bloquea transitoriamente el nodo AV: agrava cualquier bradicardia y, en una taquicardia de complejo ancho, puede acelerar la respuesta ventricular.',
                efectos: { fc: -14, sis: -12, dia: -8, resumen: 'La pausa que induce sobre un nodo ya enfermo hunde la frecuencia y la presión.' }
            },
            porDefecto: 'Se reserva para la taquicardia supraventricular regular de complejo angosto.'
        },

        atropina: {
            nombre: 'Atropina',
            tipo: 'medicamento',
            clase: 'Antagonista muscarínico · retira el freno vagal',
            dosis: '1 mg IV cada 3-5 minutos (máximo 3 mg)',
            indicado: {
                ritmos: ['bradi_sinusal', 'bav2_1'],
                nota: 'Primera línea en la bradicardia sintomática de origen nodal: revierte el tono vagal y acelera la conducción por el nodo AV.',
                resuelveA: 'sinusal',
                probabilidad: 0.75,
                efectos: { fc: 28, sis: 16, dia: 9, resumen: 'Sube la frecuencia y, con ella, el gasto cardíaco: la presión acompaña.' }
            },
            parcial: {
                ritmos: ['bav1', 'bav2_2', 'bav3'],
                nota: 'El bloqueo de 1er grado no requiere tratamiento. En Mobitz II y en el bloqueo completo la lesión es infranodal: la atropina rara vez responde y puede empeorar la relación de conducción. Prepare marcapasos.',
                efectos: { fc: 3, resumen: 'Apenas se mueve la frecuencia: por debajo del nodo AV la atropina no alcanza.' }
            },
            porDefecto: 'Solo tiene sentido frente a una bradicardia sintomática.'
        },

        adrenalina: {
            nombre: 'Adrenalina',
            tipo: 'medicamento',
            clase: 'Catecolamina · vasopresor alfa y beta',
            dosis: '1 mg IV cada 3-5 minutos durante el paro',
            indicado: {
                ritmos: ['fv', 'asistolia', 'aesp'],
                nota: 'Vasopresor de elección en el paro cardíaco: eleva la presión de perfusión coronaria mientras se mantiene la RCP de alta calidad.',
                resuelveA: 'sinusal',
                probabilidad: 0.35
            },
            parcial: {
                ritmos: ['bav2_2', 'bav3'],
                nota: 'En infusión (2-10 µg/min) es alternativa en la bradicardia refractaria, pero no sustituye al marcapasos.',
                efectos: { fc: 12, sis: 14, dia: 7, resumen: 'La infusión sostiene frecuencia y presión mientras se prepara el marcapasos.' }
            },
            contraindicado: {
                ritmos: ['taqui_sinusal', 'flutter', 'fa', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'En un paciente que ya está taquicárdico aumenta el consumo miocárdico de oxígeno y es proarrítmica.',
                efectos: { fc: 26, sis: 18, dia: 10, resumen: 'Taquicardiza todavía más a un corazón que ya no tiene tiempo de llenarse.' }
            },
            porDefecto: 'Fuera del paro cardíaco y de la bradicardia refractaria no está indicada.'
        },

        amiodarona: {
            nombre: 'Amiodarona',
            tipo: 'medicamento',
            clase: 'Antiarrítmico de clase III · bloquea canales de potasio',
            dosis: '300 mg IV en el paro; 150 mg en 10 minutos si hay pulso',
            indicado: {
                ritmos: ['fv', 'tv_mono', 'tv_poli'],
                nota: 'Antiarrítmico de clase III: indicado en la FV/TV sin pulso refractaria a la desfibrilación y en la taquicardia ventricular con pulso.',
                resuelveA: 'sinusal',
                probabilidad: 0.6,
                efectos: { fc: -22, sis: -8, dia: -5, resumen: 'Enlentece la arritmia ventricular; la caída de presión es el precio conocido del bolo.' }
            },
            parcial: {
                ritmos: ['fa', 'flutter'],
                nota: 'Es una opción para el control del ritmo, pero antes hay que valorar el tiempo de evolución y el riesgo embólico.',
                efectos: { fc: -16, sis: -6, resumen: 'Baja la respuesta ventricular, pero la decisión de fondo sigue pendiente.' }
            },
            contraindicado: {
                ritmos: ['torsades', 'bradi_sinusal', 'bav2_1', 'bav2_2', 'bav3'],
                nota: 'Prolonga el QT y deprime la conducción. En Torsades de Pointes lo agrava — ahí el tratamiento es sulfato de magnesio — y en las bradicardias las empeora.',
                efectos: { fc: -12, sis: -14, dia: -8, resumen: 'Deprime todavía más la conducción y hunde la presión.' }
            },
            porDefecto: 'No hay arritmia ventricular que tratar en este ritmo.'
        },

        metoprolol: {
            nombre: 'Metoprolol',
            tipo: 'medicamento',
            clase: 'Betabloqueador beta-1 · clase II de Vaughan Williams',
            dosis: '2,5 a 5 mg IV lento en 2 minutos, repetible hasta 3 dosis',
            indicado: {
                ritmos: ['fa', 'flutter'],
                nota: 'Control agudo de la frecuencia ventricular en la fibrilación y el flutter con respuesta rápida, en el paciente estable. No restablece el ritmo sinusal: protege al ventrículo de la respuesta rápida y mejora el llenado diastólico.',
                efectos: { fc: -34, sis: -10, dia: -6, resumen: 'Cae la respuesta ventricular: el ventrículo vuelve a tener tiempo de llenarse.' }
            },
            parcial: {
                ritmos: ['taqui_sinusal'],
                nota: 'La taquicardia sinusal es una respuesta a algo —fiebre, dolor, hipovolemia, hipoxia—: frenarla sin tratar la causa quita el mecanismo de compensación.',
                efectos: { fc: -20, sis: -12, dia: -7, resumen: 'Baja la frecuencia, pero la causa que la provocaba sigue ahí.' }
            },
            contraindicado: {
                ritmos: ['bradi_sinusal', 'bav2_1', 'bav2_2', 'bav3', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'Es inotrópico negativo y bloquea el nodo AV: está contraindicado en la hipotensión, la bradicardia y el bloqueo AV de segundo o tercer grado sin marcapasos. La bradicardia que induce puede además facilitar las torsades en un QT largo.',
                efectos: { fc: -18, sis: -20, dia: -12, resumen: 'Frena un corazón que ya iba lento y le quita fuerza de contracción.' }
            },
            porDefecto: 'Su papel es el control de la frecuencia: no hay respuesta ventricular rápida que frenar en este ritmo.'
        },

        magnesio: {
            nombre: 'Sulfato de magnesio',
            tipo: 'medicamento',
            clase: 'Electrolito · suprime las posdespolarizaciones tempranas',
            dosis: '2 g IV, evitando la infusión excesivamente rápida',
            indicado: {
                ritmos: ['torsades'],
                nota: 'Estabiliza la membrana del miocito y suprime las posdespolarizaciones tempranas, que son el mecanismo de las torsades. Es eficaz incluso con magnesio sérico normal.',
                resuelveA: 'sinusal',
                probabilidad: 0.7,
                efectos: { sis: -6, dia: -4, resumen: 'Interrumpe el mecanismo de la arritmia; la infusión puede bajar algo la presión.' }
            },
            parcial: {
                ritmos: ['tv_poli'],
                nota: 'Solo es el tratamiento si el QT está prolongado. Con QT normal la causa más frecuente es la isquemia, y el magnesio no es la respuesta: mida el QT en el ritmo basal antes de elegir.',
                efectos: { sis: -5, resumen: 'Sin saber el QT no se puede dar por buena esta elección.' }
            },
            porDefecto: 'No se usa de rutina en el paro cardíaco ni fuera de la torsades: no ha demostrado mejorar el pronóstico.'
        },

        salina: {
            nombre: 'Solución salina',
            tipo: 'medicamento',
            clase: 'Cristaloide · carga de volumen',
            dosis: 'Bolo de 500-1000 mL IV',
            indicado: {
                ritmos: ['aesp'],
                nota: 'La hipovolemia es la primera de las H reversibles: la carga de volumen forma parte del manejo de la actividad eléctrica sin pulso.',
                resuelveA: 'sinusal',
                probabilidad: 0.4
            },
            parcial: {
                ritmos: ['bradi_sinusal', 'bav2_2', 'bav3', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'Como soporte de la hipotensión es razonable, pero no corrige la arritmia de fondo.',
                efectos: { sis: 12, dia: 7, resumen: 'La precarga mejora y la presión sube; el ritmo sigue igual.' }
            },
            porDefecto: 'Medida de soporte: no perjudica, pero no es lo que este ritmo necesita.'
        },

        // --- PROCEDIMIENTOS ---

        cardioversion: {
            nombre: 'Cardioversión',
            tipo: 'procedimiento',
            clase: 'Descarga sincronizada sobre el QRS',
            dosis: 'Sincronizada, 100-200 J',
            requiereCarga: true,
            indicado: {
                ritmos: ['fa', 'flutter', 'tv_mono'],
                nota: 'Taquiarritmia con pulso e inestabilidad hemodinámica: la descarga sincronizada sobre el QRS es el tratamiento.',
                resuelveA: 'sinusal',
                probabilidad: 0.7
            },
            contraindicado: {
                ritmos: ['fv', 'asistolia', 'aesp', 'tv_poli', 'torsades'],
                nota: 'No hay un QRS regular con el cual sincronizar. En FV y en la TV polimórfica se usa descarga NO sincronizada; en asistolia y AESP no se descarga en absoluto.'
            },
            porDefecto: 'No hay una taquiarritmia inestable que cardiovertir.'
        },

        desfibrilacion: {
            nombre: 'Desfibrilación',
            tipo: 'procedimiento',
            clase: 'Descarga no sincronizada',
            dosis: 'No sincronizada, 200 J bifásicos',
            requiereCarga: true,
            indicado: {
                ritmos: ['fv', 'tv_poli', 'torsades'],
                nota: 'Ritmo desfibrilable: la descarga inmediata no sincronizada es la única maniobra que revierte la fibrilación ventricular y la TV polimórfica.',
                resuelveA: 'sinusal',
                probabilidad: 0.6
            },
            contraindicado: {
                ritmos: ['asistolia', 'aesp'],
                nota: 'ERROR CRÍTICO: la asistolia y la AESP NO son ritmos desfibrilables. Descargar retrasa lo único que sirve — RCP de alta calidad y adrenalina.'
            },
            porDefecto: 'El paciente conserva un ritmo organizado con pulso: una descarga aquí puede provocarle un paro.'
        },

        marcapasos: {
            nombre: 'Marcapasos',
            tipo: 'procedimiento',
            clase: 'Estimulación transcutánea',
            dosis: 'Transcutáneo, iniciar a 60-80 lpm',
            indicado: {
                ritmos: ['bav2_2', 'bav3'],
                nota: 'Bloqueo infranodal: no responde a la atropina, y el marcapasos transcutáneo es la medida de elección mientras se prepara el transvenoso.',
                resuelveA: 'sinusal',
                probabilidad: 0.8,
                efectos: { fc: 32, sis: 18, dia: 10, resumen: 'La estimulación impone una frecuencia útil y la perfusión se recupera.' }
            },
            parcial: {
                ritmos: ['bradi_sinusal', 'bav2_1'],
                nota: 'Es la alternativa cuando la atropina ya falló, pero no es el primer paso en un bloqueo nodal.',
                efectos: { fc: 24, sis: 12, dia: 7, resumen: 'Funciona, pero se saltó el escalón que correspondía.' }
            },
            porDefecto: 'Solo tiene indicación frente a una bradicardia sintomática.'
        },

        oxigeno: {
            nombre: 'Oxígeno',
            tipo: 'procedimiento',
            clase: 'Soporte · titular a SpO₂ ≥ 94%',
            dosis: 'Titular para mantener SpO₂ ≥ 94%',
            indicado: {
                // Sin resuelveA: la oxigenoterapia acompaña al tratamiento, no
                // revierte por sí sola ninguna arritmia.
                ritmos: ['bradi_sinusal', 'bav2_1', 'bav2_2', 'bav3', 'taqui_sinusal', 'flutter', 'fa', 'tv_mono', 'tv_poli', 'torsades', 'fv', 'asistolia', 'aesp'],
                nota: 'Soporte correcto: toda arritmia con compromiso hemodinámico se acompaña de oxigenoterapia, aunque por sí sola no revierte el ritmo.',
                efectos: { spo2: 4, fr: -2, resumen: 'Mejora la saturación y el trabajo respiratorio; el ritmo no cambia.' }
            },
            parcial: {
                ritmos: ['sinusal', 'bav1', 'eap', 'ev'],
                nota: 'Con una saturación normal el oxígeno suplementario no aporta beneficio; titúlelo solo si la SpO₂ cae por debajo de 94%.',
                efectos: { spo2: 1, resumen: 'La saturación ya era normal: no hay nada que ganar.' }
            },
            porDefecto: 'Medida de soporte.'
        }
    };

    // Orden de comprobación: lo contraindicado manda sobre lo indicado, para
    // que un ritmo listado por error en ambos nunca se apruebe.
    const ORDEN_VEREDICTOS = ['contraindicado', 'indicado', 'parcial'];

    function evaluar(clave, ritmo) {
        const intervencion = INTERVENCIONES[clave];
        if (!intervencion) return null;

        for (let i = 0; i < ORDEN_VEREDICTOS.length; i++) {
            const veredicto = ORDEN_VEREDICTOS[i];
            const bloque = intervencion[veredicto];
            if (bloque && bloque.ritmos.indexOf(ritmo) !== -1) {
                return {
                    intervencion: intervencion,
                    veredicto: veredicto,
                    nota: bloque.nota,
                    resuelveA: bloque.resuelveA || null,
                    probabilidad: bloque.probabilidad || 0,
                    efectos: bloque.efectos || null
                };
            }
        }

        return {
            intervencion: intervencion,
            veredicto: 'incorrecto',
            nota: intervencion.porDefecto,
            resuelveA: null,
            probabilidad: 0,
            efectos: null
        };
    }

    MotorClinico.Intervenciones = {
        CATALOGO: INTERVENCIONES,
        evaluar: evaluar
    };

    // El catálogo de fármacos que 00-motor-clinico.js documenta como
    // MotorClinico.Medicamentos es el subconjunto de tipo 'medicamento'.
    MotorClinico.Medicamentos = Object.keys(INTERVENCIONES).reduce(function (acc, clave) {
        if (INTERVENCIONES[clave].tipo === 'medicamento') acc[clave] = INTERVENCIONES[clave];
        return acc;
    }, {});

})();

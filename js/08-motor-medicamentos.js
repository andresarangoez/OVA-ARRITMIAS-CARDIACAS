// ============================================================
// MOTOR DE INTERVENCIONES (antes: placeholder de Medicamentos)
// ============================================================
//
// Catálogo de las intervenciones que el estudiante puede aplicar sobre el
// paciente simulado, y la regla que decide si esa intervención está indicada
// para el ritmo que hay en pantalla en ese momento.
//
// Es la primera mitad de la Etapa 2.5 descrita en 00-motor-clinico.js: aquí
// vive el "qué es correcto y por qué". La cadena completa de efectos
// encadenados (fármaco → FC → TA → ECG) sigue pendiente en MotorClinico.Eventos;
// por ahora una intervención acertada puede reorganizar el ritmo, que es lo
// que el simulador necesita para dar retroalimentación.
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

(function () {

    const INTERVENCIONES = {

        // --- MEDICAMENTOS ---

        adenosina: {
            nombre: 'Adenosina',
            tipo: 'medicamento',
            dosis: '6 mg IV en bolo rápido, seguidos de 20 mL de solución salina',
            parcial: {
                ritmos: ['flutter'],
                nota: 'Tiene valor diagnóstico: enlentece la conducción AV y desenmascara las ondas F, pero no revierte el flutter.'
            },
            contraindicado: {
                ritmos: ['bradi_sinusal', 'bav1', 'bav2_1', 'bav2_2', 'bav3', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'Bloquea transitoriamente el nodo AV: agrava cualquier bradicardia y, en una taquicardia de complejo ancho, puede acelerar la respuesta ventricular.'
            },
            porDefecto: 'Se reserva para la taquicardia supraventricular regular de complejo angosto.'
        },

        atropina: {
            nombre: 'Atropina',
            tipo: 'medicamento',
            dosis: '1 mg IV cada 3-5 minutos (máximo 3 mg)',
            indicado: {
                ritmos: ['bradi_sinusal', 'bav2_1'],
                nota: 'Primera línea en la bradicardia sintomática de origen nodal: revierte el tono vagal y acelera la conducción por el nodo AV.',
                resuelveA: 'sinusal',
                probabilidad: 0.75
            },
            parcial: {
                ritmos: ['bav1', 'bav2_2', 'bav3'],
                nota: 'El bloqueo de 1er grado no requiere tratamiento. En Mobitz II y en el bloqueo completo la lesión es infranodal: la atropina rara vez responde y puede empeorar la relación de conducción. Prepare marcapasos.'
            },
            porDefecto: 'Solo tiene sentido frente a una bradicardia sintomática.'
        },

        adrenalina: {
            nombre: 'Adrenalina',
            tipo: 'medicamento',
            dosis: '1 mg IV cada 3-5 minutos durante el paro',
            indicado: {
                ritmos: ['fv', 'asistolia', 'aesp'],
                nota: 'Vasopresor de elección en el paro cardíaco: eleva la presión de perfusión coronaria mientras se mantiene la RCP de alta calidad.',
                resuelveA: 'sinusal',
                probabilidad: 0.35
            },
            parcial: {
                ritmos: ['bav2_2', 'bav3'],
                nota: 'En infusión (2-10 µg/min) es alternativa en la bradicardia refractaria, pero no sustituye al marcapasos.'
            },
            contraindicado: {
                ritmos: ['taqui_sinusal', 'flutter', 'fa', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'En un paciente que ya está taquicárdico aumenta el consumo miocárdico de oxígeno y es proarrítmica.'
            },
            porDefecto: 'Fuera del paro cardíaco y de la bradicardia refractaria no está indicada.'
        },

        amiodarona: {
            nombre: 'Amiodarona',
            tipo: 'medicamento',
            dosis: '300 mg IV en el paro; 150 mg en 10 minutos si hay pulso',
            indicado: {
                ritmos: ['fv', 'tv_mono', 'tv_poli'],
                nota: 'Antiarrítmico de clase III: indicado en la FV/TV sin pulso refractaria a la desfibrilación y en la taquicardia ventricular con pulso.',
                resuelveA: 'sinusal',
                probabilidad: 0.6
            },
            parcial: {
                ritmos: ['fa', 'flutter'],
                nota: 'Es una opción para el control del ritmo, pero antes hay que valorar el tiempo de evolución y el riesgo embólico.'
            },
            contraindicado: {
                ritmos: ['torsades', 'bradi_sinusal', 'bav2_1', 'bav2_2', 'bav3'],
                nota: 'Prolonga el QT y deprime la conducción. En Torsades de Pointes lo agrava — ahí el tratamiento es sulfato de magnesio — y en las bradicardias las empeora.'
            },
            porDefecto: 'No hay arritmia ventricular que tratar en este ritmo.'
        },

        salina: {
            nombre: 'Solución salina',
            tipo: 'medicamento',
            dosis: 'Bolo de 500-1000 mL IV',
            indicado: {
                ritmos: ['aesp'],
                nota: 'La hipovolemia es la primera de las H reversibles: la carga de volumen forma parte del manejo de la actividad eléctrica sin pulso.',
                resuelveA: 'sinusal',
                probabilidad: 0.4
            },
            parcial: {
                ritmos: ['bradi_sinusal', 'bav2_2', 'bav3', 'tv_mono', 'tv_poli', 'torsades'],
                nota: 'Como soporte de la hipotensión es razonable, pero no corrige la arritmia de fondo.'
            },
            porDefecto: 'Medida de soporte: no perjudica, pero no es lo que este ritmo necesita.'
        },

        // --- PROCEDIMIENTOS ---

        cardioversion: {
            nombre: 'Cardioversión',
            tipo: 'procedimiento',
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
            dosis: 'Transcutáneo, iniciar a 60-80 lpm',
            indicado: {
                ritmos: ['bav2_2', 'bav3'],
                nota: 'Bloqueo infranodal: no responde a la atropina, y el marcapasos transcutáneo es la medida de elección mientras se prepara el transvenoso.',
                resuelveA: 'sinusal',
                probabilidad: 0.8
            },
            parcial: {
                ritmos: ['bradi_sinusal', 'bav2_1'],
                nota: 'Es la alternativa cuando la atropina ya falló, pero no es el primer paso en un bloqueo nodal.'
            },
            porDefecto: 'Solo tiene indicación frente a una bradicardia sintomática.'
        },

        oxigeno: {
            nombre: 'Oxígeno',
            tipo: 'procedimiento',
            dosis: 'Titular para mantener SpO₂ ≥ 94%',
            indicado: {
                // Sin resuelveA: la oxigenoterapia acompaña al tratamiento, no
                // revierte por sí sola ninguna arritmia.
                ritmos: ['bradi_sinusal', 'bav2_1', 'bav2_2', 'bav3', 'taqui_sinusal', 'flutter', 'fa', 'tv_mono', 'tv_poli', 'torsades', 'fv', 'asistolia', 'aesp'],
                nota: 'Soporte correcto: toda arritmia con compromiso hemodinámico se acompaña de oxigenoterapia, aunque por sí sola no revierte el ritmo.'
            },
            parcial: {
                ritmos: ['sinusal', 'bav1', 'eap', 'ev'],
                nota: 'Con una saturación normal el oxígeno suplementario no aporta beneficio; titúlelo solo si la SpO₂ cae por debajo de 94%.'
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
                    probabilidad: bloque.probabilidad || 0
                };
            }
        }

        return {
            intervencion: intervencion,
            veredicto: 'incorrecto',
            nota: intervencion.porDefecto,
            resuelveA: null,
            probabilidad: 0
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

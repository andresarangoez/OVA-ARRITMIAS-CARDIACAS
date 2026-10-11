(function (OVA) {
    OVA.TableroFarmacos = OVA.TableroFarmacos || {};

    // --- TABLERO DE INTERVENCIONES FARMACOLÓGICAS ---
    //
    // Acompaña al simulador: mientras el estudiante elige una intervención y
    // el registro le dice si estaba indicada, este tablero es donde consulta
    // POR QUÉ. No decide nada ni se adapta al ritmo que hay en pantalla, y es
    // deliberado: el panel de intervenciones del simulador ya evita mostrar
    // solo las opciones válidas para no delatar la respuesta, y un tablero que
    // señalara el fármaco correcto del ritmo actual haría justo eso.
    //
    // TODO el contenido clínico procede de la Unidad 2 del Módulo 05
    // (modules/modulo-05.html), que a su vez viene del documento académico del
    // proyecto. Las tablas de síntesis 2.2 a 2.7, la tabla 2.9 de
    // administración y el apartado 2.9 de cuidados son la fuente literal de
    // cada campo. No hay ninguna dosis ni contraindicación añadida aquí: si un
    // dato no está en el módulo, no aparece en el tablero.
    //
    // Los números entre paréntesis son las citas del módulo; FUENTES traduce
    // los que se usan en esta unidad para que la referencia se pueda leer sin
    // salir del tablero.

    const FUENTES = {
        1:  'AHA. Aspectos destacados de las Guías 2025 para RCP y ACE.',
        2:  'AHA. Highlights of the 2025 Guidelines for CPR and ECC.',
        3:  'Wigginton JG, et al. Part 9: Adult advanced life support. Circulation. 2025.',
        4:  'Joglar JA, et al. 2023 ACC/AHA guideline for atrial fibrillation. Circulation. 2024.',
        7:  'AHA. Adult tachyarrhythmia with a pulse algorithm. 2025.',
        8:  'AHA. Adult bradycardia with a pulse algorithm. 2025.',
        9:  'Kusumoto FM, et al. 2018 ACC/AHA/HRS guideline on bradycardia. Circulation. 2019.',
        10: 'Page RL, et al. 2015 ACC/AHA/HRS guideline for supraventricular tachycardia. Circulation. 2016.',
        11: 'Lei M, et al. Modernized classification of cardiac antiarrhythmic drugs. Circulation. 2018.',
        12: 'AHA. Adult cardiac arrest algorithm. 2025.',
        13: 'Drew BJ, et al. Prevention of torsade de pointes in hospital settings. Circulation. 2010.'
    };

    // Escenarios del filtro. Las claves de `ritmos` son las mismas de
    // RITMOS_DB (01-data-ritmos.js), para que el tablero y el selector del
    // simulador hablen el mismo idioma.
    const ESCENARIOS = [
        { id: 'todos',     rotulo: 'Todos' },
        { id: 'bradi',     rotulo: 'Bradicardia' },
        { id: 'estrecha',  rotulo: 'Taquicardia estrecha' },
        { id: 'ancha',     rotulo: 'Taquicardia ancha' },
        { id: 'fa',        rotulo: 'FA y flutter' },
        { id: 'paro',      rotulo: 'Paro cardíaco' },
        { id: 'torsades',  rotulo: 'Torsades de pointes' }
    ];

    const FARMACOS = [
        {
            id: 'atropina',
            nombre: 'Atropina',
            grupo: 'Antagonista muscarínico (anticolinérgico)',
            clase: 'Fuera de la clasificación de Vaughan Williams',
            escenarios: ['bradi'],
            mecanismo: 'Bloquea la acción de la acetilcolina sobre los nodos sinusal y auriculoventricular, es decir, retira el freno vagal. Aumenta la frecuencia de descarga del nodo sinusal y mejora la conducción por el nodo AV. De ahí su límite: solo es eficaz donde llega el control vagal, así que en los bloqueos infranodales (haz de His o sus ramas) tiene poco o ningún efecto.',
            indicaciones: [
                { texto: 'Fármaco inicial en la bradicardia sintomática con compromiso cardiopulmonar.', cita: '3,8' },
                { texto: 'Disfunción del nodo sinusal con síntomas o compromiso hemodinámico, y bloqueos AV de segundo o tercer grado que se consideran nodales.', cita: '9' }
            ],
            ritmos: 'Bradicardia sinusal; bloqueo AV de segundo grado Mobitz I. De escasa eficacia en Mobitz II y en el bloqueo completo con QRS ancho.',
            dosis: [
                { escenario: 'Bradicardia sintomática', pauta: '1 mg', via: 'IV en bolo', intervalo: 'Cada 3 a 5 minutos', maxima: '3 mg en total', cita: '8' }
            ],
            siNoResponde: 'Marcapasos transcutáneo o infusión de dopamina o adrenalina; si la bradicardia inestable persiste, es razonable el marcapasos transvenoso temporal (1,2,8).',
            contraindicaciones: [
                { texto: 'Trasplante cardíaco sin evidencia de reinervación autonómica: el corazón trasplantado carece de inervación vagal y se han descrito respuestas paradójicas.', cita: '9' }
            ],
            precauciones: [
                { texto: 'En bloqueos infranodales (Mobitz II, bloqueo completo con QRS ancho) es poco probable que funcione y no debe retrasar el marcapasos.' },
                { texto: 'En isquemia miocárdica, el aumento de frecuencia eleva el consumo de oxígeno y puede agravar la isquemia o favorecer taquiarritmias.' },
                { texto: 'Muchas bradicardias tienen causa tratable —isquemia, hipoxia, hiperpotasemia, toxicidad por betabloqueadores, calcioantagonistas o digoxina—, cuyo tratamiento importa tanto como subir la frecuencia.', cita: '8,9' }
            ],
            adversos: 'Taquicardia, aumento del consumo miocárdico de oxígeno y efectos anticolinérgicos: sequedad de mucosas, retención urinaria, visión borrosa y confusión, sobre todo en el adulto mayor.',
            vigilancia: 'Frecuencia cardíaca y, sobre todo, mejoría de los signos de compromiso: presión arterial, estado de conciencia y perfusión. También dolor torácico y efectos anticolinérgicos.',
            tecnica: 'Bolo IV; repetir cada 3 a 5 minutos hasta la dosis máxima (8).',
            referencias: [3, 8, 9]
        },

        {
            id: 'adenosina',
            nombre: 'Adenosina',
            grupo: 'Nucleósido con efecto antiarrítmico',
            clase: 'Fuera de la clasificación de Vaughan Williams',
            escenarios: ['estrecha', 'ancha', 'fa'],
            mecanismo: 'Nucleósido endógeno que produce un bloqueo transitorio de la conducción por el nodo auriculoventricular y disminuye el automatismo. Su vida media es de unos segundos, lo que explica a la vez su seguridad relativa y la exigencia de una técnica precisa: si no llega al corazón en bolo rápido, se degrada antes de actuar. El efecto depende del mecanismo de la taquicardia: si el nodo AV forma parte del circuito de reentrada, lo interrumpe y la taquicardia termina; si el circuito es auricular e independiente del nodo, no la termina, pero desenmascara la actividad auricular y sirve para el diagnóstico.',
            indicaciones: [
                { texto: 'Tratamiento agudo de las taquicardias regulares de complejo estrecho en el adulto, junto con las maniobras vagales.', cita: '3,10' },
                { texto: 'Taquicardia de complejo ancho estable, regular y monomórfica: puede considerarse con fines terapéuticos o para facilitar el diagnóstico cuando el origen no puede determinarse.', cita: '3' },
                { texto: 'En el paciente inestable con taquicardia regular de complejo estrecho, puede considerarse mientras se prepara la cardioversión sincronizada, sin retrasarla.', cita: '7' }
            ],
            ritmos: 'Taquicardia supraventricular regular de complejo estrecho. En el flutter y la fibrilación auricular no revierte la arritmia: enlentece la respuesta ventricular y deja ver las ondas auriculares.',
            dosis: [
                { escenario: 'Primera dosis', pauta: '6 mg', via: 'IV en bolo rápido, seguido de lavado con solución salina', intervalo: '—', maxima: '—', cita: '7' },
                { escenario: 'Segunda dosis, si es necesaria', pauta: '12 mg', via: 'IV en bolo rápido con lavado', intervalo: '—', maxima: '—', cita: '7' },
                { escenario: 'Vía central o trasplante cardíaco', pauta: '1 mg puede bastar', via: 'IV en bolo rápido', intervalo: '—', maxima: '—', cita: '3' }
            ],
            contraindicaciones: [
                { texto: 'Taquicardia de complejo ancho inestable, irregular o polimórfica: no termina las de origen ventricular y puede producir hipotensión profunda o precipitar una fibrilación ventricular. Incluye la fibrilación auricular preexcitada, que se manifiesta como taquicardia de complejo ancho irregular.', cita: '3' },
                { texto: 'Asma, por el riesgo de broncoespasmo grave.', cita: '3' }
            ],
            precauciones: [
                { texto: 'El dipiridamol y la carbamazepina potencian su efecto; la teofilina y la cafeína lo reducen. Hay que tenerlo en cuenta ante una respuesta mayor o menor de la esperada.' },
                { texto: 'Pueden observarse pausas breves o asistolia transitoria antes de que se recupere el ritmo: debe disponerse del equipo de reanimación.' }
            ],
            adversos: 'Rubor, opresión torácica, disnea y una sensación transitoria de muerte inminente. Conviene advertirlo antes de inyectar: su aparición indica que la dosis ha sido adecuada (3).',
            vigilancia: 'Registro electrocardiográfico continuo durante la administración —el trazado obtenido puede ser determinante para el diagnóstico—, presión arterial y síntomas.',
            tecnica: 'Bolo IV rápido en vena proximal, preferentemente antecubital, seguido de inmediato por solución salina; habitualmente con llave de tres vías para administrar el bolo y el lavado de forma consecutiva (7).',
            referencias: [3, 7, 10]
        },

        {
            id: 'amiodarona',
            nombre: 'Amiodarona',
            grupo: 'Antiarrítmico de clase III, con propiedades de las cuatro clases',
            clase: 'Clase III de Vaughan Williams',
            escenarios: ['ancha', 'fa', 'paro'],
            mecanismo: 'Su efecto predominante es el bloqueo de los canales de potasio, que prolonga la repolarización y el período refractario auricular y ventricular. También bloquea canales de sodio y de calcio y tiene efecto antiadrenérgico. Ese perfil amplio explica su utilidad en arritmias auriculares y ventriculares, y también la variedad de sus efectos adversos. Por vía intravenosa su inicio de acción es relativamente lento, de modo que no es el tratamiento adecuado cuando hay que terminar de inmediato una arritmia en un paciente inestable: ahí la terapia eléctrica tiene prioridad.',
            indicaciones: [
                { texto: 'En el paro cardíaco: fibrilación ventricular o taquicardia ventricular sin pulso que no responden a la desfibrilación. Complementa, nunca reemplaza, la reanimación de alta calidad y la desfibrilación.', cita: '3,12' },
                { texto: 'En el paciente con pulso: taquicardia de complejo ancho hemodinámicamente estable.', cita: '3' },
                { texto: 'Recurrencias de taquicardia ventricular polimórfica no asociada a QT prolongado, junto con el tratamiento de la isquemia.', cita: '3' },
                { texto: 'Control agudo de la frecuencia en la fibrilación auricular.', cita: '4' }
            ],
            ritmos: 'FV y TV sin pulso refractarias a la descarga; taquicardia de complejo ancho estable; TV polimórfica con QT normal; fibrilación auricular.',
            dosis: [
                { escenario: 'Paro cardíaco', pauta: '300 mg, segunda dosis de 150 mg', via: 'IV o IO en bolo', intervalo: '—', maxima: '—', cita: '12' },
                { escenario: 'Taquicardia de complejo ancho estable', pauta: '150 mg en 10 minutos, repetibles si recurre', via: 'IV, luego infusión de mantenimiento', intervalo: '1 mg/min durante las primeras 6 horas', maxima: '—', cita: '7' },
                { escenario: 'Control de frecuencia en la FA', pauta: '150 a 300 mg en 1 hora', via: 'IV en infusión', intervalo: 'Después, 10 a 50 mg/h durante 24 horas', maxima: '—', cita: '4' }
            ],
            avisoDosis: 'Las dosis difieren de manera sustancial según el escenario, y esa diferencia es una fuente frecuente de error.',
            contraindicaciones: [],
            precauciones: [
                { texto: 'Evitar su administración simultánea con otros antiarrítmicos, como la procainamida o el sotalol: sus efectos combinados pueden ser arritmogénicos.', cita: '3' },
                { texto: 'Durante su administración debe disponerse de un desfibrilador: puede transformar una taquicardia de complejo ancho en una forma más rápida e inestable.', cita: '3' },
                { texto: 'Vigilar la aparición de torsades de pointes, sobre todo junto a otros fármacos que prolongan el QT o con hipopotasemia o hipomagnesemia.' },
                { texto: 'Por vía periférica puede producir flebitis: se prefiere el acceso central en las infusiones prolongadas.' },
                { texto: 'Interacciones relevantes: aumenta el efecto de la warfarina y las concentraciones de digoxina.' }
            ],
            adversos: 'Agudos: hipotensión —en parte por los solventes de la formulación intravenosa—, bradicardia, bloqueo AV, prolongación del QT y flebitis. A largo plazo: toxicidad tiroidea, pulmonar y hepática.',
            vigilancia: 'Presión arterial, frecuencia cardíaca, intervalo PR, duración del QRS y del QTc, y sitio de inserción del catéter. En el paro, registro exacto de la hora y la dosis de cada administración para respetar el intervalo entre dosis.',
            tecnica: 'Bolo en el paro; en el paciente con pulso, carga en 10 minutos e infusión con bomba (7,12).',
            referencias: [3, 4, 7, 12]
        },

        {
            id: 'adrenalina',
            nombre: 'Adrenalina (epinefrina)',
            grupo: 'Catecolamina; agonista alfa y beta-adrenérgico',
            clase: 'No es un antiarrítmico',
            escenarios: ['paro', 'bradi'],
            mecanismo: 'Estimula los receptores alfa y beta. El efecto alfa produce vasoconstricción periférica, lo que eleva la resistencia vascular sistémica y, durante la reanimación, aumenta la presión de perfusión coronaria, uno de los determinantes principales del retorno de la circulación espontánea. El efecto beta aumenta la frecuencia cardíaca, la velocidad de conducción y la contractilidad. No se considera un antiarrítmico, pero ocupa un lugar central por su papel en dos escenarios: el paro cardíaco y la bradicardia que no responde a la atropina.',
            indicaciones: [
                { texto: 'Todo paro cardíaco en el adulto. Aumenta el retorno de la circulación espontánea y la supervivencia a corto plazo, aunque no se ha demostrado que mejore el pronóstico neurológico.', cita: '3' },
                { texto: 'En ritmos no desfibrilables (asistolia, AESP) es razonable administrarla lo antes posible.', cita: '3' },
                { texto: 'En ritmos desfibrilables la prioridad es la desfibrilación rápida; es razonable administrarla después de que fracasen los intentos iniciales.', cita: '1,2,3' },
                { texto: 'Bradicardia sintomática que no responde a la atropina, como alternativa al marcapasos transcutáneo o a la dopamina.', cita: '8' }
            ],
            ritmos: 'FV, TV sin pulso, asistolia y AESP. Bradicardia sintomática refractaria a la atropina.',
            dosis: [
                { escenario: 'Paro cardíaco', pauta: '1 mg', via: 'IV o IO', intervalo: 'Cada 3 a 5 minutos (equivale a cada dos ciclos de RCP tras la dosis inicial)', maxima: 'No se recomienda el uso rutinario de dosis altas', cita: '3,12' },
                { escenario: 'Bradicardia sintomática', pauta: '2 a 10 mcg/min', via: 'Infusión IV con bomba', intervalo: 'Ajustada según la respuesta', maxima: '—', cita: '8' }
            ],
            avisoDosis: 'Un bolo de 1 mg en el paro frente a una infusión de microgramos por minuto en la bradicardia: la diferencia obliga a extremar la verificación de dosis, dilución y vía antes de administrar.',
            contraindicaciones: [],
            precauciones: [
                { texto: 'En el paciente con pulso puede producir taquicardia, taquiarritmias ventriculares, hipertensión e isquemia miocárdica.' },
                { texto: 'La extravasación causa necrosis tisular por vasoconstricción local: las infusiones deben ir por un acceso venoso seguro, preferentemente central, con vigilancia frecuente del sitio.' },
                { texto: 'La vasopresina, sola o combinada, no ofrece ninguna ventaja como sustituto de la adrenalina.', cita: '1,2' }
            ],
            adversos: 'Taquicardia, taquiarritmias ventriculares, hipertensión, isquemia miocárdica y necrosis por extravasación.',
            vigilancia: 'En el paro, cumplimiento del intervalo entre dosis y registro exacto de cada administración. En la infusión para bradicardia, monitorización continua de frecuencia, ritmo, presión arterial y signos de isquemia, ajustando la dosis según la respuesta clínica.',
            tecnica: 'Bolo IV o IO en el paro; infusión con bomba en la bradicardia (8,12).',
            referencias: [1, 2, 3, 8, 12]
        },

        {
            id: 'metoprolol',
            nombre: 'Metoprolol',
            grupo: 'Betabloqueador cardioselectivo (beta-1)',
            clase: 'Clase II de Vaughan Williams (11)',
            escenarios: ['fa', 'estrecha'],
            mecanismo: 'Actúa de manera preferente sobre los receptores beta-1 del corazón. Al bloquear el efecto de las catecolaminas sobre los nodos sinusal y auriculoventricular, disminuye la frecuencia de descarga sinusal, enlentece la conducción por el nodo AV y prolonga su período refractario. Su efecto en el tratamiento agudo no consiste en eliminar la arritmia auricular, sino en reducir el número de impulsos que alcanzan los ventrículos. Esa distinción entre control de la frecuencia y control del ritmo es esencial: en la FA y el flutter no restablece el ritmo sinusal, sino que protege a los ventrículos de una respuesta rápida, mejora el llenado diastólico y reduce el consumo miocárdico de oxígeno.',
            indicaciones: [
                { texto: 'Control agudo de la frecuencia ventricular en la fibrilación y el flutter auricular con respuesta ventricular rápida, en el paciente hemodinámicamente estable.', cita: '4' },
                { texto: 'Taquicardia regular de complejo estrecho que no responde a las maniobras vagales ni a la adenosina: los betabloqueadores intravenosos son una alternativa generalmente segura.', cita: '3,10' }
            ],
            ritmos: 'Fibrilación y flutter auricular con respuesta ventricular rápida; taquicardia supraventricular regular refractaria a vagales y adenosina. La inestabilidad hemodinámica atribuible a la taquicardia desplaza la indicación hacia la cardioversión eléctrica.',
            dosis: [
                { escenario: 'Control agudo de la frecuencia', pauta: '2,5 a 5 mg', via: 'IV lento, en 2 minutos', intervalo: 'Repetible hasta completar 3 dosis, reevaluando frecuencia y presión entre cada una', maxima: '3 dosis', cita: '4' }
            ],
            alternativas: 'Con el mismo propósito se usan el esmolol (bolo de 500 µg/kg en 1 minuto seguido de infusión de 50 a 300 µg/kg/min), cuya vida media breve lo hace útil cuando se desea un efecto fácilmente reversible, y los calcioantagonistas no dihidropiridínicos de clase IV: diltiazem (0,25 mg/kg en 2 minutos) y verapamilo (5 a 10 mg en al menos 2 minutos) (4).',
            contraindicaciones: [
                { texto: 'Insuficiencia cardíaca descompensada: el efecto inotrópico negativo puede agravar el bajo gasto.', cita: '4' },
                { texto: 'Hipotensión, bradicardia sinusal y bloqueo AV de segundo o tercer grado sin marcapasos.', cita: '4' },
                { texto: 'Fibrilación auricular preexcitada (con vía accesoria): bloquear el nodo AV puede favorecer la conducción por la vía accesoria y precipitar una fibrilación ventricular.', cita: '4' }
            ],
            precauciones: [
                { texto: 'Broncoespasmo activo: la cardioselectividad reduce el riesgo de broncoconstricción, pero no lo elimina.' },
                { texto: 'Evitar la combinación intravenosa con bloqueadores de los canales de calcio, por el riesgo de bradicardia grave, bloqueo e hipotensión.' },
                { texto: 'La bradicardia que inducen estos fármacos puede facilitar torsades de pointes en el paciente con QT prolongado.', cita: '3' }
            ],
            adversos: 'Bradicardia, hipotensión, bloqueo AV, broncoespasmo y empeoramiento de la insuficiencia cardíaca.',
            vigilancia: 'Ritmo y frecuencia cardíaca de forma continua, presión arterial, signos de hipoperfusión o de congestión pulmonar y —en el paciente con antecedentes respiratorios— sibilancias o disnea. El ECG permite reconocer la prolongación del PR y la aparición de bloqueos AV.',
            tecnica: 'Bolo IV lento en 2 minutos; reevaluar antes de cada dosis. Suspender si aparecen hipotensión o bradicardia (4).',
            referencias: [3, 4, 10, 11]
        },

        {
            id: 'magnesio',
            nombre: 'Sulfato de magnesio',
            grupo: 'Electrolito',
            clase: 'Fuera de la clasificación de Vaughan Williams',
            escenarios: ['torsades'],
            mecanismo: 'Catión intracelular que participa en la bomba de sodio y potasio y modula el paso de calcio a través de la membrana. Estabiliza la membrana del miocito y suprime las posdespolarizaciones tempranas, que son el mecanismo desencadenante de las torsades de pointes. Por eso es eficaz para interrumpir esta arritmia incluso con una concentración sérica normal de magnesio. Además, su déficit favorece la pérdida renal de potasio y dificulta corregirlo: en el paciente con hipopotasemia, reponer magnesio suele ser condición para normalizar el potasio.',
            indicaciones: [
                { texto: 'Taquicardia ventricular polimórfica asociada a intervalo QT prolongado, es decir, torsades de pointes.', cita: '3' }
            ],
            noIndicado: [
                { texto: 'Uso rutinario en el paro cardíaco: no ha demostrado mejorar el pronóstico.', cita: '3' },
                { texto: 'Taquicardia ventricular polimórfica con QT normal, cuya causa más frecuente es la isquemia miocárdica. De ahí la necesidad de medir el QT en el ritmo basal, cuando hay registro previo, antes de elegir el tratamiento.', cita: '3' }
            ],
            ritmos: 'Torsades de pointes. Cuando hay paro cardíaco por torsades, el tratamiento prioritario es la desfibrilación y el magnesio es un complemento.',
            dosis: [
                { escenario: 'Torsades de pointes', pauta: '2 g de sulfato de magnesio', via: 'IV, evitando la infusión excesivamente rápida', intervalo: 'Repetible si la arritmia persiste o recurre', maxima: '—', cita: '13' }
            ],
            medidasAsociadas: 'De manera simultánea: suspender los fármacos que prolongan el QT, tratar la bradicardia y mantener el potasio sérico entre 4,5 y 5 mmol/L (13). En las torsades recurrentes desencadenadas por bradicardia, aumentar la frecuencia con estimulación eléctrica temporal acorta el QT y previene nuevos episodios.',
            contraindicaciones: [],
            precauciones: [
                { texto: 'La administración rápida puede producir rubor, sensación de calor, hipotensión y bradicardia.' },
                { texto: 'En insuficiencia renal la eliminación está disminuida y aumenta el riesgo de hipermagnesemia: hiporreflexia, somnolencia, depresión respiratoria y, en casos graves, trastornos de la conducción y paro cardíaco. El calcio intravenoso es el antídoto de la hipermagnesemia sintomática.' }
            ],
            adversos: 'Rubor, calor, hipotensión y bradicardia por administración rápida. Hipermagnesemia en la insuficiencia renal.',
            vigilancia: 'QTc, presión arterial, frecuencia cardíaca y respiratoria, reflejos osteotendinosos y diuresis. En el paciente hospitalizado con fármacos que prolongan el QT, un QTc superior a 500 ms —o un aumento de 60 ms o más sobre el basal— indica riesgo elevado y obliga a actuar (13).',
            tecnica: 'Administración IV; evitar la infusión excesivamente rápida (13).',
            referencias: [3, 13]
        }
    ];

    // Cuidados comunes a todos los fármacos (apartado 2.9 del módulo). Se
    // muestran una sola vez, fuera de las pestañas: repetirlos en cada ficha
    // los convertiría en ruido y escondería lo que sí es propio de cada uno.
    const CUIDADOS = [
        {
            momento: 'Antes',
            puntos: [
                'Valorar conciencia, signos vitales, perfusión y síntomas; ECG de 12 derivaciones cuando la condición lo permita.',
                'Revisar los antecedentes que cambian la elección o la dosis: insuficiencia cardíaca, asma o EPOC, insuficiencia renal, trasplante cardíaco y fármacos que prolongan el QT, además del potasio y el magnesio recientes.',
                'Garantizar acceso venoso permeable y de calibre adecuado, monitorización continua del ritmo y desfibrilador y material de reanimación disponibles.',
                'Verificar la prescripción: fármaco, dosis, concentración de la presentación, vía, velocidad y paciente. Verificación independiente por un segundo profesional en infusiones continuas y en dosis calculadas por peso.',
                'Explicar al paciente consciente el procedimiento y las sensaciones que puede notar, como ocurre con la adenosina.'
            ]
        },
        {
            momento: 'Durante',
            puntos: [
                'Atender al monitor y al paciente a la vez: cambios de ritmo, frecuencia y presión arterial, y síntomas como mareo, disnea o dolor torácico.',
                'Ajustar la velocidad de administración a la indicada para cada fármaco.',
                'Suspender y comunicar de inmediato ante hipotensión, bradicardia grave o aparición de una arritmia ventricular.',
                'En el paro cardíaco, registrar la hora exacta de cada dosis para respetar los intervalos.',
                'Usar comunicación de circuito cerrado: quien administra repite en voz alta la orden recibida antes de ejecutarla.'
            ]
        },
        {
            momento: 'Después',
            puntos: [
                'Evaluar la respuesta: si la arritmia se interrumpió o si la frecuencia alcanzó el objetivo.',
                'Vigilar los efectos adversos propios de cada fármaco.',
                'Registrar un nuevo ECG para documentar el ritmo resultante y medir los intervalos.',
                'Documentar fármaco, dosis, hora, vía, respuesta observada y cualquier evento adverso.',
                'Educar al paciente y a la familia sobre los síntomas de alarma y el tratamiento que continúe.'
            ]
        }
    ];

    // --- CONSTRUCCIÓN ---

    function esc(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Marca de cita: "(3,8)". Se deja como texto, no como enlace, porque la
    // bibliografía completa vive al final del módulo y el tablero puede
    // abrirse desde módulos distintos.
    function cita(c) {
        return c ? ' <span class="tf-cita">(' + esc(c) + ')</span>' : '';
    }

    function lista(items, clase) {
        if (!items || !items.length) return '';
        return '<ul class="' + clase + '">' + items.map(function (i) {
            return '<li>' + esc(i.texto) + cita(i.cita) + '</li>';
        }).join('') + '</ul>';
    }

    function bloque(titulo, contenido, modificador) {
        if (!contenido) return '';
        return '<section class="tf-bloque' + (modificador ? ' tf-bloque--' + modificador : '') + '">'
             + '<h5 class="tf-bloque-titulo">' + esc(titulo) + '</h5>'
             + contenido + '</section>';
    }

    function tablaDosis(f) {
        const filas = f.dosis.map(function (d) {
            return '<tr>'
                 + '<th scope="row">' + esc(d.escenario) + '</th>'
                 + '<td><strong>' + esc(d.pauta) + '</strong>' + cita(d.cita) + '</td>'
                 + '<td>' + esc(d.via) + '</td>'
                 + '<td>' + esc(d.intervalo) + '</td>'
                 + '<td>' + esc(d.maxima) + '</td>'
                 + '</tr>';
        }).join('');
        return '<div class="tf-tabla-scroll"><table class="tf-tabla">'
             + '<thead><tr><th scope="col">Escenario</th><th scope="col">Dosis</th>'
             + '<th scope="col">Vía y velocidad</th><th scope="col">Repetición</th>'
             + '<th scope="col">Máximo acumulado</th></tr></thead>'
             + '<tbody>' + filas + '</tbody></table></div>'
             + (f.avisoDosis ? '<p class="tf-aviso"><strong>Atención:</strong> ' + esc(f.avisoDosis) + '</p>' : '');
    }

    function panelFarmaco(f) {
        let html = '<div class="tf-encabezado">'
                 + '<h4 class="tf-nombre">' + esc(f.nombre) + '</h4>'
                 + '<p class="tf-grupo">' + esc(f.grupo) + ' · ' + esc(f.clase) + '</p>'
                 + '</div>';

        html += bloque('Mecanismo de acción', '<p>' + esc(f.mecanismo) + '</p>');
        html += bloque('Indicaciones', lista(f.indicaciones, 'tf-lista'));
        html += bloque('Ritmos en los que se utiliza', '<p>' + esc(f.ritmos) + '</p>');
        html += bloque('Dosificación en el adulto', tablaDosis(f));

        if (f.siNoResponde)      html += bloque('Si no hay respuesta', '<p>' + esc(f.siNoResponde) + '</p>');
        if (f.alternativas)      html += bloque('Otros fármacos con el mismo propósito', '<p>' + esc(f.alternativas) + '</p>');
        if (f.medidasAsociadas)  html += bloque('Medidas que lo acompañan', '<p>' + esc(f.medidasAsociadas) + '</p>');

        if (f.contraindicaciones && f.contraindicaciones.length) {
            html += bloque('Contraindicaciones', lista(f.contraindicaciones, 'tf-lista'), 'alerta');
        }
        if (f.noIndicado && f.noIndicado.length) {
            html += bloque('Situaciones en que NO está indicado', lista(f.noIndicado, 'tf-lista'), 'alerta');
        }
        html += bloque('Precauciones', lista(f.precauciones, 'tf-lista'), 'aviso');
        html += bloque('Efectos adversos', '<p>' + esc(f.adversos) + '</p>');
        html += bloque('Monitorización requerida', '<p>' + esc(f.vigilancia) + '</p>');
        html += bloque('Técnica de administración', '<p>' + esc(f.tecnica) + '</p>');

        html += '<section class="tf-bloque tf-referencias">'
             + '<h5 class="tf-bloque-titulo">Referencias</h5><ol class="tf-refs">'
             + f.referencias.map(function (n) {
                 return '<li value="' + n + '">' + esc(FUENTES[n] || ('Referencia ' + n)) + '</li>';
               }).join('')
             + '</ol></section>';

        return html;
    }

    function panelCuidados() {
        return '<div class="tf-encabezado">'
             + '<h4 class="tf-nombre">Cuidados de enfermería</h4>'
             + '<p class="tf-grupo">Comunes a todos los fármacos de la unidad</p>'
             + '</div>'
             + CUIDADOS.map(function (c) {
                 return bloque(c.momento + ' de la administración',
                     '<ul class="tf-lista">' + c.puntos.map(function (p) {
                         return '<li>' + esc(p) + '</li>';
                     }).join('') + '</ul>');
               }).join('')
             + bloque('Durante la administración de cualquier antiarrítmico',
                 '<p>Debe disponerse de un desfibrilador y del material de reanimación: el propio fármaco puede desencadenar una bradicardia grave o una arritmia ventricular' + cita('3') + '</p>', 'aviso');
    }

    function construir(raiz) {
        const navBotones = FARMACOS.map(function (f, i) {
            return '<button type="button" role="tab" data-farmaco="' + f.id + '"'
                 + ' aria-selected="' + (i === 0 ? 'true' : 'false') + '"'
                 + ' aria-controls="tf-panel-' + f.id + '"'
                 + (i === 0 ? ' class="activo"' : '') + '>' + esc(f.nombre) + '</button>';
        }).join('') + '<button type="button" role="tab" data-farmaco="cuidados"'
                    + ' aria-selected="false" aria-controls="tf-panel-cuidados">Cuidados de enfermería</button>';

        const paneles = FARMACOS.map(function (f, i) {
            return '<div class="tabs-panel' + (i === 0 ? ' activo' : '') + '" id="tf-panel-' + f.id + '"'
                 + ' role="tabpanel" tabindex="0">' + panelFarmaco(f) + '</div>';
        }).join('') + '<div class="tabs-panel" id="tf-panel-cuidados" role="tabpanel" tabindex="0">'
                    + panelCuidados() + '</div>';

        const filtros = ESCENARIOS.map(function (e, i) {
            return '<button type="button" class="tf-filtro' + (i === 0 ? ' activo' : '') + '"'
                 + ' data-escenario="' + e.id + '" aria-pressed="' + (i === 0) + '">'
                 + esc(e.rotulo) + '</button>';
        }).join('');

        raiz.innerHTML =
            '<div class="tf-cabecera">'
          + '  <h3>Tablero de intervenciones farmacológicas</h3>'
          + '  <p class="tf-intro">Los seis fármacos de la Unidad 2 del Módulo 05, con su mecanismo, sus dosis por escenario, sus contraindicaciones y la monitorización que exigen. Filtra por situación clínica o abre la ficha que necesites.</p>'
          + '</div>'
          + '<div class="tf-filtros" role="group" aria-label="Filtrar por situación clínica">'
          + '  <span class="tf-filtros-rotulo">Situación:</span>' + filtros
          + '</div>'
          + '<p class="tf-sin-resultados" hidden>Ningún fármaco de la unidad corresponde a esa situación.</p>'
          + '<div class="tabs tf-tabs">'
          + '  <div class="tabs-nav" role="tablist" aria-label="Fármacos">' + navBotones + '</div>'
          + paneles
          + '</div>';
    }

    // --- COMPORTAMIENTO ---

    function activar(raiz) {
        const nav = raiz.querySelector('.tabs-nav');
        const tabs = raiz.querySelector('.tf-tabs');

        function mostrar(id) {
            nav.querySelectorAll('button').forEach(function (b) {
                const activo = b.dataset.farmaco === id;
                b.classList.toggle('activo', activo);
                b.setAttribute('aria-selected', String(activo));
            });
            tabs.querySelectorAll('.tabs-panel').forEach(function (p) {
                p.classList.toggle('activo', p.id === 'tf-panel-' + id);
            });
        }

        nav.addEventListener('click', function (e) {
            const b = e.target.closest('button[data-farmaco]');
            if (b) mostrar(b.dataset.farmaco);
        });

        // Flechas entre pestañas, como espera un tablist accesible.
        nav.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const visibles = [].slice.call(nav.querySelectorAll('button:not([hidden])'));
            const i = visibles.indexOf(document.activeElement);
            if (i < 0) return;
            e.preventDefault();
            const siguiente = visibles[(i + (e.key === 'ArrowRight' ? 1 : -1) + visibles.length) % visibles.length];
            siguiente.focus();
            mostrar(siguiente.dataset.farmaco);
        });

        // El filtro esconde las pestañas que no corresponden a la situación.
        // La de cuidados de enfermería no se filtra: vale para todas.
        raiz.querySelector('.tf-filtros').addEventListener('click', function (e) {
            const b = e.target.closest('.tf-filtro');
            if (!b) return;
            const escenario = b.dataset.escenario;

            raiz.querySelectorAll('.tf-filtro').forEach(function (f) {
                const activo = f === b;
                f.classList.toggle('activo', activo);
                f.setAttribute('aria-pressed', String(activo));
            });

            let primeroVisible = null;
            FARMACOS.forEach(function (f) {
                const boton = nav.querySelector('[data-farmaco="' + f.id + '"]');
                const encaja = escenario === 'todos' || f.escenarios.indexOf(escenario) !== -1;
                boton.hidden = !encaja;
                if (encaja && !primeroVisible) primeroVisible = f.id;
            });

            raiz.querySelector('.tf-sin-resultados').hidden = !!primeroVisible;
            tabs.hidden = !primeroVisible;
            if (primeroVisible) mostrar(primeroVisible);
        });
    }

    function montar() {
        const raiz = document.getElementById('tablero-farmacos');
        if (!raiz || raiz.dataset.montado === 'true') return;
        raiz.dataset.montado = 'true';
        construir(raiz);
        activar(raiz);
    }

    // El tablero vive en index.html, junto al simulador, no dentro del HTML de
    // un módulo: por eso basta con montarlo al cargar y no hace falta el
    // MutationObserver que usan los widgets inyectados con innerHTML.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montar);
    } else {
        montar();
    }

    OVA.TableroFarmacos.montar = montar;
    OVA.TableroFarmacos.FARMACOS = FARMACOS;

})(window.OVA = window.OVA || {});

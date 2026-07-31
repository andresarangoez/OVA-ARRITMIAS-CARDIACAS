(function (OVA) {
    OVA.ModuloUI = OVA.ModuloUI || {};

// --- NAVEGACIÓN INTERNA DE MÓDULOS (Bienvenida → Desarrollo) ---
// Cada módulo que siga el estándar CONTENIDO_MODULOS.md debe tener,
// dentro de su contenedor #contenido-modulo-XX, dos hijos directos:
//   .modulo-bienvenida  (encabezado + objetivos + introducción + botón Comenzar)
//   .modulo-desarrollo  (unidades, caso clínico, actividad, autoevaluación, etc.)
//
// Si un módulo todavía no tiene esta estructura (ej. placeholders vacíos),
// estas funciones no hacen nada — no rompen nada al no encontrar los nodos.

function iniciarModulo(idModulo) {
    const contenedor = document.getElementById('contenido-modulo-' + idModulo);
    if (!contenedor) return;

    const bienvenida = contenedor.querySelector('.modulo-bienvenida');
    const desarrollo = contenedor.querySelector('.modulo-desarrollo');

    if (bienvenida) bienvenida.style.display = 'none';
    if (desarrollo) {
        desarrollo.style.display = 'block';
        activarBarraProgreso(desarrollo, OVA.ShellModulo && OVA.ShellModulo.onProgresoUnidad);
    }

    // El simulador solo se revela al entrar al desarrollo del módulo, y solo
    // si este módulo es uno de los que lo incluyen (fuente única de verdad:
    // OVA.Navegacion.MODULOS_CON_SIMULADOR, definida en 03-navegacion.js).
    const simulador = document.getElementById('simulador-wrapper');
    if (simulador && OVA.Navegacion && OVA.Navegacion.MODULOS_CON_SIMULADOR.includes(idModulo)) {
        simulador.style.display = 'block';
    }

    // Llevar el scroll al tope absoluto de la página, donde se ve el
    // encabezado global de la OVA (Facultad de Enfermería · Universidad FUCS)
    // — no solo la barra del módulo, y mucho menos el contenido de la Unidad 1.
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Se invoca desde abrirModulo() en 03-navegacion.js cada vez que el
// estudiante entra a un módulo, para que siempre arranque en la pantalla
// de bienvenida (y no arrastre el estado "desarrollo abierto" de una
// visita anterior).
function reiniciarEstadoModulo(idModulo) {
    const contenedor = document.getElementById('contenido-modulo-' + idModulo);
    if (!contenedor) return;

    const bienvenida = contenedor.querySelector('.modulo-bienvenida');
    const desarrollo = contenedor.querySelector('.modulo-desarrollo');

    if (bienvenida) bienvenida.style.display = 'block';
    if (desarrollo) desarrollo.style.display = 'none';

    const simulador = document.getElementById('simulador-wrapper');
    if (simulador) simulador.style.display = 'none';

    // Inicializa el shell de navegación del curso (sidebar de índice, tiempo
    // restante, etc.) si está cargado — opcional y sin efecto si no existe,
    // para que módulos/páginas sin este shell sigan funcionando igual.
    if (OVA.ShellModulo && typeof OVA.ShellModulo.prepararModulo === 'function') {
        OVA.ShellModulo.prepararModulo(idModulo, contenedor);
    }
}

// --- BARRA DE PROGRESO (opcional — no hace nada si el módulo no la incluye) ---
// Observa las .modulo-unidad del módulo y actualiza .barra-progreso-fill /
// .barra-progreso-meta .porcentaje según cuántas unidades distintas ha
// visto el estudiante mientras hace scroll. Se activa una sola vez por
// contenedor (guardia en dataset) para no acumular observers si el
// estudiante entra y sale del módulo varias veces en la misma sesión.
//
// onProgreso (opcional) permite que otro componente (el sidebar de índice
// del curso, ver js/13-shell-indice.js) se entere de cada actualización sin
// que este archivo sepa nada de él — se le pasa un solo objeto con todo lo
// que podría necesitar, no argumentos posicionales sueltos:
//   { indiceActual, elementoActual, indicesVistos, totalUnidades, porcentaje }
// indiceActual es la unidad visible más arriba en pantalla ahora mismo (se
// conserva la última conocida si momentáneamente ninguna cumple el umbral,
// para no "parpadear" a 0 en huecos de scroll). indicesVistos es la lista
// completa de unidades vistas alguna vez (igual que vistas.size, pero con
// el detalle de cuáles, no solo cuántas).
function activarBarraProgreso(desarrollo, onProgreso) {
    const barra = desarrollo.querySelector('.barra-progreso-fill');
    if (!barra || desarrollo.dataset.progresoActivo === 'true') return;
    desarrollo.dataset.progresoActivo = 'true';

    const unidades = Array.from(desarrollo.querySelectorAll('.modulo-unidad'));
    if (unidades.length === 0) return;

    const meta = desarrollo.querySelector('.barra-progreso-meta .porcentaje');
    const vistas = new Set();
    const actualmenteVisibles = new Set();
    let indiceActual = 0;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                vistas.add(entry.target);
                actualmenteVisibles.add(entry.target);
            } else {
                actualmenteVisibles.delete(entry.target);
            }
        });

        if (actualmenteVisibles.size > 0) {
            indiceActual = unidades.findIndex(unidad => actualmenteVisibles.has(unidad));
        }

        const porcentaje = Math.round((vistas.size / unidades.length) * 100);
        barra.style.width = porcentaje + '%';
        if (meta) meta.textContent = porcentaje + '%';

        if (typeof onProgreso === 'function') {
            const indicesVistos = unidades.reduce((acc, unidad, indice) => {
                if (vistas.has(unidad)) acc.push(indice);
                return acc;
            }, []);

            onProgreso({
                indiceActual,
                elementoActual: unidades[indiceActual],
                indicesVistos,
                totalUnidades: unidades.length,
                porcentaje
            });
        }
    }, { threshold: 0.3 });

    unidades.forEach(unidad => observer.observe(unidad));
}

// --- ACORDEONES ---
function toggleAcordeon(boton) {
    const item = boton.closest('.acordeon-item');
    if (item) item.classList.toggle('abierto');
}

// --- ACTIVIDAD DE APRENDIZAJE (una sola pregunta, demo visual) ---
function verificarActividad(boton) {
    const contenedor = boton.closest('.modulo-actividad');
    if (!contenedor) return;
    const seleccionada = contenedor.querySelector('input[type="radio"]:checked');
    if (!seleccionada) {
        alert('Selecciona una opción antes de verificar.');
        return;
    }
    alert('Estructura de verificación pendiente de contenido definitivo. Opción seleccionada: ' + seleccionada.value);
}

// --- AUTOEVALUACIÓN (varias preguntas, retroalimentación por pregunta) ---
// La respuesta correcta de cada pregunta vive en el HTML como
// data-correcta="true" en su <input> — esta función solo la lee, nunca la
// inventa. Si una pregunta todavía no tiene ninguna opción marcada como
// correcta (contenido pendiente de definir en otros módulos), se registra
// la respuesta sin afirmar que esté bien o mal, para no dar
// retroalimentación falsa.
function verificarAutoevaluacion(boton) {
    const contenedor = boton.closest('.modulo-autoevaluacion');
    if (!contenedor) return;

    const preguntas = contenedor.querySelectorAll('.autoevaluacion-pregunta');
    let sinResponder = 0;

    preguntas.forEach(pregunta => {
        const anterior = pregunta.querySelector('.autoevaluacion-feedback');
        if (anterior) anterior.remove();

        const seleccionada = pregunta.querySelector('input[type="radio"]:checked');
        if (!seleccionada) {
            sinResponder++;
            return;
        }

        const opciones = pregunta.querySelectorAll('input[type="radio"]');
        const hayRespuestaDefinida = Array.from(opciones).some(o => o.dataset.correcta === 'true');

        const feedback = document.createElement('p');
        feedback.className = 'autoevaluacion-feedback';

        if (!hayRespuestaDefinida) {
            feedback.textContent = 'Respuesta registrada.';
        } else if (seleccionada.dataset.correcta === 'true') {
            feedback.textContent = '✅ Correcto.';
            feedback.classList.add('correcto');
        } else {
            feedback.textContent = '❌ No es correcto.';
            feedback.classList.add('incorrecto');
        }
        pregunta.appendChild(feedback);
    });

    if (sinResponder > 0) {
        alert('Responde la(s) ' + sinResponder + ' pregunta(s) que faltan antes de enviar.');
    }
}

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.ModuloUI.iniciarModulo = iniciarModulo;
    OVA.ModuloUI.reiniciarEstadoModulo = reiniciarEstadoModulo;
    OVA.ModuloUI.toggleAcordeon = toggleAcordeon;
    OVA.ModuloUI.verificarActividad = verificarActividad;
    OVA.ModuloUI.verificarAutoevaluacion = verificarAutoevaluacion;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    // index.html y los fragmentos de modules/*.html llaman a estas funciones
    // directamente por nombre (onclick="iniciarModulo(...)", etc.). Se exponen
    // aquí de forma explícita para no tener que modificar ningún HTML.
    window.iniciarModulo = iniciarModulo;
    window.toggleAcordeon = toggleAcordeon;
    window.verificarActividad = verificarActividad;
    window.verificarAutoevaluacion = verificarAutoevaluacion;

})(window.OVA = window.OVA || {});

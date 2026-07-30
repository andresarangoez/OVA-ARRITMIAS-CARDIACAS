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
    if (desarrollo) desarrollo.style.display = 'block';

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
}

// --- ACORDEONES ---
function toggleAcordeon(boton) {
    const item = boton.closest('.acordeon-item');
    if (item) item.classList.toggle('abierto');
}

// --- ACTIVIDAD DE APRENDIZAJE (demo visual, sin lógica de calificación real todavía) ---
function verificarActividad(boton) {
    const contenedor = boton.closest('.modulo-actividad');
    const seleccionada = contenedor.querySelector('input[type="radio"]:checked');
    if (!seleccionada) {
        alert('Selecciona una opción antes de verificar.');
        return;
    }
    alert('Estructura de verificación pendiente de contenido definitivo. Opción seleccionada: ' + seleccionada.value);
}

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.ModuloUI.iniciarModulo = iniciarModulo;
    OVA.ModuloUI.reiniciarEstadoModulo = reiniciarEstadoModulo;
    OVA.ModuloUI.toggleAcordeon = toggleAcordeon;
    OVA.ModuloUI.verificarActividad = verificarActividad;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    // index.html y los fragmentos de modules/*.html llaman a estas funciones
    // directamente por nombre (onclick="iniciarModulo(...)", etc.). Se exponen
    // aquí de forma explícita para no tener que modificar ningún HTML.
    window.iniciarModulo = iniciarModulo;
    window.toggleAcordeon = toggleAcordeon;
    window.verificarActividad = verificarActividad;

})(window.OVA = window.OVA || {});

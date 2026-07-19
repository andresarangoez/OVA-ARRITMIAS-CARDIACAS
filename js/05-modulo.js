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

    // Llevar el scroll al inicio del contenido de desarrollo
    contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

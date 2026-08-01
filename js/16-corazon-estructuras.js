(function (OVA) {
    OVA.CorazonEstructuras = OVA.CorazonEstructuras || {};

// --- ESTRUCTURAS DEL CORAZÓN (Módulo 01, Unidad 1) ---
//
// Diagrama e interacción propios; el contenido (qué 14 estructuras
// mostrar y el texto de cada una) está inspirado en el simulador de
// Human Bio Media (https://humanbiomedia.org), usado conforme a su
// licencia CC BY 4.0 — ver docs/CREDITOS-TERCEROS.md. El nombre y el
// texto de cada estructura viven en el HTML (data-nombre/data-texto de
// cada <circle>), nunca aquí — mismo principio que verificarMiniReto en
// 12-widgets-aprendizaje.js. No requiere inicialización: el marcador
// "activo" por defecto y el panel ya vienen resueltos en el HTML.

function mostrar(circulo) {
    const contenedor = circulo.closest('.corazon-estructuras');
    if (!contenedor) return;

    contenedor.querySelectorAll('.corazon-marcador').forEach(c => c.classList.remove('activo'));
    circulo.classList.add('activo');

    const nombre = contenedor.querySelector('.corazon-estructuras-nombre');
    const texto = contenedor.querySelector('.corazon-estructuras-texto');
    if (nombre) nombre.textContent = circulo.dataset.nombre;
    if (texto) texto.textContent = circulo.dataset.texto;
}

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.CorazonEstructuras.mostrar = mostrar;

})(window.OVA = window.OVA || {});

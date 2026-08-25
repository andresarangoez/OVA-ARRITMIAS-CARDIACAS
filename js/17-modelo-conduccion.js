// --- PUNTOS INTERACTIVOS DEL MODELO 3D DE CONDUCCIÓN (Módulo 01, Unidad 1) ---
//
// <model-viewer> se encarga de anclar cada marcador a su coordenada del modelo
// y de mantenerlo pegado a la superficie mientras se gira. Este archivo solo
// resuelve una cosa: qué etiqueta está abierta.
//
// Se invoca con onclick="" en línea desde el HTML del módulo, no con
// addEventListener al cargar. Es obligatorio: los módulos se inyectan con
// innerHTML, así que un script de inicialización nunca llegaría a ejecutarse
// (mismo patrón que el resto de widgets del proyecto).

(function (OVA) {
    OVA.ModeloConduccion = OVA.ModeloConduccion || {};

    // Abre la etiqueta pulsada y cierra las demás del mismo modelo. Se limita al
    // model-viewer que contiene el marcador para no interferir si en el futuro
    // hay más de un modelo con puntos en la misma página.
    function alternar(boton) {
        const visor = boton.closest('model-viewer');
        const abierto = boton.classList.contains('abierto');

        if (visor) {
            visor.querySelectorAll('.hotspot-conduccion.abierto').forEach(otro => {
                otro.classList.remove('abierto');
                otro.setAttribute('aria-expanded', 'false');
            });
        }

        // Pulsar el marcador ya abierto lo cierra (comportamiento de alternar).
        if (!abierto) {
            boton.classList.add('abierto');
            boton.setAttribute('aria-expanded', 'true');
        }
    }

    // --- API PÚBLICA ---
    OVA.ModeloConduccion.alternar = alternar;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.alternarPuntoConduccion = alternar;

})(window.OVA = window.OVA || {});

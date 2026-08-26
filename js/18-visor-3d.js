// --- CONTROLES GENÉRICOS PARA CUALQUIER VISOR 3D DEL OVA ---
//
// Añade pantalla completa y un panel de ayuda de navegación a cualquier
// .modelo-3d-container, sea el modelo que sea. Para usarlo en un modelo nuevo
// basta con pegar los dos botones dentro del contenedor:
//
//   <div class="visor-3d-controles">
//       <button class="visor-3d-btn" onclick="alternarAyudaVisor(this)" ...>?</button>
//       <button class="visor-3d-btn" onclick="pantallaCompletaVisor(this)" ...>⛶</button>
//   </div>
//
// El panel de ayuda NO va en el HTML: lo construye este archivo la primera vez
// que se pide. Así el texto vive en un solo sitio y añadir un modelo nuevo no
// obliga a duplicarlo — que es como esas cosas acaban divergiendo.
//
// Se invoca con onclick="" en línea, no con addEventListener al cargar: los
// módulos se inyectan con innerHTML y un script de inicialización nunca
// llegaría a ejecutarse (mismo patrón que el resto de widgets del proyecto).

(function (OVA) {
    OVA.Visor3D = OVA.Visor3D || {};

    // Contenido de la ayuda. Cada entrada: icono SVG, título y las dos formas
    // de hacerlo — ratón y táctil —, porque el OVA se usa en portátil y tablet.
    const AYUDA = [
        {
            titulo: 'Girar',
            icono: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>',
            raton: 'Clic izquierdo y arrastrar',
            tactil: 'Arrastrar con un dedo'
        },
        {
            titulo: 'Acercar',
            icono: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
            raton: 'Rueda del ratón',
            tactil: 'Pellizcar con dos dedos'
        },
        {
            titulo: 'Desplazar',
            icono: '<polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>',
            raton: 'Clic derecho y arrastrar',
            tactil: 'Arrastrar con dos dedos'
        }
    ];

    function contenedorDe(boton) {
        return boton.closest('.modelo-3d-container');
    }

    // --- PANTALLA COMPLETA ---
    function pantallaCompleta(boton) {
        const caja = contenedorDe(boton);
        if (!caja) return;

        // document.fullscreenElement cubre el caso de salir con Esc, que no
        // pasa por este botón: si ya estamos en pantalla completa, se sale.
        if (document.fullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            return;
        }
        if (caja.requestFullscreen) {
            caja.requestFullscreen().catch(() => {
                // Algunos navegadores la deniegan si no viene de un gesto real
                // del usuario. No se rompe nada: el visor sigue funcionando.
            });
        }
    }

    // --- AYUDA DE NAVEGACIÓN ---
    function construirPanel(caja) {
        const panel = document.createElement('div');
        panel.className = 'visor-3d-ayuda';

        const cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.className = 'visor-3d-ayuda-cerrar';
        cerrar.setAttribute('aria-label', 'Cerrar la ayuda');
        cerrar.textContent = '×';
        cerrar.onclick = () => ocultarPanel(caja);
        panel.appendChild(cerrar);

        const titulo = document.createElement('h4');
        titulo.className = 'visor-3d-ayuda-titulo';
        titulo.textContent = 'Cómo navegar el modelo';
        panel.appendChild(titulo);

        const rejilla = document.createElement('div');
        rejilla.className = 'visor-3d-ayuda-rejilla';
        AYUDA.forEach(item => {
            const bloque = document.createElement('div');
            bloque.className = 'visor-3d-ayuda-item';
            bloque.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + item.icono + '</svg>' +
                '<strong></strong><span class="raton"></span><span class="tactil"></span>';
            // el texto se asigna por textContent, no dentro del innerHTML de
            // arriba, para no depender de escapado manual
            bloque.querySelector('strong').textContent = item.titulo;
            bloque.querySelector('.raton').textContent = item.raton;
            bloque.querySelector('.tactil').textContent = item.tactil;
            rejilla.appendChild(bloque);
        });
        panel.appendChild(rejilla);

        const pie = document.createElement('div');
        pie.className = 'visor-3d-ayuda-pie';
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'visor-3d-ayuda-reset';
        reset.textContent = 'Restablecer la vista';
        reset.onclick = () => { restablecerVista(caja); ocultarPanel(caja); };
        pie.appendChild(reset);
        panel.appendChild(pie);

        caja.appendChild(panel);
        return panel;
    }

    function ocultarPanel(caja) {
        const panel = caja.querySelector('.visor-3d-ayuda');
        if (panel) panel.classList.remove('abierta');
        const btn = caja.querySelector('.visor-3d-btn[data-ayuda]');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function alternarAyuda(boton) {
        const caja = contenedorDe(boton);
        if (!caja) return;

        // El panel se construye una sola vez, la primera que se pide.
        let panel = caja.querySelector('.visor-3d-ayuda');
        if (!panel) panel = construirPanel(caja);

        const abierta = panel.classList.toggle('abierta');
        boton.setAttribute('data-ayuda', '');
        boton.setAttribute('aria-expanded', abierta ? 'true' : 'false');
    }

    // --- GIRO AUTOMÁTICO ---
    // El giro ayuda a captar el volumen al llegar, pero estorba en cuanto hay
    // que pulsar algo sobre el modelo. Por eso se puede parar.
    function alternarGiro(boton) {
        const caja = contenedorDe(boton);
        if (!caja) return;
        const visor = caja.querySelector('model-viewer');
        if (!visor) return;

        const activo = !visor.autoRotate;
        visor.autoRotate = activo;
        boton.classList.toggle('activo', activo);
        boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
        boton.setAttribute('title', activo ? 'Detener el giro automático' : 'Activar el giro automático');
    }

    // --- RESTABLECER LA VISTA ---
    // Devuelve la cámara a su encuadre inicial. Útil cuando el estudiante se
    // pierde tras girar y alejar el modelo.
    function restablecerVista(caja) {
        const visor = caja.querySelector('model-viewer');
        if (!visor) return;
        visor.cameraOrbit = visor.getAttribute('camera-orbit') || 'auto auto auto';
        visor.cameraTarget = visor.getAttribute('camera-target') || 'auto auto auto';
        visor.fieldOfView = visor.getAttribute('field-of-view') || 'auto';
        if (typeof visor.resetTurntableRotation === 'function') visor.resetTurntableRotation();
    }

    // --- API PÚBLICA ---
    OVA.Visor3D.pantallaCompleta = pantallaCompleta;
    OVA.Visor3D.alternarAyuda = alternarAyuda;
    OVA.Visor3D.alternarGiro = alternarGiro;
    OVA.Visor3D.restablecerVista = restablecerVista;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.pantallaCompletaVisor = pantallaCompleta;
    window.alternarAyudaVisor = alternarAyuda;
    window.alternarGiroVisor = alternarGiro;

})(window.OVA = window.OVA || {});

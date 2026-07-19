// --- COMPONENTES INTERACTIVOS (COMPONENTES.md) ---
// Mismo patrón que 05-modulo.js: funciones expuestas vía onclick="" en el
// HTML, para ser consistentes con el resto del proyecto y para que
// funcionen sin importar si el HTML que las contiene fue inyectado
// dinámicamente por 03-navegacion.js o 07-contenido-dinamico.js.

(function (OVA) {
    OVA.Componentes = OVA.Componentes || {};

    // --- TABS ---
    // Uso: <div class="tabs-nav"><button onclick="cambiarTab(this, 'panel-x')">...
    function cambiarTab(boton, idPanelDestino) {
        const contenedorTabs = boton.closest('.tabs');
        if (!contenedorTabs) return;

        contenedorTabs.querySelectorAll('.tabs-nav button').forEach(b => {
            b.classList.remove('activo');
            b.setAttribute('aria-selected', 'false');
        });
        boton.classList.add('activo');
        boton.setAttribute('aria-selected', 'true');

        contenedorTabs.querySelectorAll('.tabs-panel').forEach(panel => {
            panel.classList.toggle('activo', panel.id === idPanelDestino);
        });
    }

    // --- MODAL ---
    // Uso: <button onclick="abrirModal('mi-modal')">
    //      <div id="mi-modal" class="modal-overlay">...<button onclick="cerrarModal('mi-modal')">×</button></div>
    function abrirModal(idModal) {
        const modal = document.getElementById(idModal);
        if (!modal) return;
        modal.classList.add('abierto');
        modal.setAttribute('aria-hidden', 'false');
    }

    function cerrarModal(idModal) {
        const modal = document.getElementById(idModal);
        if (!modal) return;
        modal.classList.remove('abierto');
        modal.setAttribute('aria-hidden', 'true');
    }

    // Cerrar al hacer clic fuera de la caja del modal (en el overlay)
    document.addEventListener('click', function(e) {
        if (e.target.classList && e.target.classList.contains('modal-overlay')) {
            cerrarModal(e.target.id);
        }
    });

    // Cerrar con la tecla ESC (el modal que esté abierto en ese momento)
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal-overlay.abierto').forEach(modal => {
            cerrarModal(modal.id);
        });
    });

    // --- ZOOM DE IMÁGENES ---
    // Uso: <div class="zoom-imagen" onclick="hacerZoom(this)"><img src="..." alt="..."></div>
    // Construye (una sola vez) un modal genérico reutilizable para el zoom,
    // en vez de exigir que cada imagen traiga su propio modal en el HTML.
    function obtenerModalZoomGenerico() {
        let modal = document.getElementById('modal-zoom-generico');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'modal-zoom-generico';
        modal.className = 'modal-overlay';
        modal.setAttribute('aria-hidden', 'true');

        const caja = document.createElement('div');
        caja.className = 'modal-caja';

        const btnCerrar = document.createElement('button');
        btnCerrar.className = 'modal-cerrar';
        btnCerrar.setAttribute('aria-label', 'Cerrar');
        btnCerrar.textContent = '×';
        btnCerrar.addEventListener('click', () => cerrarModal('modal-zoom-generico'));

        const img = document.createElement('img');
        img.id = 'modal-zoom-generico-img';
        img.style.maxWidth = '80vw';
        img.style.maxHeight = '80vh';
        img.style.display = 'block';
        img.style.borderRadius = '8px';

        caja.appendChild(btnCerrar);
        caja.appendChild(img);
        modal.appendChild(caja);
        document.body.appendChild(modal);
        return modal;
    }

    function hacerZoom(contenedorImagen) {
        const img = contenedorImagen.querySelector('img');
        if (!img) return;
        const modal = obtenerModalZoomGenerico();
        const imgModal = modal.querySelector('#modal-zoom-generico-img');
        imgModal.src = img.src;
        imgModal.alt = img.alt || '';
        abrirModal('modal-zoom-generico');
    }

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.Componentes.cambiarTab = cambiarTab;
    OVA.Componentes.abrirModal = abrirModal;
    OVA.Componentes.cerrarModal = cerrarModal;
    OVA.Componentes.hacerZoom = hacerZoom;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.cambiarTab = cambiarTab;
    window.abrirModal = abrirModal;
    window.cerrarModal = cerrarModal;
    window.hacerZoom = hacerZoom;

})(window.OVA = window.OVA || {});

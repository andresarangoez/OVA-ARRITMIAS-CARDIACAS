// --- BÚSQUEDA DENTRO DEL MÓDULO ---
// Busca texto solo dentro del .modulo-desarrollo del módulo actualmente
// abierto (nunca en la bienvenida, el sidebar o el modal), resalta todas
// las coincidencias con <mark> y permite navegar entre ellas. El resaltado
// es reversible: limpiarResaltado() deshace exactamente lo que se agregó,
// sin alterar el texto original.
//
// Depende de OVA.ShellModulo.obtenerDesarrolloActivo() (js/13-shell-indice.js)
// para saber en qué módulo buscar — no duplica esa lógica.

(function (OVA) {
    OVA.BusquedaModulo = OVA.BusquedaModulo || {};

    let coincidencias = [];
    let indiceActual = -1;

    function alternarBusqueda() {
        const fila = document.querySelector('.indice-busqueda');
        const boton = document.querySelector('.indice-btn-buscar');
        if (!fila) return;

        const abierta = fila.classList.toggle('abierta');
        if (boton) boton.classList.toggle('activo', abierta);

        const input = fila.querySelector('.indice-busqueda-input');
        if (abierta) {
            if (input) input.focus();
        } else {
            limpiarResaltado();
            if (input) input.value = '';
        }
    }

    function ejecutarBusqueda(termino) {
        limpiarResaltado();

        const texto = (termino || '').trim();
        if (!texto) {
            actualizarContador();
            return;
        }

        const desarrollo = OVA.ShellModulo && OVA.ShellModulo.obtenerDesarrolloActivo();
        if (!desarrollo) return;

        resaltarCoincidencias(desarrollo, texto);

        if (coincidencias.length > 0) {
            indiceActual = 0;
            marcarCoincidenciaActual();
        }
        actualizarContador();
    }

    // Recorre solo nodos de texto (nunca script/style, nunca marcas ya
    // creadas por una búsqueda anterior) y envuelve cada coincidencia en
    // un <mark>, preservando el resto del texto intacto alrededor.
    function resaltarCoincidencias(desarrollo, termino) {
        const terminoLower = termino.toLowerCase();

        const walker = document.createTreeWalker(desarrollo, NodeFilter.SHOW_TEXT, {
            acceptNode(nodo) {
                if (!nodo.nodeValue || !nodo.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                const padre = nodo.parentElement;
                if (!padre) return NodeFilter.FILTER_REJECT;
                if (padre.tagName === 'SCRIPT' || padre.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
                if (padre.closest('mark.busqueda-resaltado')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        // Se recolectan todos los nodos primero — mutar el DOM mientras el
        // TreeWalker todavía está recorriendo invalidaría el recorrido.
        const nodosAProcesar = [];
        let nodoActual;
        while ((nodoActual = walker.nextNode())) {
            if (nodoActual.nodeValue.toLowerCase().includes(terminoLower)) {
                nodosAProcesar.push(nodoActual);
            }
        }

        nodosAProcesar.forEach(nodo => {
            const textoOriginal = nodo.nodeValue;
            const textoLower = textoOriginal.toLowerCase();
            const fragmento = document.createDocumentFragment();

            let posicion = 0;
            let indice = textoLower.indexOf(terminoLower);

            while (indice !== -1) {
                if (indice > posicion) {
                    fragmento.appendChild(document.createTextNode(textoOriginal.slice(posicion, indice)));
                }
                const marca = document.createElement('mark');
                marca.className = 'busqueda-resaltado';
                marca.textContent = textoOriginal.slice(indice, indice + termino.length);
                fragmento.appendChild(marca);
                coincidencias.push(marca);

                posicion = indice + termino.length;
                indice = textoLower.indexOf(terminoLower, posicion);
            }
            if (posicion < textoOriginal.length) {
                fragmento.appendChild(document.createTextNode(textoOriginal.slice(posicion)));
            }
            nodo.parentNode.replaceChild(fragmento, nodo);
        });
    }

    // Deshace el resaltado: cada <mark> se reemplaza por su propio texto y
    // se normaliza el contenedor para volver a fusionar nodos de texto
    // adyacentes — el contenido queda exactamente como antes de buscar.
    function limpiarResaltado() {
        coincidencias.forEach(marca => {
            if (!marca.parentNode) return;
            marca.parentNode.replaceChild(document.createTextNode(marca.textContent), marca);
        });

        const desarrollo = OVA.ShellModulo && OVA.ShellModulo.obtenerDesarrolloActivo();
        if (desarrollo) desarrollo.normalize();

        coincidencias = [];
        indiceActual = -1;
        actualizarContador();
    }

    function marcarCoincidenciaActual() {
        coincidencias.forEach(marca => marca.classList.remove('busqueda-resaltado-actual'));
        const actual = coincidencias[indiceActual];
        if (!actual) return;
        actual.classList.add('busqueda-resaltado-actual');
        actual.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function actualizarContador() {
        const contador = document.querySelector('.indice-busqueda-contador');
        if (!contador) return;
        contador.textContent = coincidencias.length === 0
            ? '0 de 0'
            : (indiceActual + 1) + ' de ' + coincidencias.length;
    }

    function irACoincidenciaSiguiente() {
        if (coincidencias.length === 0) return;
        indiceActual = (indiceActual + 1) % coincidencias.length;
        marcarCoincidenciaActual();
        actualizarContador();
    }

    function irACoincidenciaAnterior() {
        if (coincidencias.length === 0) return;
        indiceActual = (indiceActual - 1 + coincidencias.length) % coincidencias.length;
        marcarCoincidenciaActual();
        actualizarContador();
    }

    function manejarTeclaBusqueda(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (event.shiftKey) irACoincidenciaAnterior();
            else irACoincidenciaSiguiente();
        } else if (event.key === 'Escape') {
            alternarBusqueda();
        }
    }

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.BusquedaModulo.alternarBusqueda = alternarBusqueda;
    OVA.BusquedaModulo.ejecutarBusqueda = ejecutarBusqueda;
    OVA.BusquedaModulo.limpiarResaltado = limpiarResaltado;
    OVA.BusquedaModulo.irACoincidenciaSiguiente = irACoincidenciaSiguiente;
    OVA.BusquedaModulo.irACoincidenciaAnterior = irACoincidenciaAnterior;
    OVA.BusquedaModulo.manejarTeclaBusqueda = manejarTeclaBusqueda;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.alternarBusqueda = alternarBusqueda;
    window.ejecutarBusqueda = ejecutarBusqueda;
    window.irACoincidenciaSiguiente = irACoincidenciaSiguiente;
    window.irACoincidenciaAnterior = irACoincidenciaAnterior;
    window.manejarTeclaBusqueda = manejarTeclaBusqueda;

})(window.OVA = window.OVA || {});

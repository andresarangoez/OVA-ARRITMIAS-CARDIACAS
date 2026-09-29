(function (OVA) {
    OVA.BienvenidaModulo = OVA.BienvenidaModulo || {};

    // --- FICHA DE BIENVENIDA DEL MÓDULO ---
    // Rellena las partes de la pantalla de bienvenida que se derivan del
    // propio contenido: cuántas unidades tiene el módulo y cuáles son. Se leen
    // del DOM ya cargado (.modulo-unidad / .unidad-titulo), la misma fuente que
    // usa el índice lateral (js/13-shell-indice.js), para que la ficha no pueda
    // quedar desfasada de las unidades reales.
    //
    // Los iconos también se inyectan aquí: así el SVG se escribe una sola vez
    // en vez de repetirse en los seis archivos de módulo.

    const ICONOS = {
        // Reloj
        reloj: '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>',
        // Pila de hojas (unidades)
        unidades: '<polygon points="12 3 21 8 12 13 3 8 12 3"></polygon><polyline points="3 14 12 19 21 14"></polyline>'
    };

    function dibujarIcono(elemento) {
        const trazo = ICONOS[elemento.dataset.icono];
        if (!trazo) return;
        elemento.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
            'style="width:100%;height:100%;display:block">' + trazo + '</svg>';
    }

    // "Unidad 3 · Ciclo Cardíaco" → { numero: '03', nombre: 'Ciclo Cardíaco' }
    // Si el título no sigue ese patrón, se conserva completo y se numera por
    // su posición: nunca se pierde una unidad por no encajar en el formato.
    function partirTitulo(texto, indice) {
        const numero = String(indice + 1).padStart(2, '0');
        const separador = texto.indexOf('·');
        const nombre = separador === -1 ? texto : texto.slice(separador + 1).trim();
        return { numero, nombre };
    }

    function preparar(idModulo, contenedor) {
        if (!contenedor) return;
        const bienvenida = contenedor.querySelector('.modulo-bienvenida');
        const desarrollo = contenedor.querySelector('.modulo-desarrollo');
        if (!bienvenida || !desarrollo) return;

        bienvenida.querySelectorAll('[data-icono]').forEach(dibujarIcono);

        const unidades = Array.from(desarrollo.querySelectorAll('.modulo-unidad'));

        const contador = bienvenida.querySelector('[data-bienvenida-unidades]');
        if (contador) {
            contador.textContent = unidades.length + (unidades.length === 1 ? ' unidad' : ' unidades');
        }

        const lista = bienvenida.querySelector('[data-bienvenida-lista]');
        if (!lista) return;

        lista.innerHTML = '';
        unidades.forEach((unidad, indice) => {
            const titulo = unidad.querySelector('.unidad-titulo');
            const texto = titulo ? titulo.textContent.trim() : ('Unidad ' + (indice + 1));
            const partes = partirTitulo(texto, indice);

            const item = document.createElement('li');
            item.className = 'bienvenida-unidad';

            const numero = document.createElement('span');
            numero.className = 'bienvenida-unidad-numero';
            numero.textContent = partes.numero;

            const nombre = document.createElement('span');
            nombre.className = 'bienvenida-unidad-nombre';
            nombre.textContent = partes.nombre;

            item.appendChild(numero);
            item.appendChild(nombre);
            lista.appendChild(item);
        });
    }

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.BienvenidaModulo.preparar = preparar;

})(window.OVA = window.OVA || {});

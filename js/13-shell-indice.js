// --- SHELL DE NAVEGACIÓN DEL CURSO: ÍNDICE DEL MÓDULO ---
// Genera y mantiene sincronizado el sidebar de índice (título, progreso,
// tiempo restante, lista de unidades con estado) para el módulo que esté
// abierto en cada momento. No conoce nada del contenido clínico de ningún
// módulo — todo lo lee del DOM ya cargado (títulos de unidad, tiempo
// estimado, lista de módulos del home), por eso funciona igual para los
// 6 módulos sin cambios de código.
//
// Se conecta al resto de la app en un solo punto: reiniciarEstadoModulo()
// en js/05-modulo.js llama a OVA.ShellModulo.prepararModulo(...) si este
// archivo está cargado — 03-navegacion.js no se modifica.

(function (OVA) {
    OVA.ShellModulo = OVA.ShellModulo || {};

    // --- ESTADO PRIVADO ---
    let idModuloActivo = null;
    let minutosTotalesActivo = null;
    let ultimoProgreso = null;
    let listaModulosCache = null;

    // --- LISTA DE MÓDULOS (fuente única: data-modulo-id/titulo en el home) ---
    function obtenerListaModulos() {
        if (listaModulosCache) return listaModulosCache;
        const tarjetas = document.querySelectorAll('.module-card[data-modulo-id]');
        listaModulosCache = Array.from(tarjetas).map(tarjeta => ({
            id: tarjeta.dataset.moduloId,
            titulo: tarjeta.dataset.moduloTitulo
        }));
        return listaModulosCache;
    }

    // --- TIEMPO ESTIMADO (se lee de la propia bienvenida del módulo) ---
    function extraerMinutos(bienvenida) {
        if (!bienvenida) return null;
        const meta = bienvenida.querySelector('.modulo-meta');
        if (!meta) return null;
        const coincidencia = meta.textContent.match(/(\d+)\s*minutos/i);
        return coincidencia ? parseInt(coincidencia[1], 10) : null;
    }

    function calcularTiempoRestante(info) {
        if (minutosTotalesActivo === null) return null;
        const restante = Math.round(minutosTotalesActivo * (1 - info.porcentaje / 100));
        return Math.max(restante, 0);
    }

    // --- PUNTO DE ENTRADA: se llama cada vez que se abre/reentra un módulo ---
    function prepararModulo(idModulo, contenedor) {
        const desarrollo = contenedor.querySelector('.modulo-desarrollo');
        if (!desarrollo) return;

        idModuloActivo = idModulo;
        ultimoProgreso = null;

        const bienvenida = contenedor.querySelector('.modulo-bienvenida');
        minutosTotalesActivo = extraerMinutos(bienvenida);

        const infoModulo = obtenerListaModulos().find(m => m.id === idModulo);
        const tituloEl = document.querySelector('.indice-titulo');
        if (tituloEl) {
            tituloEl.textContent = infoModulo
                ? ('Módulo ' + infoModulo.id + ': ' + infoModulo.titulo)
                : ('Módulo ' + idModulo);
        }

        generarIndiceUnidades(desarrollo);
        generarSubindices(desarrollo);
        actualizarResumenProgreso({ porcentaje: 0, indicesVistos: [], totalUnidades: desarrollo.querySelectorAll('.modulo-unidad').length });

        if (OVA.BusquedaModulo && typeof OVA.BusquedaModulo.limpiarResaltado === 'function') {
            OVA.BusquedaModulo.limpiarResaltado();
        }
        const filaBusqueda = document.querySelector('.indice-busqueda');
        if (filaBusqueda) filaBusqueda.classList.remove('abierta');
    }

    // --- GENERA LA LISTA DEL SIDEBAR A PARTIR DE LAS UNIDADES REALES ---
    function generarIndiceUnidades(desarrollo) {
        const lista = document.querySelector('.indice-lista');
        if (!lista) return;

        const unidades = desarrollo.querySelectorAll('.modulo-unidad');
        lista.innerHTML = '';

        unidades.forEach((unidad, indice) => {
            // Clave de correlación bidireccional entre la unidad real y su
            // entrada en el sidebar — se estampa en cada apertura del módulo
            // (el contenido se recarga desde caché con innerHTML nuevo cada
            // vez, así que no hay riesgo de arrastrar un índice viejo).
            unidad.dataset.unidadIndex = String(indice);

            const tituloUnidad = unidad.querySelector('.unidad-titulo');
            const texto = tituloUnidad ? tituloUnidad.textContent.trim() : ('Unidad ' + (indice + 1));

            const item = document.createElement('li');
            item.className = 'indice-item pendiente';
            item.dataset.unidadIndex = String(indice);

            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'indice-item-btn';
            boton.onclick = () => irAUnidad(indice);

            const icono = document.createElement('span');
            icono.className = 'indice-item-icono';
            icono.setAttribute('aria-hidden', 'true');
            icono.textContent = '○';

            const textoEl = document.createElement('span');
            textoEl.className = 'indice-item-texto';
            textoEl.textContent = texto;

            boton.appendChild(icono);
            boton.appendChild(textoEl);
            item.appendChild(boton);
            lista.appendChild(item);
        });
    }

    // --- SUB-ÍNDICES: numera automáticamente los h4/h5 propios de cada
    // unidad (2, 2.1, 2.2, 3...) y los publica en dos lugares: anidados bajo
    // la unidad en el sidebar global, y como un mini-índice desplegable
    // dentro de la propia unidad. Se recalcula en cada apertura del módulo,
    // así que nunca queda desincronizado del contenido real — no depende de
    // numeración escrita a mano en el HTML. Usa :scope > h4/h5 para no
    // recoger encabezados internos de widgets (ej. el h5 "Estructura" del
    // panel de identificación de estructuras del corazón).
    function generarSubindices(desarrollo) {
        const unidades = desarrollo.querySelectorAll('.modulo-unidad');

        unidades.forEach((unidad, indiceUnidad) => {
            const miniPrevio = unidad.querySelector('.unidad-mini-indice');
            if (miniPrevio) miniPrevio.remove();

            // ":scope .figura-fila-texto > h4/h5" cubre los encabezados que
            // viven dentro de una fila texto+imagen (necesario para poder
            // centrar la imagen verticalmente junto a su apartado) sin
            // recoger encabezados de otros widgets anidados (ej. el h5
            // "Estructura" del panel de identificación de estructuras).
            const encabezados = unidad.querySelectorAll(':scope > h4, :scope > h5, :scope > .figura-fila > .figura-fila-texto > h4, :scope > .figura-fila > .figura-fila-texto > h5');
            if (encabezados.length === 0) return;

            const entradas = [];
            let mayor = 0;
            let menor = 0;

            encabezados.forEach((encabezado, i) => {
                if (encabezado.tagName === 'H4') {
                    mayor += 1;
                    menor = 0;
                } else {
                    menor += 1;
                }
                const numero = menor > 0 ? (mayor + '.' + menor) : String(mayor);
                const idEncabezado = 'unidad-' + indiceUnidad + '-sub-' + i;
                encabezado.id = idEncabezado;

                // Guarda el texto original una sola vez (dataset persiste en el
                // propio nodo) para poder reponer el número sin duplicarlo si
                // el módulo se reabre y esta función se ejecuta de nuevo.
                if (!encabezado.dataset.textoOriginal) {
                    encabezado.dataset.textoOriginal = encabezado.textContent.trim();
                }
                const textoOriginal = encabezado.dataset.textoOriginal;

                encabezado.innerHTML = '';
                const numeroSpan = document.createElement('span');
                numeroSpan.className = 'numero-encabezado';
                numeroSpan.textContent = numero + '.';
                encabezado.appendChild(numeroSpan);
                encabezado.appendChild(document.createTextNode(' ' + textoOriginal));

                entradas.push({
                    numero,
                    texto: textoOriginal,
                    id: idEncabezado,
                    nivel: encabezado.tagName === 'H4' ? 1 : 2
                });
            });

            publicarSublistaSidebar(indiceUnidad, entradas);
            publicarMiniIndiceUnidad(unidad, indiceUnidad, entradas);
        });
    }

    function publicarSublistaSidebar(indiceUnidad, entradas) {
        const itemSidebar = document.querySelector('.indice-lista .indice-item[data-unidad-index="' + indiceUnidad + '"]');
        if (!itemSidebar) return;

        const sublista = document.createElement('ul');
        sublista.className = 'indice-sublista';

        entradas.forEach(entrada => {
            const li = document.createElement('li');
            li.className = 'indice-subitem nivel-' + entrada.nivel;

            const boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'indice-subitem-btn';
            boton.onclick = () => irASubindice(indiceUnidad, entrada.id);

            const numero = document.createElement('span');
            numero.className = 'indice-subitem-numero';
            numero.textContent = entrada.numero;

            const texto = document.createElement('span');
            texto.textContent = entrada.texto;

            boton.appendChild(numero);
            boton.appendChild(texto);
            li.appendChild(boton);
            sublista.appendChild(li);
        });

        itemSidebar.appendChild(sublista);
    }

    function publicarMiniIndiceUnidad(unidad, indiceUnidad, entradas) {
        const tituloUnidad = unidad.querySelector('.unidad-titulo');
        if (!tituloUnidad) return;

        const mini = document.createElement('div');
        mini.className = 'unidad-mini-indice';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'unidad-mini-indice-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span class="icono" aria-hidden="true">›</span> En esta unidad';
        toggle.onclick = () => {
            const abierto = mini.classList.toggle('abierto');
            toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        };

        const lista = document.createElement('ul');
        lista.className = 'unidad-mini-indice-lista';

        entradas.forEach(entrada => {
            const li = document.createElement('li');
            li.className = 'nivel-' + entrada.nivel;

            const link = document.createElement('a');
            link.href = '#' + entrada.id;
            link.textContent = entrada.numero + '. ' + entrada.texto;
            link.onclick = (evento) => {
                evento.preventDefault();
                const destino = document.getElementById(entrada.id);
                if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };

            li.appendChild(link);
            lista.appendChild(li);
        });

        mini.appendChild(toggle);
        mini.appendChild(lista);
        tituloUnidad.insertAdjacentElement('afterend', mini);
    }

    // --- SALTAR A UN SUB-ENCABEZADO DESDE EL SIDEBAR GLOBAL ---
    function irASubindice(indiceUnidad, idEncabezado) {
        if (!idModuloActivo) return;
        const contenedor = document.getElementById('contenido-modulo-' + idModuloActivo);
        if (!contenedor) return;
        const desarrollo = contenedor.querySelector('.modulo-desarrollo');

        const marcarYDesplazar = () => {
            document.querySelectorAll('.indice-lista .indice-item').forEach(item => {
                item.classList.toggle('actual', Number(item.dataset.unidadIndex) === indiceUnidad);
            });
            const destino = document.getElementById(idEncabezado);
            if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        if (desarrollo && desarrollo.style.display === 'none') {
            if (typeof window.iniciarModulo === 'function') window.iniciarModulo(idModuloActivo);
            setTimeout(marcarYDesplazar, 50);
        } else {
            marcarYDesplazar();
        }
    }

    // --- CALLBACK QUE RECIBE activarBarraProgreso() (js/05-modulo.js) ---
    function onProgresoUnidad(info) {
        ultimoProgreso = info;

        document.querySelectorAll('.indice-lista .indice-item').forEach(item => {
            const indice = Number(item.dataset.unidadIndex);
            const vista = info.indicesVistos.includes(indice);
            const actual = indice === info.indiceActual;

            item.classList.toggle('completado', vista);
            item.classList.toggle('actual', actual);

            const icono = item.querySelector('.indice-item-icono');
            if (icono) icono.textContent = vista ? '✓' : (actual ? '●' : '○');
        });

        actualizarResumenProgreso(info);

        // Si el panel está abierto, mantiene la unidad activa visible en la lista.
        const sidebar = document.getElementById('indice-sidebar');
        const activo = document.querySelector('.indice-lista .indice-item.actual');
        if (activo && sidebar && sidebar.classList.contains('open')) {
            activo.scrollIntoView({ block: 'nearest' });
        }
    }

    function actualizarResumenProgreso(info) {
        const porcentajeEl = document.querySelector('.indice-porcentaje');
        if (porcentajeEl) porcentajeEl.textContent = info.porcentaje + '% completado';

        const barraFill = document.querySelector('.indice-barra-fill');
        if (barraFill) barraFill.style.width = info.porcentaje + '%';

        const conteo = document.querySelector('.indice-conteo');
        if (conteo) conteo.textContent = info.indicesVistos.length + ' de ' + info.totalUnidades + ' unidades';

        const tiempoEl = document.querySelector('.indice-tiempo-restante');
        if (tiempoEl) {
            const restante = calcularTiempoRestante(info);
            tiempoEl.textContent = restante === null ? '' : (restante + ' min restantes');
        }
    }

    // --- SALTAR A UNA UNIDAD DESDE EL SIDEBAR ---
    function irAUnidad(indice) {
        if (!idModuloActivo) return;
        const contenedor = document.getElementById('contenido-modulo-' + idModuloActivo);
        if (!contenedor) return;

        const desarrollo = contenedor.querySelector('.modulo-desarrollo');
        const unidad = contenedor.querySelector('.modulo-unidad[data-unidad-index="' + indice + '"]');
        if (!unidad) return;

        const marcarYDesplazar = () => {
            document.querySelectorAll('.indice-lista .indice-item').forEach(item => {
                item.classList.toggle('actual', Number(item.dataset.unidadIndex) === indice);
            });
            unidad.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        if (desarrollo && desarrollo.style.display === 'none') {
            // El módulo sigue en la pantalla de bienvenida: revelarlo primero
            // (iniciarModulo ya existente, sin tocar) y esperar un instante a
            // que su propio scroll-to-top se aplique antes de redirigir el
            // scroll a la unidad — evita que ambas animaciones "compitan".
            // Un setTimeout corto (no requestAnimationFrame) porque solo
            // necesita ejecutarse después del scrollTo ya disparado, no
            // sincronizarse con un frame de pintado en particular.
            if (typeof window.iniciarModulo === 'function') window.iniciarModulo(idModuloActivo);
            setTimeout(marcarYDesplazar, 50);
        } else {
            marcarYDesplazar();
        }
    }

    // --- TOGGLE DEL SIDEBAR DE ÍNDICE ---
    function alternarSidebarIndice() {
        const sidebar = document.getElementById('indice-sidebar');
        const toggle = document.getElementById('indice-toggle');
        if (!sidebar || !toggle) return;

        const abierto = sidebar.classList.toggle('open');
        toggle.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    }

    // --- BOTÓN FLOTANTE: VOLVER ARRIBA DEL MÓDULO ---
    // Scroll suave dentro de la misma página (a diferencia de volverHome,
    // que es un cambio de vista y usa scroll instantáneo) — aquí sí tiene
    // sentido animarlo.
    function volverArribaModulo() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- ACCESIBILIDAD: Esc cierra el índice y devuelve el foco al toggle ---
    function inicializarCierreConEsc() {
        document.addEventListener('keydown', (evento) => {
            if (evento.key !== 'Escape') return;
            const sidebar = document.getElementById('indice-sidebar');
            const toggle = document.getElementById('indice-toggle');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.focus();
                }
            }
        });
    }

    // --- NAVBAR PEGAJOSO: sombra solo una vez que ya está fijo arriba ---
    function vigilarScrollNavbar() {
        const navbar = document.querySelector('.module-navbar');
        if (!navbar) return;
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 4);
        }, { passive: true });
    }

    // --- MODAL DE FINALIZACIÓN ---
    function finalizarModuloActual() {
        if (!idModuloActivo) return;

        const modulos = obtenerListaModulos();
        const indiceModuloActual = modulos.findIndex(m => m.id === idModuloActivo);
        const moduloInfo = modulos[indiceModuloActual];
        const siguiente = indiceModuloActual >= 0 ? modulos[indiceModuloActual + 1] : null;

        const tituloEl = document.querySelector('.modal-finalizacion-titulo');
        const textoEl = document.querySelector('.modal-finalizacion-texto');
        const progresoEl = document.querySelector('.modal-finalizacion-progreso');
        const btnSiguiente = document.getElementById('modal-finalizacion-siguiente');

        if (tituloEl) tituloEl.textContent = siguiente ? '¡Felicitaciones!' : '¡Curso completado!';

        if (textoEl) {
            const nombreModulo = moduloInfo ? ('Módulo ' + moduloInfo.id + ': ' + moduloInfo.titulo) : 'este módulo';
            textoEl.textContent = siguiente
                ? ('Has concluido exitosamente el ' + nombreModulo + '. Has fortalecido tus competencias necesarias para continuar con el siguiente módulo.')
                : ('Has concluido exitosamente el ' + nombreModulo + ' — y con él, los 6 módulos de la OVA. ¡Felicitaciones por completar el curso!');
        }

        if (progresoEl) {
            const porcentaje = ultimoProgreso ? ultimoProgreso.porcentaje : 100;
            progresoEl.textContent = porcentaje + '% completado';
        }

        if (btnSiguiente) {
            if (siguiente) {
                btnSiguiente.style.display = '';
                btnSiguiente.dataset.siguienteId = siguiente.id;
                btnSiguiente.dataset.siguienteTitulo = siguiente.titulo;
            } else {
                btnSiguiente.style.display = 'none';
            }
        }

        if (typeof window.abrirModal === 'function') window.abrirModal('modal-finalizacion');
    }

    function continuarSiguienteModulo() {
        const btn = document.getElementById('modal-finalizacion-siguiente');
        const siguienteId = btn ? btn.dataset.siguienteId : null;
        const siguienteTitulo = btn ? btn.dataset.siguienteTitulo : null;

        if (typeof window.cerrarModal === 'function') window.cerrarModal('modal-finalizacion');
        if (siguienteId && typeof window.abrirModulo === 'function') {
            window.abrirModulo(siguienteId, siguienteTitulo);
        }
    }

    // --- HELPER COMPARTIDO (usado también por js/14-busqueda-modulo.js) ---
    function obtenerDesarrolloActivo() {
        if (!idModuloActivo) return null;
        const contenedor = document.getElementById('contenido-modulo-' + idModuloActivo);
        return contenedor ? contenedor.querySelector('.modulo-desarrollo') : null;
    }

    // --- INICIALIZACIÓN (el navbar y los toggles ya existen al cargar este script) ---
    vigilarScrollNavbar();
    inicializarCierreConEsc();

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.ShellModulo.prepararModulo = prepararModulo;
    OVA.ShellModulo.onProgresoUnidad = onProgresoUnidad;
    OVA.ShellModulo.irAUnidad = irAUnidad;
    OVA.ShellModulo.alternarSidebarIndice = alternarSidebarIndice;
    OVA.ShellModulo.volverArribaModulo = volverArribaModulo;
    OVA.ShellModulo.finalizarModuloActual = finalizarModuloActual;
    OVA.ShellModulo.continuarSiguienteModulo = continuarSiguienteModulo;
    OVA.ShellModulo.obtenerDesarrolloActivo = obtenerDesarrolloActivo;
    OVA.ShellModulo.obtenerListaModulos = obtenerListaModulos;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.alternarSidebarIndice = alternarSidebarIndice;
    window.volverArribaModulo = volverArribaModulo;
    window.finalizarModuloActual = finalizarModuloActual;
    window.continuarSiguienteModulo = continuarSiguienteModulo;

})(window.OVA = window.OVA || {});

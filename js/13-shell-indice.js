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

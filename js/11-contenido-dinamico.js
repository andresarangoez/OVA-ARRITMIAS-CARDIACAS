// --- CARGA DINÁMICA GRANULAR DE CONTENIDO (CARGA_DINAMICA.md) ---
//
// Sistema INDEPENDIENTE del cargador de módulos completos que ya existe en
// 03-navegacion.js. Ese sistema carga un módulo entero de una sola vez
// (modules/modulo-XX.html). Este sistema es más fino: carga un módulo
// SECCIÓN POR SECCIÓN (introducción, unidad 1, unidad 2, caso clínico,
// actividad, resumen, autoevaluación), con navegación tipo asistente
// (Anterior/Siguiente), a partir de un manifiesto por módulo:
//
//   contenido/<carpeta-del-modulo>/manifest.json
//   contenido/<carpeta-del-modulo>/introduccion.html
//   contenido/<carpeta-del-modulo>/unidad01.html
//   ...
//
// Este archivo todavía NO está conectado a ningún módulo real (01-06):
// se activa únicamente llamando a OVA.ContenidoModulo.iniciar(carpeta, idContenedor).
// Migrar un módulo real a este sistema es una decisión aparte, posterior,
// que se toma cuando el contenido definitivo de ese módulo esté listo.

(function (OVA) {
    OVA.ContenidoModulo = OVA.ContenidoModulo || {};

    // Caché en memoria: manifiestos y fragmentos ya descargados no se vuelven
    // a pedir por red dentro de la misma sesión.
    const cacheManifiestos = {};
    const cachePasos = {};

    // Estado del asistente actualmente en pantalla (uno a la vez, igual que
    // el resto de la navegación del OVA).
    let estadoActual = null; // { carpeta, idContenedor, manifiesto, indicePaso }

    async function obtenerManifiesto(carpeta) {
        if (cacheManifiestos[carpeta]) return cacheManifiestos[carpeta];

        const respuesta = await fetch(`contenido/${carpeta}/manifest.json`);
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        const manifiesto = await respuesta.json();

        if (!Array.isArray(manifiesto.pasos) || manifiesto.pasos.length === 0) {
            throw new Error('El manifiesto de "' + carpeta + '" no tiene pasos definidos.');
        }

        cacheManifiestos[carpeta] = manifiesto;
        return manifiesto;
    }

    async function obtenerFragmentoPaso(carpeta, paso) {
        const clave = carpeta + '/' + paso.archivo;
        if (cachePasos[clave]) return cachePasos[clave];

        const respuesta = await fetch(`contenido/${carpeta}/${paso.archivo}`);
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        const html = await respuesta.text();
        cachePasos[clave] = html;
        return html;
    }

    // --- CONSTRUCCIÓN DE LA INTERFAZ (breadcrumb + barra de progreso + contenido + navegación) ---
    function construirInterfaz(contenedor) {
        contenedor.innerHTML = '';

        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        breadcrumb.setAttribute('data-rol', 'breadcrumb');

        const progresoWrap = document.createElement('div');
        progresoWrap.className = 'barra-progreso-wrap';
        progresoWrap.setAttribute('data-rol', 'progreso-wrap');

        const progresoMeta = document.createElement('div');
        progresoMeta.className = 'barra-progreso-meta';
        const progresoTexto = document.createElement('span');
        progresoTexto.setAttribute('data-rol', 'progreso-texto');
        const progresoPorcentaje = document.createElement('span');
        progresoPorcentaje.className = 'porcentaje';
        progresoPorcentaje.setAttribute('data-rol', 'progreso-porcentaje');
        progresoMeta.appendChild(progresoTexto);
        progresoMeta.appendChild(progresoPorcentaje);

        const progresoBarra = document.createElement('div');
        progresoBarra.className = 'barra-progreso';
        const progresoFill = document.createElement('div');
        progresoFill.className = 'barra-progreso-fill';
        progresoFill.setAttribute('data-rol', 'progreso-fill');
        progresoFill.style.width = '0%';
        progresoBarra.appendChild(progresoFill);

        progresoWrap.appendChild(progresoMeta);
        progresoWrap.appendChild(progresoBarra);

        const areaContenido = document.createElement('div');
        areaContenido.setAttribute('data-rol', 'area-contenido');

        const navegacion = document.createElement('div');
        navegacion.setAttribute('data-rol', 'navegacion-pasos');
        navegacion.style.display = 'flex';
        navegacion.style.justifyContent = 'space-between';
        navegacion.style.marginTop = '32px';

        const btnAnterior = document.createElement('button');
        btnAnterior.className = 'btn-back';
        btnAnterior.textContent = '← Anterior';
        btnAnterior.setAttribute('data-rol', 'btn-anterior');
        btnAnterior.addEventListener('click', () => irAlPasoAnterior());

        const btnSiguiente = document.createElement('button');
        btnSiguiente.className = 'btn-comenzar';
        btnSiguiente.textContent = 'Siguiente →';
        btnSiguiente.setAttribute('data-rol', 'btn-siguiente');
        btnSiguiente.addEventListener('click', () => irAlPasoSiguiente());

        navegacion.appendChild(btnAnterior);
        navegacion.appendChild(btnSiguiente);

        contenedor.appendChild(breadcrumb);
        contenedor.appendChild(progresoWrap);
        contenedor.appendChild(areaContenido);
        contenedor.appendChild(navegacion);
    }

    function actualizarBreadcrumb(contenedor) {
        const { manifiesto, indicePaso } = estadoActual;
        const paso = manifiesto.pasos[indicePaso];
        const breadcrumb = contenedor.querySelector('[data-rol="breadcrumb"]');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';
        const partes = ['Inicio', manifiesto.titulo || 'Módulo', paso.titulo || paso.id];
        partes.forEach((texto, i) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-item' + (i === partes.length - 1 ? ' actual' : '');
            span.textContent = texto;
            breadcrumb.appendChild(span);
            if (i < partes.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-separador';
                sep.textContent = '>';
                breadcrumb.appendChild(sep);
            }
        });
    }

    function actualizarBarraProgreso(contenedor) {
        const { manifiesto, indicePaso } = estadoActual;
        const total = manifiesto.pasos.length;
        const numeroActual = indicePaso + 1;
        const porcentaje = Math.round((numeroActual / total) * 100);

        const textoEl = contenedor.querySelector('[data-rol="progreso-texto"]');
        const porcentajeEl = contenedor.querySelector('[data-rol="progreso-porcentaje"]');
        const fillEl = contenedor.querySelector('[data-rol="progreso-fill"]');

        if (textoEl) textoEl.textContent = `Paso ${numeroActual} de ${total}`;
        if (porcentajeEl) porcentajeEl.textContent = `${porcentaje}%`;
        if (fillEl) fillEl.style.width = porcentaje + '%';
    }

    function actualizarBotonesNavegacion(contenedor) {
        const { manifiesto, indicePaso } = estadoActual;
        const btnAnterior = contenedor.querySelector('[data-rol="btn-anterior"]');
        const btnSiguiente = contenedor.querySelector('[data-rol="btn-siguiente"]');

        if (btnAnterior) {
            btnAnterior.style.visibility = indicePaso === 0 ? 'hidden' : 'visible';
        }
        if (btnSiguiente) {
            const esUltimoPaso = indicePaso === manifiesto.pasos.length - 1;
            btnSiguiente.textContent = esUltimoPaso ? 'Finalizar ✓' : 'Siguiente →';
        }
    }

    async function mostrarPasoActual() {
        const { carpeta, idContenedor, manifiesto, indicePaso } = estadoActual;
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) return;

        const paso = manifiesto.pasos[indicePaso];
        const areaContenido = contenedor.querySelector('[data-rol="area-contenido"]');

        actualizarBreadcrumb(contenedor);
        actualizarBarraProgreso(contenedor);
        actualizarBotonesNavegacion(contenedor);

        if (areaContenido) areaContenido.innerHTML = '<div class="modulo-cargando">Cargando contenido…</div>';

        try {
            const html = await obtenerFragmentoPaso(carpeta, paso);
            if (areaContenido) areaContenido.innerHTML = html;
        } catch (error) {
            console.error('No se pudo cargar el paso "' + paso.id + '" del módulo "' + carpeta + '":', error);
            if (areaContenido) {
                areaContenido.innerHTML =
                    '<div class="modulo-error">⚠️ No se pudo cargar esta sección. ' +
                    'Verifica tu conexión con el servidor local e inténtalo de nuevo.</div>';
            }
        }
    }

    async function iniciar(carpeta, idContenedor) {
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) {
            console.error('No existe el contenedor #' + idContenedor + ' para OVA.ContenidoModulo.iniciar()');
            return;
        }

        contenedor.innerHTML = '<div class="modulo-cargando">Cargando módulo…</div>';

        let manifiesto;
        try {
            manifiesto = await obtenerManifiesto(carpeta);
        } catch (error) {
            console.error('No se pudo cargar el manifiesto de "' + carpeta + '":', error);
            contenedor.innerHTML =
                '<div class="modulo-error">⚠️ No se pudo cargar este módulo. ' +
                'Verifica tu conexión con el servidor local e inténtalo de nuevo.</div>';
            return;
        }

        estadoActual = { carpeta, idContenedor, manifiesto, indicePaso: 0 };
        construirInterfaz(contenedor);
        await mostrarPasoActual();
    }

    function irAlPasoSiguiente() {
        if (!estadoActual) return;
        const { manifiesto, indicePaso } = estadoActual;
        if (indicePaso >= manifiesto.pasos.length - 1) return; // ya está en el último paso
        estadoActual.indicePaso++;
        mostrarPasoActual();
    }

    function irAlPasoAnterior() {
        if (!estadoActual) return;
        if (estadoActual.indicePaso <= 0) return;
        estadoActual.indicePaso--;
        mostrarPasoActual();
    }

    function irAlPaso(indice) {
        if (!estadoActual) return;
        const { manifiesto } = estadoActual;
        if (indice < 0 || indice >= manifiesto.pasos.length) return;
        estadoActual.indicePaso = indice;
        mostrarPasoActual();
    }

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.ContenidoModulo.iniciar = iniciar;
    OVA.ContenidoModulo.irAlPasoSiguiente = irAlPasoSiguiente;
    OVA.ContenidoModulo.irAlPasoAnterior = irAlPasoAnterior;
    OVA.ContenidoModulo.irAlPaso = irAlPaso;

})(window.OVA = window.OVA || {});

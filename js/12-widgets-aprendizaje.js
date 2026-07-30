// --- WIDGETS DE APRENDIZAJE INTERACTIVOS ---
// Mismo patrón que 05-modulo.js y 10-componentes.js: funciones expuestas
// vía onclick="" en el HTML. Genéricos a propósito (no específicos de un
// tema clínico) para que cualquier módulo pueda reutilizar el mismo
// stepper, diagrama de nodos, reto de emparejar o mini reto con su propio
// contenido, sin tocar este archivo.

(function (OVA) {
    OVA.WidgetsAprendizaje = OVA.WidgetsAprendizaje || {};

    // --- STEPPER DE FASES ---
    // Uso: <div class="stepper-fases">
    //        <div class="stepper-nav"><button onclick="activarPasoStepper(this,'fase0')">...</button></div>
    //        <div class="stepper-panel activo" data-paso="fase0">...</div>
    //        <div class="stepper-panel" data-paso="fase1">...</div>
    //      </div>
    function activarPasoStepper(boton, idPaso) {
        const contenedor = boton.closest('.stepper-fases');
        if (!contenedor) return;

        contenedor.querySelectorAll('.stepper-nav button').forEach(b => b.classList.remove('activo'));
        boton.classList.add('activo');

        contenedor.querySelectorAll('.stepper-panel').forEach(panel => {
            panel.classList.toggle('activo', panel.dataset.paso === idPaso);
        });
    }

    // --- DIAGRAMA DE NODOS ---
    // Uso: <div class="diagrama-nodos-wrap">
    //        <div class="diagrama-nodos"><button class="nodo" onclick="activarNodoDiagrama(this,'sa')">...</button></div>
    //        <div class="diagrama-nodos-detalle-grupo">
    //          <div class="diagrama-nodos-detalle activo" data-nodo="sa">...</div>
    //          <div class="diagrama-nodos-detalle" data-nodo="av">...</div>
    //        </div>
    //      </div>
    function activarNodoDiagrama(boton, idNodo) {
        const envoltorio = boton.closest('.diagrama-nodos-wrap');
        if (!envoltorio) return;

        envoltorio.querySelectorAll('.nodo').forEach(n => n.classList.remove('activo'));
        boton.classList.add('activo');

        envoltorio.querySelectorAll('.diagrama-nodos-detalle').forEach(detalle => {
            detalle.classList.toggle('activo', detalle.dataset.nodo === idNodo);
        });
    }

    // --- RETO DE EMPAREJAR (tap-to-pair) ---
    // Uso: <div class="reto-emparejar">
    //        <p class="reto-emparejar-progreso">0 de 4 emparejados</p>
    //        <div class="reto-emparejar-columna">
    //          <button class="reto-emparejar-item" data-par="p" onclick="manejarClicEmparejar(this)">Onda P</button>
    //        </div>
    //        <div class="reto-emparejar-columna">
    //          <button class="reto-emparejar-item" data-par="p" onclick="manejarClicEmparejar(this)">Despolarización auricular</button>
    //        </div>
    //      </div>
    // Se emparejan por el atributo data-par compartido entre un ítem de cada
    // columna — nunca dos ítems de la misma columna.
    function manejarClicEmparejar(item) {
        if (item.classList.contains('correcto')) return;

        const contenedor = item.closest('.reto-emparejar');
        if (!contenedor) return;

        const seleccionActual = contenedor.querySelector('.reto-emparejar-item.seleccionado');

        if (item === seleccionActual) {
            item.classList.remove('seleccionado');
            return;
        }

        if (!seleccionActual) {
            item.classList.add('seleccionado');
            return;
        }

        const columnaSeleccion = seleccionActual.closest('.reto-emparejar-columna');
        const columnaItem = item.closest('.reto-emparejar-columna');

        // Dos clics en la misma columna: mover la selección, no comparar.
        if (columnaSeleccion === columnaItem) {
            seleccionActual.classList.remove('seleccionado');
            item.classList.add('seleccionado');
            return;
        }

        if (seleccionActual.dataset.par === item.dataset.par) {
            seleccionActual.classList.remove('seleccionado');
            seleccionActual.classList.add('correcto');
            item.classList.add('correcto');
            actualizarProgresoEmparejar(contenedor);
        } else {
            seleccionActual.classList.add('incorrecto');
            item.classList.add('incorrecto');
            setTimeout(() => {
                seleccionActual.classList.remove('seleccionado', 'incorrecto');
                item.classList.remove('incorrecto');
            }, 500);
        }
    }

    function actualizarProgresoEmparejar(contenedor) {
        const total = contenedor.querySelectorAll('.reto-emparejar-item').length / 2;
        const correctos = contenedor.querySelectorAll('.reto-emparejar-item.correcto').length / 2;
        const progreso = contenedor.querySelector('.reto-emparejar-progreso');
        if (!progreso) return;

        progreso.textContent = correctos === total
            ? `${correctos} de ${total} emparejados — ¡Completado!`
            : `${correctos} de ${total} emparejados`;
    }

    // --- MINI RETO ---
    // Uso: <div class="mini-reto">
    //        <p class="mini-reto-enunciado">...</p>
    //        <div class="actividad-opciones">
    //          <label class="actividad-opcion"><input type="radio" name="mr-x" data-correcta="true"> ...</label>
    //        </div>
    //        <button onclick="verificarMiniReto(this)">Comprobar</button>
    //        <p class="mini-reto-feedback"></p>
    //      </div>
    // La respuesta correcta vive en el HTML (data-correcta="true" en el
    // input correcto) — este código solo la lee, nunca la inventa.
    function verificarMiniReto(boton) {
        const contenedor = boton.closest('.mini-reto');
        if (!contenedor) return;

        const seleccionada = contenedor.querySelector('input[type="radio"]:checked');
        const feedback = contenedor.querySelector('.mini-reto-feedback');
        if (!feedback) return;

        if (!seleccionada) {
            feedback.textContent = 'Selecciona una opción antes de comprobar.';
            feedback.className = 'mini-reto-feedback';
            return;
        }

        const esCorrecta = seleccionada.dataset.correcta === 'true';
        feedback.textContent = esCorrecta
            ? '✅ Correcto.'
            : '❌ No es correcto — vuelve a leer el concepto de esta unidad e inténtalo de nuevo.';
        feedback.className = 'mini-reto-feedback ' + (esCorrecta ? 'correcto' : 'incorrecto');
    }

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.WidgetsAprendizaje.activarPasoStepper = activarPasoStepper;
    OVA.WidgetsAprendizaje.activarNodoDiagrama = activarNodoDiagrama;
    OVA.WidgetsAprendizaje.manejarClicEmparejar = manejarClicEmparejar;
    OVA.WidgetsAprendizaje.verificarMiniReto = verificarMiniReto;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN EL HTML ---
    window.activarPasoStepper = activarPasoStepper;
    window.activarNodoDiagrama = activarNodoDiagrama;
    window.manejarClicEmparejar = manejarClicEmparejar;
    window.verificarMiniReto = verificarMiniReto;

})(window.OVA = window.OVA || {});

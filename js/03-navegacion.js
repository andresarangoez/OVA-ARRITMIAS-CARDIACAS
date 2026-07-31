(function (OVA) {
    OVA.Navegacion = OVA.Navegacion || {};

    // --- FUENTE ÚNICA DE VERDAD: qué módulos incluyen el simulador ECG ---
    // Antes esto se decidía con un tercer argumento repetido a mano en cada
    // onclick="abrirModulo(...)" de index.html (riesgo de copiar mal true/false).
    // Ahora basta con mantener esta lista actualizada en un solo lugar.
    const MODULOS_CON_SIMULADOR = ['03', '05', '06'];

    // --- CARGA DINÁMICA DE CONTENIDO DE MÓDULOS ---
    // Cada módulo vive en su propio archivo (modules/modulo-XX.html) y se
    // carga bajo demanda la primera vez que el estudiante lo abre. Una vez
    // cargado, su HTML se guarda en cacheModulos para no volver a pedirlo
    // por red en visitas posteriores dentro de la misma sesión.
    const cacheModulos = {};

    async function cargarContenidoModulo(idModulo, contenedor) {
        if (cacheModulos[idModulo]) {
            contenedor.innerHTML = cacheModulos[idModulo];
            return true;
        }

        const src = contenedor.getAttribute('data-src');
        if (!src) {
            // Módulo sin externalizar (aún no migrado a este patrón).
            return true;
        }

        contenedor.innerHTML = '<div class="modulo-cargando">Cargando contenido del módulo…</div>';

        try {
            const respuesta = await fetch(src);
            if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
            const html = await respuesta.text();
            cacheModulos[idModulo] = html;
            contenedor.innerHTML = html;
            return true;
        } catch (error) {
            console.error('No se pudo cargar el módulo ' + idModulo + ':', error);
            contenedor.innerHTML =
                '<div class="modulo-error">⚠️ No se pudo cargar el contenido de este módulo. ' +
                'Verifica tu conexión con el servidor local (Live Server) e inténtalo de nuevo.</div>';
            return false;
        }
    }

    async function abrirModulo(idModulo, titulo) {
        document.getElementById('vista-home').classList.remove('view-active');
        document.getElementById('vista-home').classList.add('view-hidden');

        document.getElementById('vista-modulo').classList.remove('view-hidden');
        document.getElementById('vista-modulo').classList.add('view-active');

        document.getElementById('titulo-modulo-activo').innerText = "Módulo " + idModulo + ": " + titulo;

        // Siempre se abre un módulo desde su pantalla de bienvenida (ver más
        // abajo), así que el título del módulo debe quedar visible arriba —
        // nunca arrastrar el scroll de la vista anterior.
        window.scrollTo(0, 0);

        // Los FAB de índice/volver-arriba (css/11-shell-modulo.css) solo
        // tienen sentido dentro de un módulo — se muestran/ocultan vía esta
        // clase en vez de vivir anidados en #vista-modulo, para no quedar
        // ligados al containing block que crea su animación fadeIn.
        document.body.classList.add('modo-modulo');

        const todosLosContenidos = document.querySelectorAll('[id^="contenido-modulo-"]');
        todosLosContenidos.forEach(div => {
            div.style.display = 'none';
        });

        const contenidoActivo = document.getElementById('contenido-modulo-' + idModulo);
        if (contenidoActivo) {
            contenidoActivo.style.display = 'block';

            const cargadoCorrectamente = await cargarContenidoModulo(idModulo, contenidoActivo);

            // Si el módulo sigue el estándar de bienvenida/desarrollo (05-modulo.js),
            // siempre debe arrancar en la pantalla de bienvenida al entrar de nuevo.
            if (cargadoCorrectamente && OVA.ModuloUI && typeof OVA.ModuloUI.reiniciarEstadoModulo === 'function') {
                OVA.ModuloUI.reiniciarEstadoModulo(idModulo);
            }
        }

        // El simulador NUNCA se muestra en la pantalla de bienvenida — solo
        // debe aparecer una vez que el estudiante entra al desarrollo del
        // módulo (ver iniciarModulo en 05-modulo.js), aunque el módulo sea
        // uno de los que sí lo incluyen.
        const simulador = document.getElementById('simulador-wrapper');
        if (simulador) {
            simulador.style.display = 'none';
        }
    }

    function volverHome() {
        // Reset del scroll ANTES del swap de vistas (no después): en este
        // punto el documento todavía es el módulo largo, así que volver a
        // 0 es inmediato y no compite con el reflow que provoca el cambio
        // de display de las vistas. Sin esto, el navegador clampa el
        // scroll a la altura de la home (más corta) y el usuario aterriza
        // cerca del footer en vez de arriba del todo.
        window.scrollTo(0, 0);

        document.getElementById('vista-modulo').classList.remove('view-active');
        document.getElementById('vista-modulo').classList.add('view-hidden');

        document.getElementById('vista-home').classList.remove('view-hidden');
        document.getElementById('vista-home').classList.add('view-active');

        document.getElementById('titulo-modulo-activo').innerText = "Objeto Virtual de Aprendizaje: manejo de arritmias cardiacas";

        const simulador = document.getElementById('simulador-wrapper');
        if (simulador) {
            simulador.style.display = 'block';
        }

        document.body.classList.remove('modo-modulo');
    }

    // --- ACCESIBILIDAD: activar tarjetas de módulo con Enter/Espacio ---
    document.querySelectorAll('.module-card').forEach(function(card) {
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.Navegacion.abrirModulo = abrirModulo;
    OVA.Navegacion.volverHome = volverHome;
    OVA.Navegacion.MODULOS_CON_SIMULADOR = MODULOS_CON_SIMULADOR;

    // --- EXPOSICIÓN MÍNIMA PARA onclick="" EN index.html ---
    window.abrirModulo = abrirModulo;
    window.volverHome = volverHome;

})(window.OVA = window.OVA || {});

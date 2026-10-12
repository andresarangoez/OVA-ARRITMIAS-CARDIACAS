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

    // Pide un módulo y comprueba que llegó entero.
    //
    // Una descarga cortada a medias no siempre lanza un error: el navegador
    // entrega lo que alcanzó a llegar, el decodificador deja un U+FFFD donde
    // se partió un carácter de varios bytes, y el analizador de HTML cierra
    // solo las etiquetas que quedaron abiertas. El resultado es un módulo que
    // parece completo salvo por el final —una tabla a la que le faltan filas,
    // una unidad que se corta— y que, al guardarse en caché, se queda así el
    // resto de la sesión. Ya ocurrió con la Unidad 6 del Módulo 01.
    //
    // La comprobación de tamaño no da falsos positivos con compresión: si la
    // respuesta viene comprimida, Content-Length es el tamaño comprimido y lo
    // recibido es mayor, nunca menor.
    async function pedirModulo(src) {
        const respuesta = await fetch(src);
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);

        const html = await respuesta.text();

        const declarado = Number(respuesta.headers.get('Content-Length'));
        if (declarado) {
            const recibido = new TextEncoder().encode(html).byteLength;
            if (recibido < declarado) {
                throw new Error('respuesta incompleta: ' + recibido + ' de ' + declarado + ' bytes');
            }
        }
        if (html.indexOf('�') !== -1) {
            throw new Error('el contenido llegó con caracteres rotos');
        }

        return html;
    }

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
            // Dos intentos: una descarga cortada no es un error del servidor
            // ni de la red que vuelva a fallar necesariamente al repetirla.
            let html;
            try {
                html = await pedirModulo(src);
            } catch (primerIntento) {
                console.warn('Reintentando la carga del módulo ' + idModulo + ':', primerIntento.message);
                html = await pedirModulo(src);
            }
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

    function ocultarSimulador() {
        const simulador = document.getElementById('simulador-wrapper');
        if (simulador) simulador.style.display = 'none';
    }

    async function abrirModulo(idModulo, titulo) {
        // Lo PRIMERO, antes de descubrir la vista del módulo: esconder el
        // simulador. Al final de esta función también se esconde, pero para
        // entonces ya ha pasado el `await` de cargarContenidoModulo(), y el
        // navegador ha tenido ocasión de pintar la vista con el monitor de la
        // visita anterior todavía encima. Eso era el parpadeo: un fotograma
        // de monitor antes de la pantalla de bienvenida, también en módulos
        // que ni siquiera llevan simulador.
        ocultarSimulador();

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

        // El simulador se traslada al apartado de recurso interactivo del
        // módulo mientras se está dentro (iniciarModulo, en 05-modulo.js).
        // Hay que devolverlo a su sitio AQUÍ, antes de que
        // cargarContenidoModulo() reemplace el innerHTML del contenedor:
        // si siguiera dentro, se lo llevaría por delante.
        if (OVA.ModuloUI && typeof OVA.ModuloUI.devolverSimuladorASuSitio === 'function') {
            OVA.ModuloUI.devolverSimuladorASuSitio();
        }

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

        // Se repite al final a propósito: entre medias ha corrido
        // reiniciarEstadoModulo(), y el módulo podría haber quedado en un
        // estado que lo revele. El simulador NUNCA se muestra en la pantalla
        // de bienvenida, solo al entrar al desarrollo (iniciarModulo, en
        // 05-modulo.js), aunque el módulo sea de los que sí lo incluyen.
        ocultarSimulador();
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

        // Al salir del módulo el simulador se esconde. Antes se ponía en
        // 'block' —resto de una versión en la que vivía en la portada—, y como
        // vive dentro de #vista-modulo eso no se notaba estando en el inicio:
        // se notaba al entrar al módulo siguiente, que descubría la vista con
        // el monitor ya encima. Esa era la raíz del parpadeo.
        ocultarSimulador();

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

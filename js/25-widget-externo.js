(function (OVA) {
    OVA.WidgetExterno = OVA.WidgetExterno || {};

// --- ALTO DE LOS CÓDIGOS INTERACTIVOS ---
//
// Los códigos de widgets/ se muestran dentro de un iframe, y un iframe no
// crece con su contenido: se queda en el alto que le den. Cada código avisa
// del suyo al cargar y cada vez que cambia (ver el script que lleva al final),
// y aquí se le ajusta el marco.
//
// Leer el alto desde el OVA —contentDocument.body.scrollHeight— sería más
// corto, pero falla cuando la página se abre con file://, que es como se
// revisa un paquete SCORM antes de subirlo. El aviso por mensaje funciona en
// los dos casos.
//
// El OVA pide la medida además de esperarla, porque el módulo se muestra con
// display:none hasta que el estudiante pulsa «Comenzar»: un marco que cargó
// mientras estaba oculto se midió a sí mismo en cero y no tendría por qué
// volver a medirse nunca.

const ALTO_MAXIMO = 20000;

function pedirMedida(marco) {
    if (marco.contentWindow) marco.contentWindow.postMessage({ ova: 'medir' }, '*');
}

function alAvisar(evento) {
    const dato = evento.data;
    if (!dato || dato.ova !== 'alto' || typeof dato.alto !== 'number') return;

    // El mensaje solo se atiende si viene de uno de los marcos del módulo:
    // cualquier otra ventana que escriba en este canal se ignora.
    const marcos = document.querySelectorAll('iframe.widget-ova');
    for (const marco of marcos) {
        if (marco.contentWindow === evento.source) {
            marco.style.height = Math.min(Math.max(dato.alto, 200), ALTO_MAXIMO) + 'px';
            return;
        }
    }
}

// Al asomarse a la pantalla es cuando el marco ya tiene ancho y puede medirse
// de verdad; también es cuando el navegador termina de cargarlo, porque son
// marcos con loading="lazy".
const aLaVista = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
        if (entrada.isIntersecting) pedirMedida(entrada.target);
    });
}, { rootMargin: '600px' });

function vigilar(marco) {
    if (marco.dataset.vigilado === 'true') return;
    marco.dataset.vigilado = 'true';
    marco.addEventListener('load', () => pedirMedida(marco));
    aLaVista.observe(marco);
}

const observador = new MutationObserver((mutaciones) => {
    mutaciones.forEach((mutacion) => {
        mutacion.addedNodes.forEach((nodo) => {
            if (nodo.nodeType !== 1) return;
            const marcos = nodo.matches && nodo.matches('iframe.widget-ova')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('iframe.widget-ova')) : []);
            marcos.forEach(vigilar);
        });
    });
});

window.addEventListener('message', alAvisar);

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.WidgetExterno.pedirMedida = pedirMedida;

})(window.OVA = window.OVA || {});

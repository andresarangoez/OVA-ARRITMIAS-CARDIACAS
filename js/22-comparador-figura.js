(function (OVA) {
    OVA.ComparadorFigura = OVA.ComparadorFigura || {};

// --- COMPARADOR DE DOS VERSIONES DE UNA MISMA FIGURA (Módulo 01, Unidad 4) ---
//
// La Figura 4.2 existe en dos versiones del mismo encuadre —con prenda y sin
// prenda— y ambas enseñan lo mismo: dónde van los seis electrodos
// precordiales. En línea se ve una sola a la vez, con dos flechas para
// cambiar. Al ampliarla se superponen y un divisor vertical descubre una u
// otra en tiempo real, que es la forma de comprobar que los electrodos caen
// en el mismo punto anatómico lleve o no lleve prenda el paciente.
//
// La superposición se hace con clip-path sobre la imagen de encima, no con un
// contenedor de ancho variable: así las dos capas conservan exactamente el
// mismo tamaño y no hay desplazamiento al mover el divisor.
//
// Los módulos se inyectan con innerHTML, de modo que todo cuelga de los
// onclick declarados en el HTML; no hace falta ningún arranque automático.

let arrastrando = false;

function raizDe(nodo) {
    return nodo.closest('.comparador');
}

// --- VISTA EN LÍNEA ---

function mover(boton, paso) {
    const raiz = raizDe(boton);
    if (!raiz) return;

    const imagenes = Array.from(raiz.querySelectorAll('.comparador-img'));
    const actual = parseInt(raiz.dataset.actual || '0', 10);
    const siguiente = (actual + paso + imagenes.length) % imagenes.length;

    imagenes.forEach((img, i) => img.classList.toggle('activa', i === siguiente));
    raiz.dataset.actual = siguiente;

    const rotulo = raiz.querySelector('.comparador-rotulo');
    if (rotulo) rotulo.textContent = imagenes[siguiente].dataset.rotulo || '';
}

// --- VISTA AMPLIADA, CON DIVISOR ---

function ampliar(boton) {
    const raiz = raizDe(boton);
    if (!raiz) return;

    const imagenes = Array.from(raiz.querySelectorAll('.comparador-img'));
    const encima = imagenes.find((img) => img.dataset.capa === 'encima') || imagenes[0];
    const base = imagenes.find((img) => img.dataset.capa === 'base') || imagenes[1];

    const zoom = document.querySelector('#modal-comparador .comparador-zoom');
    if (!zoom) return;

    zoom.querySelector('.comparador-zoom-base').src = base.src;
    zoom.querySelector('.comparador-zoom-base').alt = base.alt;
    zoom.querySelector('.comparador-zoom-encima').src = encima.src;
    zoom.querySelector('.comparador-zoom-encima').alt = encima.alt;

    const pies = document.querySelectorAll('#modal-comparador .comparador-zoom-pie span');
    if (pies.length === 2) {
        pies[0].textContent = encima.dataset.rotulo || '';
        pies[1].textContent = base.dataset.rotulo || '';
    }

    fijar(50);
    if (typeof abrirModal === 'function') abrirModal('modal-comparador');
}

function fijar(porcentaje) {
    const zoom = document.querySelector('#modal-comparador .comparador-zoom');
    if (!zoom) return;
    const valor = Math.min(Math.max(porcentaje, 0), 100);
    zoom.style.setProperty('--pos', valor + '%');
    const asa = zoom.querySelector('.comparador-zoom-divisor');
    if (asa) asa.setAttribute('aria-valuenow', Math.round(valor));
}

function porcentajeDesde(zoom, clientX) {
    const r = zoom.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
}

function iniciarArrastre(ev) {
    const zoom = ev.currentTarget;
    arrastrando = true;
    fijar(porcentajeDesde(zoom, ev.clientX));
    ev.preventDefault();

    const mover = (e) => { if (arrastrando) fijar(porcentajeDesde(zoom, e.clientX)); };
    const soltar = () => {
        arrastrando = false;
        document.removeEventListener('pointermove', mover);
        document.removeEventListener('pointerup', soltar);
        document.removeEventListener('pointercancel', soltar);
    };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
    document.addEventListener('pointercancel', soltar);
}

function conTeclado(ev) {
    const paso = ev.key === 'ArrowLeft' ? -4 : ev.key === 'ArrowRight' ? 4 : 0;
    if (!paso) return;
    ev.preventDefault();
    const zoom = document.querySelector('#modal-comparador .comparador-zoom');
    if (!zoom) return;
    const actual = parseFloat(zoom.style.getPropertyValue('--pos')) || 50;
    fijar(actual + paso);
}

    // --- API PÚBLICA DEL NAMESPACE ---
    OVA.ComparadorFigura.mover = mover;
    OVA.ComparadorFigura.ampliar = ampliar;
    OVA.ComparadorFigura.fijar = fijar;
    OVA.ComparadorFigura.iniciarArrastre = iniciarArrastre;
    OVA.ComparadorFigura.conTeclado = conTeclado;

    window.comparadorMover = mover;
    window.comparadorAmpliar = ampliar;

})(window.OVA = window.OVA || {});

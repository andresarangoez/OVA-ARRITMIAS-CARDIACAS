(function (OVA) {
    OVA.TiraECG = OVA.TiraECG || {};

// --- TIRA DE ECG ESTÁTICA Y CALIBRADA ---
//
// Dibuja un trazado quieto sobre papel milimetrado, usando el MISMO motor
// matemático que el simulador del OVA (js/02-motor-ecg.js). No es una imagen
// ni una curva decorativa: cada punto sale de MotorMatematicoECG con el ritmo
// y la frecuencia que ese ritmo tiene en RITMOS_DB (js/01-data-ritmos.js).
//
// Por qué estática y no animada, como el simulador:
//
// · Sobre un trazado que corre no se puede medir. Los recursos de los módulos
//   02 y 03 piden contar cuadros entre dos R, mirar si el PR es constante o
//   comparar dos trazados — todo eso exige que la imagen se quede quieta.
// · El motor es determinista si se avanza con un paso fijo: la misma llamada
//   da siempre la misma tira, así que el trazado que el estudiante mide es el
//   mismo que se usó para calcular la respuesta correcta.
// · No depende de requestAnimationFrame, que es lo que anima el simulador.
//
// La calibración es la del papel real: 25 mm/s en horizontal y 10 mm/mV en
// vertical. Eso es lo que hace que contar cuadros signifique algo — un cuadro
// pequeño son 0,04 s y uno grande 0,20 s, igual que en una tira impresa.

const MM_POR_SEGUNDO = 25;      // velocidad estándar del papel
const PX_POR_MM = 4;            // resolución del lienzo
const MM_POR_UNIDAD = 0.14;     // el motor da ~80 unidades en la R, que así mide ~11 mm

// Los ritmos cuya morfología depende de performance.now() (los caóticos) no
// son reproducibles entre dos dibujos. Se pueden dibujar igual —su aspecto es
// irregular por definición—, pero no sirven para medir.
const NO_MEDIBLES = ['fv', 'tv_poli', 'torsades', 'asistolia'];

function dibujar(lienzo, opciones) {
    const o = opciones || {};
    const ritmo = o.ritmo || 'sinusal';
    const segundos = o.segundos || 6;
    const DB = OVA.Ritmos && OVA.Ritmos.RITMOS_DB;
    const Motor = OVA.MotorECG && OVA.MotorECG.MotorMatematicoECG;
    if (!DB || !Motor || !DB[ritmo] || !lienzo) return null;

    const fc = o.fc != null ? o.fc : DB[ritmo].hmd.fc;
    const anchoMm = segundos * MM_POR_SEGUNDO;
    const altoMm = o.altoMm || 28;

    // El lienzo se dimensiona en píxeles reales y se escala por CSS, para que
    // no se vea borroso en pantallas de alta densidad.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const anchoPx = Math.round(anchoMm * PX_POR_MM);
    const altoPx = Math.round(altoMm * PX_POR_MM);
    lienzo.width = anchoPx * dpr;
    lienzo.height = altoPx * dpr;
    lienzo.style.width = '100%';
    lienzo.style.aspectRatio = anchoPx + ' / ' + altoPx;

    const c = lienzo.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, anchoPx, altoPx);

    dibujarPapel(c, anchoPx, altoPx);

    // --- Trazado ---
    const motor = new Motor();
    const dt = 2;                               // ms por muestra
    const muestras = Math.round(segundos * 1000 / dt);
    const linea = altoPx * 0.62;                // línea isoeléctrica
    const picos = [];

    c.beginPath();
    c.lineWidth = 1.7;
    c.strokeStyle = o.color || '#15803d';
    c.lineJoin = 'round';
    c.lineCap = 'round';

    let arriba = false;
    for (let i = 0; i < muestras; i++) {
        const v = motor.obtenerVoltaje(dt, ritmo, fc);
        const x = (i / muestras) * anchoPx;
        const y = linea - v * MM_POR_UNIDAD * PX_POR_MM;
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);

        // Posición de cada R, para poder marcar los R-R sin volver a calcular.
        if (!arriba && v > 40) { picos.push({ x: x, t: i * dt / 1000 }); arriba = true; }
        if (arriba && v < 10) arriba = false;
    }
    c.stroke();

    return {
        ritmo: ritmo, fc: fc, segundos: segundos,
        anchoPx: anchoPx, altoPx: altoPx, linea: linea,
        pxPorMm: PX_POR_MM, mmPorSegundo: MM_POR_SEGUNDO,
        picos: picos,
        medible: NO_MEDIBLES.indexOf(ritmo) === -1
    };
}

// Papel milimetrado: cuadro pequeño de 1 mm (0,04 s) y grande de 5 mm (0,20 s).
function dibujarPapel(c, ancho, alto) {
    c.fillStyle = '#fff5f5';
    c.fillRect(0, 0, ancho, alto);

    const paso = PX_POR_MM;
    c.lineWidth = 1;

    c.strokeStyle = 'rgba(214, 120, 120, 0.30)';
    c.beginPath();
    for (let x = 0; x <= ancho; x += paso) { c.moveTo(x + .5, 0); c.lineTo(x + .5, alto); }
    for (let y = 0; y <= alto; y += paso) { c.moveTo(0, y + .5); c.lineTo(ancho, y + .5); }
    c.stroke();

    c.strokeStyle = 'rgba(199, 90, 90, 0.55)';
    c.beginPath();
    for (let x = 0; x <= ancho; x += paso * 5) { c.moveTo(x + .5, 0); c.lineTo(x + .5, alto); }
    for (let y = 0; y <= alto; y += paso * 5) { c.moveTo(0, y + .5); c.lineTo(ancho, y + .5); }
    c.stroke();
}

// Nombre legible de cada ritmo, leído del <select> del simulador para no
// mantener una segunda lista en paralelo.
function nombre(clave) {
    const op = document.querySelector('#selectorRitmo option[value="' + clave + '"]');
    return op ? op.textContent.trim() : clave;
}

// Monta las tiras declaradas en el HTML con <div class="tira-ecg"
// data-ritmo="..." data-segundos="..."> y un pie opcional.
function montar(raiz) {
    if (raiz.dataset.listo === 'true') return;
    raiz.dataset.listo = 'true';

    const lienzo = document.createElement('canvas');
    lienzo.className = 'tira-ecg-lienzo';
    lienzo.setAttribute('role', 'img');
    raiz.appendChild(lienzo);

    const info = dibujar(lienzo, {
        ritmo: raiz.dataset.ritmo,
        segundos: Number(raiz.dataset.segundos) || 6
    });
    if (!info) { raiz.dataset.listo = 'false'; return; }

    lienzo.setAttribute('aria-label',
        'Trazado electrocardiográfico de ' + nombre(info.ritmo).toLowerCase() +
        ', ' + info.segundos + ' segundos a ' + MM_POR_SEGUNDO + ' mm/s.');

    const pie = document.createElement('p');
    pie.className = 'tira-ecg-pie';
    pie.innerHTML = '<span class="tira-ecg-calibre">' + info.segundos + ' s · ' + MM_POR_SEGUNDO
                  + ' mm/s · 10 mm/mV</span>'
                  + (raiz.dataset.pie ? ' ' + raiz.dataset.pie : '');
    raiz.appendChild(pie);
}

const observador = new MutationObserver(function (ms) {
    ms.forEach(function (m) {
        m.addedNodes.forEach(function (nodo) {
            if (nodo.nodeType !== 1) return;
            const raices = nodo.classList && nodo.classList.contains('tira-ecg')
                ? [nodo]
                : (nodo.querySelectorAll ? Array.from(nodo.querySelectorAll('.tira-ecg')) : []);
            raices.forEach(montar);
        });
    });
});

const vistaModulo = document.getElementById('vista-modulo');
if (vistaModulo) observador.observe(vistaModulo, { childList: true, subtree: true });

    OVA.TiraECG.dibujar = dibujar;
    OVA.TiraECG.montar = montar;
    OVA.TiraECG.nombre = nombre;
    OVA.TiraECG.MM_POR_SEGUNDO = MM_POR_SEGUNDO;
    OVA.TiraECG.PX_POR_MM = PX_POR_MM;
    OVA.TiraECG.NO_MEDIBLES = NO_MEDIBLES;

})(window.OVA = window.OVA || {});

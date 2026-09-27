(function (OVA) {
    // --- TIRA DE ECG DE LA PORTADA ---
    // Dibuja un ritmo sinusal en miniatura bajo el corazón 3D del home. No es
    // una imagen ni una animación decorativa: usa el MISMO motor matemático
    // que el simulador de los módulos 03, 05 y 06 (js/02-motor-ecg.js), así
    // que lo que se ve en la portada es literalmente el producto del recurso.
    //
    // Se autoejecuta al cargar index.html. No hace falta el patrón de
    // onclick en línea que usan los widgets de los módulos, porque esos se
    // inyectan con innerHTML (sus <script> no corren) y este archivo se carga
    // como <script> normal desde index.html.

    const canvas = document.getElementById('portada-ecg');
    if (!canvas || !OVA.MotorECG || !OVA.MotorECG.MotorMatematicoECG) return;

    const ctx = canvas.getContext('2d');
    const RITMO = 'sinusal';
    const FC = 75;                        // coincide con el rótulo "75 lpm" del HTML
    const VELOCIDAD_BARRIDO = 120;        // px/s, la misma escala que el monitor grande
    const ESCALA = 0.32;                  // el motor entrega ~80 de amplitud en la R
    const LINEA_BASE = canvas.height * 0.72;
    const ANCHO_BORRADO = 14;

    const motor = new OVA.MotorECG.MotorMatematicoECG();

    function y(amplitud) {
        return LINEA_BASE - amplitud * ESCALA;
    }

    function prepararTrazo() {
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    // Movimiento reducido: se pinta una tira fija de principio a fin y se deja
    // ahí. La portada sigue mostrando un trazado real, solo que quieto.
    const prefiereQuieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefiereQuieto) {
        const PASO_MS = 4;
        prepararTrazo();
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; ) {
            const amplitud = motor.obtenerVoltaje(PASO_MS, RITMO, FC);
            x === 0 ? ctx.moveTo(0, y(amplitud)) : ctx.lineTo(x, y(amplitud));
            x += (PASO_MS / 1000) * VELOCIDAD_BARRIDO;
        }
        ctx.stroke();
        return;
    }

    let posX = 0;
    let ultimaY = LINEA_BASE;
    let ultimoInstante = performance.now();

    function dibujarFrame(instante) {
        let delta = instante - ultimoInstante;
        ultimoInstante = instante;

        // Volver de un módulo o de otra pestaña deja un salto enorme; se
        // recorta igual que en el simulador para no atravesar el lienzo de
        // un tirón con una línea recta.
        if (delta > 100) delta = 16;

        // En la vista de módulo el lienzo no se ve: se deja de dibujar (y de
        // avanzar el motor) para no gastar CPU mientras el estudiante estudia.
        const home = document.getElementById('vista-home');
        if (!home || !home.classList.contains('view-active')) {
            requestAnimationFrame(dibujarFrame);
            return;
        }

        const amplitud = motor.obtenerVoltaje(delta, RITMO, FC);
        if (!isFinite(amplitud)) return;   // motor en mal estado: se detiene en silencio

        const nuevaY = y(amplitud);
        const avance = (delta / 1000) * VELOCIDAD_BARRIDO;

        prepararTrazo();
        ctx.beginPath();
        ctx.moveTo(posX, ultimaY);

        posX += avance;
        ctx.clearRect(posX, 0, ANCHO_BORRADO, canvas.height);

        if (posX > canvas.width) {
            posX = 0;
            ctx.clearRect(0, 0, ANCHO_BORRADO, canvas.height);
            ctx.moveTo(posX, nuevaY);
        }

        ctx.lineTo(posX, nuevaY);
        ctx.stroke();

        ultimaY = nuevaY;
        requestAnimationFrame(dibujarFrame);
    }

    requestAnimationFrame(dibujarFrame);

})(window.OVA = window.OVA || {});

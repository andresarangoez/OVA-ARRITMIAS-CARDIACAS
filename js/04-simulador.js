(function (OVA) {
    // --- DEPENDENCIAS DEL NAMESPACE ---
    // En vez de asumir que RITMOS_DB y MotorMatematicoECG existen como
    // globales sueltos, se toman explícitamente del namespace compartido.
    const RITMOS_DB = OVA.Ritmos.RITMOS_DB;
    const MotorMatematicoECG = OVA.MotorECG.MotorMatematicoECG;

// Estado Global
    let estado = { ritmo: 'sinusal', datos: RITMOS_DB['sinusal'] };
    let hmd_actual = MotorClinico.Hemodinamico.calcularEstado(estado.datos.hmd, estado.ritmo, estado.datos.pulso);
    
    // --- FUNCIONES LOG Y UI ---
    function registrarLog(mensaje, tipo = '') {
        const logBox = document.getElementById('clinical-log');
        const entry = document.createElement('div');
        const time = new Date().toLocaleTimeString('es-ES', {hour12: false});
        entry.className = `log-entry ${tipo}`;
        entry.innerText = `[${time}] ${mensaje}`;
        logBox.appendChild(entry);
        logBox.scrollTop = logBox.scrollHeight; 
    }
    
    function actualizarMonitor() {
        const pam = Math.round((hmd_actual.sis + 2 * hmd_actual.dia) / 3);
        const strTA = hmd_actual.sis > 0 ? `${hmd_actual.sis}/${hmd_actual.dia} (${pam})` : "0/0 (0)";
        const strSpO2 = estado.datos.pulso ? hmd_actual.spo2 : "--";
        
        document.getElementById('val-fc').innerText = hmd_actual.fc;
        document.getElementById('val-ta').innerText = strTA;
        document.getElementById('val-spo2').innerText = strSpO2;
        document.getElementById('val-fr').innerText = hmd_actual.fr;
        document.getElementById('val-temp').innerText = hmd_actual.temp.toFixed(1);

        // El panel de intervenciones no se adapta al ritmo a propósito: mostrar
        // solo las opciones válidas delataría la respuesta. El estudiante elige
        // y el registro le explica después si acertó.
    }
    
    function cambiarRitmo(nuevoRitmo) {
        estado.ritmo = nuevoRitmo;
        estado.datos = RITMOS_DB[nuevoRitmo];
        
        hmd_actual = MotorClinico.Hemodinamico.calcularEstado(estado.datos.hmd, nuevoRitmo, estado.datos.pulso);
    
        // Reset de arrays (para el fallback)
        currentWave = estado.datos.onda;
        waveIndex = 0;
    
        // Reset del motor matemático: evita que el nuevo ritmo herede fase,
        // contadores de bloqueo AV o pausas compensatorias del ritmo anterior.
        motorECG.reiniciar();
        
        document.getElementById('selectorRitmo').value = nuevoRitmo;
        actualizarMonitor();

        // Escenario nuevo: se borra la selección y las marcas de acierto/error
        // de la ronda anterior.
        reiniciarIntervenciones();
    }
    
    document.getElementById('selectorRitmo').addEventListener('change', function() {
        registrarLog(`Cambio de ritmo: ${this.options[this.selectedIndex].text}`);
        cambiarRitmo(this.value);
    });
    
    // --- INTERACCIONES CLÍNICAS ---
    // El estudiante elige UNA intervención de la lista y la aplica. Quién
    // decide si estaba indicada es MotorClinico.Intervenciones (08-motor-
    // medicamentos.js); aquí solo se orquesta la interacción y el registro.

    const VEREDICTOS = {
        indicado:       { icono: '✅', titulo: 'Intervención indicada',  clase: 'success', marca: 'ok' },
        parcial:        { icono: '⚠️', titulo: 'No es la prioridad',     clase: 'warning', marca: 'medio' },
        incorrecto:     { icono: '❌', titulo: 'No indicada',            clase: 'alert',   marca: 'mal' },
        contraindicado: { icono: '⛔', titulo: 'Contraindicada',         clase: 'alert',   marca: 'mal' }
    };

    const btnAplicar = document.getElementById('btn-aplicar-intervencion');
    const opcionesIntervencion = Array.from(document.querySelectorAll('input[name="intervencion"]'));

    function intervencionSeleccionada() {
        return opcionesIntervencion.find(opcion => opcion.checked) || null;
    }

    function sincronizarBotonAplicar() {
        const seleccion = intervencionSeleccionada();
        btnAplicar.disabled = !seleccion;
        btnAplicar.innerText = seleccion
            ? `Aplicar ${MotorClinico.Intervenciones.CATALOGO[seleccion.value].nombre}`
            : 'Seleccione una intervención';
    }

    // Se llama también desde cambiarRitmo(): cada ritmo nuevo es un escenario
    // nuevo y no debe arrastrar las marcas de la ronda anterior.
    function reiniciarIntervenciones() {
        opcionesIntervencion.forEach(opcion => { opcion.checked = false; });
        document.querySelectorAll('.intervencion-item').forEach(item => {
            item.classList.remove('ok', 'medio', 'mal', 'cargando');
        });
        sincronizarBotonAplicar();
    }

    opcionesIntervencion.forEach(opcion => {
        opcion.addEventListener('change', sincronizarBotonAplicar);
    });

    btnAplicar.addEventListener('click', function () {
        const seleccion = intervencionSeleccionada();
        if (!seleccion) return;

        const resultado = MotorClinico.Intervenciones.evaluar(seleccion.value, estado.ritmo);
        if (!resultado) return;

        const item = seleccion.closest('.intervencion-item');
        const info = resultado.intervencion;

        // El ritmo sobre el que se aplicó. Las fases diferidas (carga y
        // respuesta del paciente) lo comprueban antes de escribir en el
        // registro: si el estudiante cambió de ritmo mientras tanto, ese
        // veredicto ya no corresponde al paciente que hay en pantalla.
        const ritmoAlAplicar = estado.ritmo;

        registrarLog(`${info.nombre} — ${info.dosis}`, 'action');

        // Cardioversión y desfibrilación conservan su secuencia de carga: es
        // parte de lo que hay que aprender del procedimiento.
        if (info.requiereCarga) {
            item.classList.add('cargando');
            btnAplicar.disabled = true;
            registrarLog('🔋 Cargando el desfibrilador...', 'warning');

            setTimeout(() => {
                item.classList.remove('cargando');
                sincronizarBotonAplicar();
                if (estado.ritmo !== ritmoAlAplicar) return;

                registrarLog('⚡ ¡CLEAR! Descarga administrada.', 'action');
                resolverIntervencion(item, resultado, ritmoAlAplicar);
            }, 2500);
            return;
        }

        resolverIntervencion(item, resultado, ritmoAlAplicar);
    });

    function resolverIntervencion(item, resultado, ritmoAlAplicar) {
        const veredicto = VEREDICTOS[resultado.veredicto];

        registrarLog(`${veredicto.icono} ${veredicto.titulo}. ${resultado.nota}`, veredicto.clase);

        item.classList.remove('ok', 'medio', 'mal');
        item.classList.add(veredicto.marca);

        // Solo las intervenciones capaces de reorganizar el ritmo abren la
        // segunda fase (la respuesta del paciente). El oxígeno, por ejemplo,
        // es correcto pero no revierte nada por sí solo.
        if (!resultado.resuelveA) return;

        setTimeout(() => {
            if (estado.ritmo !== ritmoAlAplicar) return;

            if (Math.random() < resultado.probabilidad) {
                registrarLog('✅ Ritmo organizado tras la intervención.', 'success');
                cambiarRitmo(resultado.resuelveA);
            } else {
                registrarLog('⚠️ Sin respuesta todavía. Reevalúe y continúe el algoritmo.', 'warning');
            }
        }, 1800);
    }


    // --- MOTOR GRÁFICO HÍBRIDO (El Renderizador) ---
    const canvas = document.getElementById('ekgCanvas');
    const ctx = canvas.getContext('2d');
    
    let posX = 0;
    let lastY = canvas.height / 2;
    
    // Variables del sistema nuevo
    const motorECG = new MotorMatematicoECG();
    let usarMotorMatematico = true; 
    let lastTime = performance.now();
    const VELOCIDAD_BARRIDO = 120; // Píxeles por segundo (aprox 25mm/s)
    
    // Variables del sistema antiguo (Fallback)
    let currentWave = estado.datos.onda;
    let waveIndex = 0;
    
    function dibujarFrame(currentTime) {
        // Si el motor falló permanentemente, salimos de este bucle y no volvemos a llamar a requestAnimationFrame.
        if (!usarMotorMatematico) return; 
    
        let deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        
        // Limitador de deltaTime para evitar saltos gigantes si se cambia de pestaña
        if (deltaTime > 100) deltaTime = 16; 
    
        let amplitud = 0;
    
        try {
            // Generación Matemática
            amplitud = motorECG.obtenerVoltaje(deltaTime, estado.ritmo, hmd_actual.fc);
            
            if (!isFinite(amplitud)) throw new Error("Valor matemático inválido");
    
            let newY = (canvas.height / 2) - amplitud;
    
            ctx.beginPath();
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.moveTo(posX, lastY);
            
            // Avance constante independiente de la Frecuencia Cardíaca
            let avanceX = (deltaTime / 1000) * VELOCIDAD_BARRIDO;
            posX += avanceX;
    
            // Barra de borrado que precede a la aguja
            ctx.clearRect(posX, 0, 25, canvas.height); 
    
            if (posX > canvas.width) {
                posX = 0;
                ctx.moveTo(posX, newY);
            }
    
            ctx.lineTo(posX, newY);
            ctx.stroke();
    
            lastY = newY;
            
            requestAnimationFrame(dibujarFrame);
    
        } catch (error) {
            console.warn("⚠️ Error en Motor Matemático. Activando Fallback de Seguridad.", error);
            usarMotorMatematico = false; // Desactivar motor nuevo
            drawAntiguo(); // Iniciar el viejo bucle
        }
    }
    
    // FUNCIÓN DE SEGURIDAD (Sistema antiguo intacto por si la matemática falla)
    function drawAntiguo() {
        ctx.clearRect(posX, 0, 25, canvas.height);
        let amplitude = currentWave[waveIndex];
        
        if(hmd_actual.fc === 0 && estado.ritmo !== 'aesp') {
            amplitude = (Math.random() * 2 - 1); 
        }
    
        let newY = (canvas.height / 2) - amplitude;
    
        ctx.beginPath();
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.moveTo(posX, lastY);
        ctx.lineTo(posX + 3, newY);
        ctx.stroke();
    
        lastY = newY;
        posX += 3;
        waveIndex++;
    
        if(waveIndex >= currentWave.length) waveIndex = 0;
        if(posX > canvas.width) { posX = 0; lastY = canvas.height / 2; }
    
        let renderSpeed = 20; 
        let fcVisual = hmd_actual.fc > 0 ? hmd_actual.fc : 60;
        if (fcVisual > 0) renderSpeed = 1500 / fcVisual; 
        if (renderSpeed < 5) renderSpeed = 5;
        if (renderSpeed > 30) renderSpeed = 30;
    
        setTimeout(drawAntiguo, renderSpeed);
    }
    
    // Inicialización
    actualizarMonitor();
    lastTime = performance.now();
    requestAnimationFrame(dibujarFrame); // Arrancamos con el motor moderno

})(window.OVA = window.OVA || {});

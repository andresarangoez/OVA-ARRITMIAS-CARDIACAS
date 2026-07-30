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
    
        // --- Mostrar botón en desfibrilables Y en Asistolia/AESP ---
        const esRitmoDeParo = ['fv', 'asistolia', 'aesp'].includes(estado.ritmo);
        document.getElementById('btn-shock').style.display = (estado.datos.desf || esRitmoDeParo) ? 'block' : 'none';
        
        document.getElementById('btn-meds').innerText = `💉 Admin. ${estado.datos.med.split(' / ')[0]}`;
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
    }
    
    document.getElementById('selectorRitmo').addEventListener('change', function() {
        registrarLog(`Cambio de ritmo: ${this.options[this.selectedIndex].text}`);
        cambiarRitmo(this.value);
    });
    
    // --- INTERACCIONES CLÍNICAS ---
    document.getElementById('btn-shock').addEventListener('click', function() {
        const btn = this;
        
        // Obtenemos el ritmo que está seleccionado actualmente
        const ritmoActual = document.getElementById('selectorRitmo').value;
        
        // Definimos cuáles son los ritmos de paro
        const ritmosParo = ['fv', 'asistolia', 'aesp'];
    
        // --- LÓGICA DE EVALUACIÓN: ERRORES FATALES ---
        if (ritmosParo.includes(ritmoActual)) {
            // Si el paciente está en paro, pero es NO desfibrilable:
            if (ritmoActual === 'asistolia' || ritmoActual === 'aesp') {
                registrarLog("❌ ERROR FATAL CLÍNICO: Intento de desfibrilar Asistolia o AESP.", "alert");
                registrarLog("⚠️ Protocolo: Estos ritmos NO se desfibrilan. Priorice RCP y Adrenalina.", "alert");
                
                // Pequeño efecto visual rojo en el botón para indicar el error
                btn.style.backgroundColor = "var(--danger)";
                setTimeout(() => { btn.style.backgroundColor = ""; }, 1500);
                
                return; // 🛑 Detiene la función aquí, NO carga el desfibrilador
            }
        } else {
            // Si NO es un ritmo de paro, respetamos tu lógica original
            if (!estado.datos.desf) return; 
        }
    
        // --- SECUENCIA DE DESCARGA NORMAL (Para FV, TVSP o si aplica) ---
        
        // 1. Inicia efecto de carga
        btn.classList.add('charging');
        btn.innerText = "🔋 Cargando 200J...";
        registrarLog("🔋 Cargando condensadores a 200J...", "warning");
    
        // 2. Espera 2.5 segundos de carga
        setTimeout(() => {
            btn.classList.remove('charging');
            btn.innerText = "⚡ Desfibrilar (200J)";
            registrarLog("⚡ ¡CLEAR! Descarga de 200J administrada.", "action");
            
            // 3. Evalúa si el paciente sale del paro
            setTimeout(() => {
                if (Math.random() > 0.4) {
                    registrarLog("✅ ROSC: Ritmo organizado detectado.", "success");
                    // Actualiza visualmente el select al ritmo sinusal
                    document.getElementById('selectorRitmo').value = 'sinusal';
                    cambiarRitmo('sinusal');
                } else {
                    registrarLog("❌ Descarga inefectiva. Continúa paro.", "alert");
                }
            }, 2000);
    
        }, 2500);
    });
    
    document.getElementById('btn-meds').addEventListener('click', () => {
        registrarLog(`💉 Administrado: ${estado.datos.med}`, "action");
        setTimeout(() => {
            const cat = estado.datos.cat;
            if (cat === 5) { // Paro
                if(Math.random() > 0.7) {
                    registrarLog("⚠️ ROSC post-fármaco detectado.", "success");
                    cambiarRitmo(estado.ritmo === 'asistolia' ? 'aesp' : 'sinusal');
                } else { registrarLog("❌ Sin cambios. Continúe RCP.", "alert"); }
            } 
            else if ([1,3,4].includes(cat)) { // Arritmias con pulso
                if(Math.random() > 0.3) {
                    registrarLog("✅ El ritmo se estabiliza.", "success");
                    cambiarRitmo('sinusal');
                } else { registrarLog("⚠️ Ritmo persiste. Reevaluar clínica.", "alert"); }
            }
        }, 2500);
    });
    
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

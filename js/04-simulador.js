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

        espejoEnMonitor(time, mensaje, tipo);
    }

    // --- LO ÚLTIMO QUE PASÓ, AL PIE DEL TRAZADO ---
    //
    // El panel de acciones clínicas guarda la historia entera, pero está al
    // lado y exige apartar la vista del monitor justo cuando el monitor está
    // respondiendo. Esta banda lleva solo las dos últimas líneas, donde se
    // está mirando, y aprovecha el aire que sobraba bajo el trazado.
    const LINEAS_EN_MONITOR = 2;

    function espejoEnMonitor(hora, mensaje, tipo) {
        const banda = document.getElementById('monitor-registro');
        if (!banda) return;

        const linea = document.createElement('div');
        linea.className = 'monitor-registro-linea ' + (tipo || 'action');
        const h = document.createElement('span');
        h.className = 'monitor-registro-hora';
        h.textContent = hora;
        linea.appendChild(h);
        linea.appendChild(document.createTextNode(mensaje));
        banda.appendChild(linea);

        while (banda.childElementCount > LINEAS_EN_MONITOR) banda.removeChild(banda.firstElementChild);
    }
    
    // Nombres de los ritmos para la barra del monitor. Se leen del <select>,
    // que ya los tiene escritos: así no hay una segunda lista que mantener en
    // paralelo y que acabe divergiendo de la primera.
    function nombreDelRitmo(clave) {
        const opcion = document.querySelector('#selectorRitmo option[value="' + clave + '"]');
        return opcion ? opcion.textContent.trim() : clave;
    }

    function actualizarMonitor() {
        const pam = Math.round((hmd_actual.sis + 2 * hmd_actual.dia) / 3);
        const hayTension = hmd_actual.sis > 0;
        const strSpO2 = estado.datos.pulso ? hmd_actual.spo2 : "--";

        document.getElementById('val-fc').innerText = hmd_actual.fc;
        // La presión y la PAM van en dos nodos, no en una sola cadena: en el
        // monitor la cifra grande es la presión y la PAM la acompaña en el
        // renglón de la unidad, igual que en un aparato de cabecera.
        document.getElementById('val-ta').innerText = hayTension ? `${hmd_actual.sis}/${hmd_actual.dia}` : '--/--';
        document.getElementById('val-pam').innerText = hayTension ? pam : '--';
        document.getElementById('val-spo2').innerText = strSpO2;
        document.getElementById('val-fr').innerText = hmd_actual.fr;
        document.getElementById('val-temp').innerText = hmd_actual.temp.toFixed(1);

        // Barra de identificación: qué ritmo se está viendo y en qué estado
        // clínico queda el paciente con esas cifras. El estado lo calcula
        // MotorClinico.Hemodinamico (06-motor-hemodinamico.js); aquí solo se
        // muestra, para que las cifras no queden desconectadas del escenario.
        const ROTULO_ESTADO = { estable: 'Estable', inestable: 'Inestable', paro: 'Paro cardíaco' };
        const estadoClinico = hmd_actual.estadoClinico || 'estable';
        const monitor = document.querySelector('.monitor-clinico');
        if (monitor) monitor.setAttribute('data-estado', estadoClinico);
        const rotuloRitmo = document.getElementById('monitor-ritmo');
        if (rotuloRitmo) rotuloRitmo.innerText = nombreDelRitmo(estado.ritmo);
        const rotuloEstado = document.getElementById('monitor-estado');
        if (rotuloEstado) rotuloEstado.innerText = ROTULO_ESTADO[estadoClinico] || estadoClinico;

        // El panel de intervenciones no se adapta al ritmo a propósito: mostrar
        // solo las opciones válidas delataría la respuesta. El estudiante elige
        // y el registro le explica después si acertó.
    }

    // --- EFECTO DE LA INTERVENCIÓN SOBRE EL MONITOR ---
    //
    // Hasta ahora una intervención solo podía reorganizar el ritmo (resuelveA)
    // o no hacer nada visible: se administraba atropina a una bradicardia y las
    // cifras se quedaban quietas. El qué cambia y cuánto lo declara el catálogo
    // de MotorClinico.Intervenciones; aquí solo se aplica, se vuelve a
    // clasificar al paciente y se destaca lo que se movió.
    //
    // Los límites no son cosmética: una presión diastólica no puede alcanzar a
    // la sistólica, y una saturación no pasa de 100.
    const LIMITES = {
        fc:   { min: 20, max: 250 },
        sis:  { min: 50, max: 240 },
        dia:  { min: 25, max: 150 },
        spo2: { min: 50, max: 100 },
        fr:   { min: 6,  max: 50 }
    };

    function acotar(campo, valor) {
        const l = LIMITES[campo];
        return Math.max(l.min, Math.min(l.max, Math.round(valor)));
    }

    function aplicarEfectos(efectos) {
        if (!efectos) return false;

        // En un ritmo sin pulso no hay cifras que mover: el monitor muestra
        // guiones y subirle la presión a un paciente en paro sería mentirle al
        // estudiante. Lo que cambia la situación ahí es la reanimación, es
        // decir, el ritmo, y de eso se encarga resuelveA.
        if (!estado.datos.pulso) return false;

        const cambiados = [];
        const destino = { fc: hmd_actual.fc, sis: hmd_actual.sis, dia: hmd_actual.dia,
                          spo2: hmd_actual.spo2, fr: hmd_actual.fr };

        ['fc', 'sis', 'dia', 'spo2', 'fr'].forEach(function (campo) {
            if (typeof efectos[campo] !== 'number' || !efectos[campo]) return;
            const antes = hmd_actual[campo];
            if (!antes) return;
            const despues = acotar(campo, antes + efectos[campo]);
            if (despues === antes) return;
            destino[campo] = despues;
            cambiados.push(campo);
        });

        if (!cambiados.length) return false;

        // La diastólica no puede alcanzar a la sistólica.
        if (destino.dia >= destino.sis) destino.dia = destino.sis - 20;

        animarVitales(destino, 1400);
        destacarParametros(cambiados);
        return true;
    }

    // --- LA RESPUESTA DEL PACIENTE SE VE OCURRIR ---
    //
    // Las cifras saltaban de golpe al valor nuevo: el cambio pasaba antes de
    // que el ojo llegara. Aquí recorren la distancia en algo menos de un
    // segundo y medio, que es el tiempo que hace falta para seguir una cifra
    // sin que el plano se haga lento.
    //
    // Va con setInterval y no con requestAnimationFrame a propósito: el bucle
    // del trazado ya ocupa el rAF, y veinticinco pasos por segundo sobran para
    // cifras que cambian de unidad en unidad.
    let animacionVitales = null;

    function detenerAnimacionVitales() {
        if (animacionVitales) { clearInterval(animacionVitales); animacionVitales = null; }
    }

    function animarVitales(destino, duracion) {
        detenerAnimacionVitales();

        const campos = ['fc', 'sis', 'dia', 'spo2', 'fr'];
        const inicio = {};
        campos.forEach(function (c) { inicio[c] = hmd_actual[c]; });
        const arranque = performance.now();

        function paso() {
            const t = Math.min(1, (performance.now() - arranque) / duracion);
            // Arranca y termina suave; en medio avanza deprisa. Una rampa
            // lineal se lee como un contador, no como un paciente.
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            campos.forEach(function (c) {
                hmd_actual[c] = Math.round(inicio[c] + (destino[c] - inicio[c]) * e);
            });
            hmd_actual.pam = Math.round((hmd_actual.sis + 2 * hmd_actual.dia) / 3);

            // Se reclasifica en cada paso, no al final: así la insignia cambia
            // justo cuando las cifras cruzan el umbral, que es la lección.
            hmd_actual.estadoClinico = MotorClinico.Hemodinamico
                .clasificarEstadoClinico(hmd_actual, estado.ritmo);

            actualizarMonitor();
            if (t >= 1) detenerAnimacionVitales();
        }

        animacionVitales = setInterval(paso, 40);
        paso();
    }

    // Un parpadeo sobre el parámetro que acaba de moverse: sin él, el cambio
    // de una cifra en una pantalla llena de cifras pasa desapercibido.
    const PARAM_DE_CAMPO = { fc: 'fc', sis: 'ta', dia: 'ta', spo2: 'spo2', fr: 'fr' };
    function destacarParametros(campos) {
        const vistos = {};
        campos.forEach(function (campo) {
            const clase = PARAM_DE_CAMPO[campo];
            if (!clase || vistos[clase]) return;
            vistos[clase] = true;
            const nodo = document.querySelector('.monitor-param.' + clase);
            if (!nodo) return;
            nodo.classList.remove('cambiado');
            void nodo.offsetWidth;   // reinicia la animación si se repite
            nodo.classList.add('cambiado');
            setTimeout(function () { nodo.classList.remove('cambiado'); }, 2000);
        });
    }

    function cambiarRitmo(nuevoRitmo) {
        // Un ritmo nuevo es un escenario nuevo: si quedaba una animación de la
        // intervención anterior en marcha, seguiría escribiendo cifras del
        // paciente de antes sobre el de ahora.
        detenerAnimacionVitales();

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

    // --- SELECTOR DE RITMO DESPLEGABLE ---
    //
    // El <select> del navegador abre una lista del sistema: plana, sin los
    // grupos a la vista y sin forma de teñirla. Para elegir entre diecisiete
    // ritmos hay que leerla entera. Este panel despliega los cinco grupos en
    // dos columnas, que es como se clasifican las arritmias y como las enseña
    // el Módulo 03: quien busca una bradicardia mira un sitio, no diecisiete.
    //
    // El <select> no se retira: sigue siendo quien guarda el valor y quien
    // dispara el change, así que todo lo demás —cambiarRitmo, el registro, el
    // rótulo del monitor— funciona sin enterarse de que hay otra interfaz
    // encima. También es lo que mantiene el control accesible por teclado y en
    // un lector de pantalla.
    function construirSelectorRitmo() {
        const caja = document.getElementById('ritmo-selector');
        const select = document.getElementById('selectorRitmo');
        if (!caja || !select) return;

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'ritmo-boton';
        boton.id = 'ritmo-boton';
        boton.setAttribute('aria-expanded', 'false');
        boton.setAttribute('aria-haspopup', 'listbox');
        boton.innerHTML = '<span class="ritmo-boton-texto"></span>'
                        + '<span class="ritmo-boton-flecha" aria-hidden="true">▼</span>';

        const panel = document.createElement('div');
        panel.className = 'ritmo-panel';
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-label', 'Ritmo clínico');
        panel.hidden = true;

        // El panel se construye a partir del propio <select>: una sola lista
        // de ritmos, no dos que haya que mantener a la par.
        // Cada grupo es un bloque: el encabezado y sus ritmos viajan juntos a
        // la misma columna. Sueltos, la retícula los repartía uno a cada lado
        // y «Bradiarritmias» acababa encabezando ritmos que no eran suyos.
        function bloque(rotulo) {
            const b = document.createElement('div');
            b.className = 'ritmo-grupo-bloque';
            const titulo = document.createElement('p');
            titulo.className = 'ritmo-grupo';
            titulo.textContent = rotulo;
            b.appendChild(titulo);
            panel.appendChild(b);
            return b;
        }

        Array.from(select.children).forEach(function (nodo) {
            if (nodo.tagName === 'OPTGROUP') {
                // Los grupos vienen numerados («1. Bradiarritmias»); el número
                // ordena el <select> pero aquí lo ordena la propia columna.
                const b = bloque(nodo.label.replace(/^\d+\.\s*/, ''));
                Array.from(nodo.children).forEach(opcion => b.appendChild(crearOpcion(opcion)));
            } else if (nodo.tagName === 'OPTION') {
                bloque('Ritmo base').appendChild(crearOpcion(nodo));
            }
        });

        function crearOpcion(opcion) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'ritmo-opcion';
            b.setAttribute('role', 'option');
            b.dataset.valor = opcion.value;
            b.textContent = opcion.textContent.trim();
            b.addEventListener('click', function () {
                select.value = opcion.value;
                select.dispatchEvent(new Event('change'));
                cerrar();
                boton.focus();
            });
            return b;
        }

        function sincronizar() {
            const elegida = select.options[select.selectedIndex];
            boton.querySelector('.ritmo-boton-texto').textContent = elegida ? elegida.textContent.trim() : '';
            panel.querySelectorAll('.ritmo-opcion').forEach(function (b) {
                b.setAttribute('aria-selected', String(b.dataset.valor === select.value));
            });
        }

        function abrir()  { panel.hidden = false; boton.setAttribute('aria-expanded', 'true'); }
        function cerrar() { panel.hidden = true;  boton.setAttribute('aria-expanded', 'false'); }

        boton.addEventListener('click', function () {
            panel.hidden ? abrir() : cerrar();
        });

        // Cerrar al pulsar fuera o con Escape, como cualquier desplegable.
        document.addEventListener('click', function (e) {
            if (!panel.hidden && !caja.contains(e.target)) cerrar();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !panel.hidden) { cerrar(); boton.focus(); }
        });

        // El cambio puede venir de otro sitio —resuelveA reorganiza el ritmo
        // tras una intervención acertada—, así que el botón se sincroniza con
        // el select y no con el clic.
        select.addEventListener('change', sincronizar);

        caja.appendChild(boton);
        caja.appendChild(panel);
        sincronizar();
    }

    construirSelectorRitmo();
    
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
    const bandeja = document.getElementById('intervenciones-bandeja');
    const detalle = document.getElementById('intervencion-detalle');

    // --- BANDEJA DE INTERVENCIONES ---
    //
    // Las fichas salen del catálogo del motor, no de una lista escrita en el
    // HTML. Cuando estaban escritas a mano faltaban dos fármacos de la Unidad 2
    // del Módulo 05 —metoprolol y sulfato de magnesio— y no se veía ninguna
    // dosis: eran dos listas en paralelo que ya habían divergido.
    //
    // La dosis va a la vista desde el principio y no delata nada: saber que la
    // atropina se pone 1 mg IV no dice si la atropina es lo que este ritmo
    // necesita, que es lo que se está preguntando.
    const GRUPOS = [
        { tipo: 'medicamento',  rotulo: 'Medicamentos' },
        { tipo: 'procedimiento', rotulo: 'Procedimientos' }
    ];

    function escapar(texto) {
        return String(texto).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function construirBandeja() {
        const catalogo = MotorClinico.Intervenciones.CATALOGO;
        bandeja.innerHTML = GRUPOS.map(function (grupo) {
            const fichas = Object.keys(catalogo).filter(function (clave) {
                return catalogo[clave].tipo === grupo.tipo;
            }).map(function (clave) {
                const i = catalogo[clave];
                return '<label class="intervencion-item" data-clave="' + clave + '">'
                     + '<input type="radio" name="intervencion" value="' + clave + '">'
                     + '<span class="intervencion-ficha">'
                     + '<span class="intervencion-nombre">' + escapar(i.nombre) + '</span>'
                     + '<span class="intervencion-dosis">' + escapar(i.dosis) + '</span>'
                     + '</span>'
                     + '<span class="intervencion-marca" aria-hidden="true"></span>'
                     + '</label>';
            }).join('');

            return '<div class="intervenciones-grupo">'
                 + '<h4>' + grupo.rotulo + '</h4>'
                 + '<div class="intervenciones-grid">' + fichas + '</div>'
                 + '</div>';
        }).join('');
    }

    construirBandeja();

    const opcionesIntervencion = Array.from(document.querySelectorAll('input[name="intervencion"]'));

    // Lo que se va a administrar, antes de administrarlo: clase farmacológica y
    // pauta. No dice si está indicado —eso es lo que el estudiante tiene que
    // decidir— sino qué es lo que tiene en la mano.
    function mostrarDetalle(clave) {
        if (!clave) { detalle.hidden = true; detalle.innerHTML = ''; return; }
        const i = MotorClinico.Intervenciones.CATALOGO[clave];
        detalle.innerHTML =
              '<span class="intervencion-detalle-clase">' + escapar(i.clase) + '</span>'
            + '<span class="intervencion-detalle-pauta"><strong>Pauta:</strong> ' + escapar(i.dosis) + '</span>';
        detalle.hidden = false;
    }

    function intervencionSeleccionada() {
        return opcionesIntervencion.find(opcion => opcion.checked) || null;
    }

    function sincronizarBotonAplicar() {
        const seleccion = intervencionSeleccionada();
        btnAplicar.disabled = !seleccion;
        btnAplicar.innerText = seleccion
            ? `Aplicar ${MotorClinico.Intervenciones.CATALOGO[seleccion.value].nombre}`
            : 'Seleccione una intervención';
        mostrarDetalle(seleccion ? seleccion.value : null);
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

        // La respuesta del paciente en el monitor. Va antes de la posible
        // reorganización del ritmo porque es inmediata: las cifras se mueven
        // mientras el estudiante todavía está leyendo el veredicto.
        if (aplicarEfectos(resultado.efectos)) {
            const e = resultado.efectos;
            registrarLog(
                `📈 ${e.resumen} FC ${hmd_actual.fc} lpm · PA ${hmd_actual.sis}/${hmd_actual.dia} · SpO₂ ${hmd_actual.spo2}%`,
                veredicto.clase === 'alert' ? 'warning' : 'action'
            );
        }

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

(function (OVA) {
    OVA.Ritmos = OVA.Ritmos || {};

// --- SISTEMA ANTIGUO (Se mantiene como FALLBACK DE SEGURIDAD) ---
    const ondas_base = {
        normal: [0,0,2,5,8,10,8,5,2,0,0,0,-5,-10,20,60,80,-20,-30,0,0,2,5,10,15,18,15,10,5,2,0,0,0,0,0,0,0,0,0,0],
        lenta: [0,0,2,5,8,10,8,5,2,0,0,0,-5,-10,20,60,80,-20,-30,0,0,2,5,10,15,18,15,10,5,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        ancha: [-10,10,30,60,80,70,40,0,-20,-40,-50,-30,-10],
        caotica: [15,-25,20,-10,35,-45,30,-15,10,-35,25], 
        plana: [0, 0.5, -0.5, 0],
        irregular: [1,-1,2,0,-2,1,0,-5,-10,20,60,80,-20,-30,0,2,-1,2,5,10,15,18,15,10,5,2,0,1,-1,0,2,0,0]
    };
    
    // --- BASE DE DATOS CLÍNICA (Actualizada con Flutter) ---
    const RITMOS_DB = {
        'sinusal': { cat: 0, onda: ondas_base.normal, pulso: true, desf: false, med: "Solución Salina", hmd: {fc: 75, sis: 120, dia: 80, fr: 16, temp: 36.5} },
        'bradi_sinusal': { cat: 1, onda: ondas_base.lenta, pulso: true, desf: false, med: "Atropina 1mg", hmd: {fc: 40, sis: 90, dia: 60, fr: 14, temp: 36.2} },
        'bav1': { cat: 1, onda: ondas_base.lenta, pulso: true, desf: false, med: "Observación", hmd: {fc: 55, sis: 110, dia: 70, fr: 16, temp: 36.5} },
        'bav2_1': { cat: 1, onda: ondas_base.lenta, pulso: true, desf: false, med: "Atropina 1mg", hmd: {fc: 45, sis: 100, dia: 60, fr: 15, temp: 36.4} },
        'bav2_2': { cat: 1, onda: ondas_base.lenta, pulso: true, desf: false, med: "Atropina / Marcapaso", hmd: {fc: 35, sis: 85, dia: 50, fr: 14, temp: 36.1} },
        'bav3': { cat: 1, onda: ondas_base.lenta, pulso: true, desf: false, med: "Dopamina / Marcapaso", hmd: {fc: 30, sis: 70, dia: 40, fr: 16, temp: 36.0} },
        'taqui_sinusal': { cat: 3, onda: ondas_base.normal, pulso: true, desf: false, med: "Betabloqueador", hmd: {fc: 120, sis: 130, dia: 85, fr: 20, temp: 37.8} },
        'flutter': { cat: 3, onda: ondas_base.irregular, pulso: true, desf: false, med: "Betabloqueador", hmd: {fc: 150, sis: 110, dia: 70, fr: 18, temp: 36.8} },
        'fa': { cat: 3, onda: ondas_base.irregular, pulso: true, desf: false, med: "Amiodarona / BB", hmd: {fc: 140, sis: 105, dia: 70, fr: 18, temp: 36.8} },
        'tv_mono': { cat: 4, onda: ondas_base.ancha, pulso: true, desf: false, med: "Amiodarona 150mg", hmd: {fc: 160, sis: 85, dia: 50, fr: 22, temp: 36.5} },
        'tv_poli': { cat: 4, onda: ondas_base.ancha, pulso: true, desf: false, med: "Amiodarona", hmd: {fc: 180, sis: 70, dia: 40, fr: 24, temp: 36.4} },
        'torsades': { cat: 4, onda: ondas_base.ancha, pulso: true, desf: false, med: "Sulfato de Magnesio", hmd: {fc: 200, sis: 60, dia: 30, fr: 26, temp: 36.2} },
        'fv': { cat: 5, onda: ondas_base.caotica, pulso: false, desf: true, med: "Adrenalina / Amiodarona", hmd: {fc: 0, sis: 0, dia: 0, fr: 0, temp: 35.5} },
        'asistolia': { cat: 5, onda: ondas_base.plana, pulso: false, desf: false, med: "Adrenalina 1mg", hmd: {fc: 0, sis: 0, dia: 0, fr: 0, temp: 35.2} },
        'aesp': { cat: 5, onda: ondas_base.normal, pulso: false, desf: false, med: "Adrenalina 1mg (H/T)", hmd: {fc: 0, sis: 0, dia: 0, fr: 0, temp: 35.4} },
        'eap': { cat: 6, onda: ondas_base.normal, pulso: true, desf: false, med: "Observación", hmd: {fc: 85, sis: 118, dia: 78, fr: 16, temp: 36.5} },
        'ev': { cat: 6, onda: ondas_base.normal, pulso: true, desf: false, med: "Observación", hmd: {fc: 80, sis: 115, dia: 75, fr: 16, temp: 36.5} }
    };

    // --- API PÚBLICA DEL NAMESPACE (lo único visible fuera de este archivo) ---
    OVA.Ritmos.RITMOS_DB = RITMOS_DB;

    // --- Alias bajo el Motor Clínico (Etapa 2.1) — ver 00-motor-clinico.js ---
    // MotorClinico ya existe como global en este punto (00-motor-clinico.js
    // se carga primero); una IIFE no bloquea el acceso a globales externos,
    // solo evita que ESTE archivo agregue variables nuevas al global.
    MotorClinico.Ritmos = RITMOS_DB;

})(window.OVA = window.OVA || {});

// ============================================================
// MOTOR CLÍNICO — Estructura raíz (Etapa 2.1 de arquitectura)
// ============================================================
//
// El simulador se organiza conceptualmente en 6 sub-motores.
// Cada uno tiene una responsabilidad única y debe poder evolucionar
// de forma independiente, sin que un cambio en uno obligue a tocar
// los demás.
//
// Estado actual de cada motor (Etapa 2.1 — solo arquitectura):
//
//   MotorClinico.ECG            → ACTIVO. Alias de la clase MotorMatematicoECG
//                                  (02-motor-ecg.js). Genera la forma de onda.
//
//   MotorClinico.Ritmos         → ACTIVO. Alias de RITMOS_DB (01-data-ritmos.js).
//                                  Catálogo de ritmos y sus valores hemodinámicos
//                                  fijos asociados.
//
//   MotorClinico.Hemodinamico   → VACÍO (placeholder). Etapa 2.3: calculará FC,
//                                  TA, SpO2 como función del estado clínico del
//                                  paciente en el tiempo, no como valor fijo por
//                                  ritmo. Ver 06-motor-hemodinamico.js.
//
//   MotorClinico.Eventos        → VACÍO (placeholder). Etapa 2.5: reglas de
//                                  "administrar X → efecto Y en cadena" (ej.
//                                  Amiodarona → TV disminuye → FC cambia → TA
//                                  mejora → ECG cambia). Ver 07-motor-eventos.js.
//
//   MotorClinico.Medicamentos   → VACÍO (placeholder). Etapa 2.5: catálogo de
//                                  medicamentos con su mecanismo de acción y
//                                  efecto esperado sobre el motor hemodinámico.
//                                  Ver 08-motor-medicamentos.js.
//
//   MotorClinico.Pacientes      → VACÍO (placeholder). Etapa 2.4: catálogo de
//                                  casos clínicos completos (paciente + contexto
//                                  + estado inicial), reemplazando la selección
//                                  de un ritmo aislado. Ver 09-motor-pacientes.js.
//
// IMPORTANTE: esta etapa NO modifica el comportamiento del simulador.
// 04-simulador.js sigue funcionando exactamente igual que antes, leyendo
// RITMOS_DB y MotorMatematicoECG directamente como variables globales.
// Los alias de MotorClinico son la puerta de entrada para que, en etapas
// futuras, el simulador migre a usarlos sin reescribir todo de una vez.
//
// Este archivo debe cargarse ANTES que 01-data-ritmos.js y 02-motor-ecg.js,
// porque ambos le agregan su alias correspondiente al final de su propio
// archivo (MotorClinico.Ritmos = RITMOS_DB; y MotorClinico.ECG = MotorMatematicoECG;).

const MotorClinico = {};

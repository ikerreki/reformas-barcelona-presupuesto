// Nodo «Calcular»: lee las tarifas de la hoja (o usa las de respaldo), calcula el presupuesto,
// asigna el número P-AAAA-NNNN y prepara el prompt para la IA (sin importes).
const { solicitud } = $('Validar').first().json;
const hoja = $input.first().json;

const valueRanges = Array.isArray(hoja.valueRanges) ? hoja.valueRanges : null;
const lectura = valueRanges ? normalizarTarifas(valueRanges) : { ok: false, errores: ['no se pudo leer la hoja'] };
const tarifas = lectura.ok ? lectura.tarifas : TARIFAS_RESPALDO;
const origenTarifas = lectura.ok ? 'sheet' : 'respaldo';

const fechaISO = hoyEnMadrid();
const anio = Number(fechaISO.slice(0, 4));
let numero;
let numeroExistente = false;
let numeroProvisional = false;
if (valueRanges) {
  const vrSolicitudes = valueRanges.find((r) => String(r.range || '').replace(/^'/, '').startsWith('Solicitudes'));
  ({ numero, existente: numeroExistente } = siguienteNumero((vrSolicitudes && vrSolicitudes.values) || [], anio, solicitud.solicitudId));
} else {
  // Sin hoja no hay numeración fiable: número provisional único y aviso a Jordi.
  numero = `P-${anio}-T${Date.now().toString(36).toUpperCase()}`;
  numeroProvisional = true;
}

return [{
  json: {
    solicitud,
    tarifas,
    origenTarifas,
    erroresTarifas: lectura.ok ? [] : lectura.errores,
    calculo: calcularPresupuesto(solicitud, tarifas),
    numero,
    numeroExistente,
    numeroProvisional,
    fechaISO,
    promptRedaccion: construirPromptRedaccion({ solicitud, tarifas }),
  },
}];

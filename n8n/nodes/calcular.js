// Nodo «Calcular»: lee las tarifas de la hoja (o usa las de respaldo), calcula el presupuesto,
// detecta si esta solicitud ya se registró (reintento / doble clic) y prepara el prompt para la IA (sin importes).
const { solicitud } = $('Validar').first().json;
const hoja = $input.first().json;

const valueRanges = Array.isArray(hoja.valueRanges) ? hoja.valueRanges : null;
const lectura = valueRanges ? normalizarTarifas(valueRanges) : { ok: false, errores: ['no se pudo leer la hoja'] };
const tarifas = lectura.ok ? lectura.tarifas : TARIFAS_RESPALDO;
const origenTarifas = lectura.ok ? 'sheet' : 'respaldo';

const fechaISO = hoyEnMadrid();
const anio = Number(fechaISO.slice(0, 4));
let numero = null;
let numeroExistente = false;
let numeroProvisional = false;
let filaExistente = null;
let limiteExcedido = false;
if (valueRanges) {
  const vrSolicitudes = valueRanges.find((r) => String(r.range || '').replace(/^'/, '').startsWith('Solicitudes'));
  const filas = (vrSolicitudes && vrSolicitudes.values) || [];
  const previa = siguienteNumero(filas, anio, solicitud.solicitudId);
  if (previa.existente && previa.pendiente) {
    // Un intento anterior reservó la fila pero no llegó al final: se termina ahora, en esa misma fila,
    // y se envían los correos que no salieron.
    numero = previa.numero;
    filaExistente = `Solicitudes!A${previa.fila}:R${previa.fila}`;
  } else if (previa.existente) {
    ({ numero, existente: numeroExistente } = previa);
  } else {
    limiteExcedido = excedeLimite(filas, solicitud.cliente.email, fechaISO, LIMITES.solicitudesDiaPorEmail);
  }
} else {
  // Sin hoja no hay numeración fiable: número provisional único y aviso a Jordi.
  numero = `P-${anio}-T${Date.now().toString(36).toUpperCase()}`;
  numeroProvisional = true;
}

// Fila que se reserva en «Solicitudes» ANTES de llamar a la IA: el append de Google es atómico,
// así que la fila que nos toca da un número único (ver nodo «Asignar número»).
const c = solicitud.cliente;
const filaReserva = ['', solicitud.solicitudId, fechaISO, c.nombre, c.email, c.telefono, c.direccion, solicitud.idioma,
  '', '', '', '', '', '', '', '', '', 'pendiente'];

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
    filaExistente,
    limiteExcedido,
    reservar: Boolean(valueRanges) && !numeroExistente && !filaExistente && !limiteExcedido,
    filaReserva,
    fechaISO,
    promptRedaccion: construirPromptRedaccion({ solicitud, tarifas }),
  },
}];

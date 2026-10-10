// Nodo «Montar»: junta los números del motor con los textos de la IA (o la plantilla si la IA falló)
// y prepara todo lo que necesitan los siguientes nodos: respuesta a la web, email, PDF, aviso y fila de la hoja.
const c = $('Calcular').first().json;
const ia = $input.first().json || {};
const { solicitud, tarifas, calculo } = c;

const textoPlantilla = !(ia.ok && ia.textos);
const textos = textoPlantilla ? textosPlantilla({ solicitud, tarifas }) : ia.textos;
const modelo = textoPlantilla ? 'plantilla' : ia.modelo;

const presupuesto = montarPresupuesto({ solicitud, calculo, textos, numero: c.numero, fechaISO: c.fechaISO, tarifas });
if (CONFIG.logoUrl) presupuesto.logoUrl = CONFIG.logoUrl;

const notasFoto = solicitud.estancias.map((e) => e.notaFoto).filter(Boolean);
const avisos = { origenTarifas: c.origenTarifas, textoPlantilla, numeroProvisional: c.numeroProvisional, modelo, notasFoto };

const E = ETIQUETAS.es;
const estanciasTexto = solicitud.estancias.map((e) => {
  const extras = e.extras.length ? ` (${e.extras.map((x) => E.extra[x].toLowerCase()).join(', ')})` : '';
  return `${E.estancia[e.tipo]} ${formatM2(e.m2)} m² ${E.calidad[e.calidad]}${extras}`;
}).concat(solicitud.extrasGenerales.map((x) => E.extra[x])).join(' + ');

const filaSolicitud = [
  c.numero, solicitud.solicitudId, c.fechaISO, solicitud.cliente.nombre, solicitud.cliente.email,
  solicitud.cliente.telefono, solicitud.cliente.direccion, solicitud.idioma, estanciasTexto,
  presupuesto.subtotal, presupuesto.iva, presupuesto.total, formatPlazo(presupuesto.plazo, 'es'),
  c.origenTarifas, textoPlantilla ? 'sí' : 'no', notasFoto.join(' | '), modelo, 'nuevo',
];

return [{
  json: {
    respuesta: { ok: true, presupuesto },
    asunto: asuntoEmail(presupuesto),
    htmlEmail: htmlEmail(presupuesto),
    htmlPDF: htmlPaginaPDF(presupuesto),
    nombrePDF: `Presupuesto-${c.numero}.pdf`,
    resumenJordi: resumenJordi({ presupuesto, avisos, descripcion: solicitud.descripcion }),
    filaSolicitud,
    textoPlantilla,
    modelo,
  },
}];

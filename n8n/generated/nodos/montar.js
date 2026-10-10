// ===== Paso «montar»: lo que hace este nodo =====
async function paso() {
// Nodo «Montar»: junta los números del motor con los textos de la IA (o la plantilla si la IA falló)
// y prepara todo lo que necesitan los siguientes nodos: respuesta a la web, email, PDF, aviso y fila de la hoja.
const c = $('Calcular').first().json;
const asignado = $('Asignar número').first().json;
const ia = $input.first().json || {};
const { solicitud, tarifas, calculo } = c;
const numero = asignado.numero;

const textoPlantilla = !(ia.ok && ia.textos);
const textos = textoPlantilla ? textosPlantilla({ solicitud, tarifas }) : ia.textos;
const modelo = textoPlantilla ? 'plantilla' : ia.modelo;

const presupuesto = montarPresupuesto({ solicitud, calculo, textos, numero, fechaISO: c.fechaISO, tarifas });
if (CONFIG.logoUrl) presupuesto.logoUrl = CONFIG.logoUrl;

const notasFoto = solicitud.estancias.map((e) => e.notaFoto).filter(Boolean);
const avisos = { origenTarifas: c.origenTarifas, textoPlantilla, numeroProvisional: asignado.numeroProvisional, modelo, notasFoto };

const E = ETIQUETAS.es;
const estanciasTexto = solicitud.estancias.map((e) => {
  const extras = e.extras.length ? ` (${e.extras.map((x) => E.extra[x].toLowerCase()).join(', ')})` : '';
  return `${E.estancia[e.tipo]} ${formatM2(e.m2)} m² ${E.calidad[e.calidad]}${extras}`;
}).concat(solicitud.extrasGenerales.map((x) => E.extra[x])).join(' + ');

const filaSolicitud = [
  numero, solicitud.solicitudId, c.fechaISO, solicitud.cliente.nombre, solicitud.cliente.email,
  solicitud.cliente.telefono, solicitud.cliente.direccion, solicitud.idioma, estanciasTexto,
  presupuesto.subtotal, presupuesto.iva, presupuesto.total, formatPlazo(presupuesto.plazo, 'es'),
  c.origenTarifas, textoPlantilla ? 'sí' : 'no', notasFoto.join(' | '), modelo, 'nuevo',
];

return [{
  json: {
    respuesta: { ok: true, presupuesto },
    asunto: asuntoEmail(presupuesto),
    htmlEmail: htmlEmail(presupuesto),
    htmlEmailSinAdjunto: htmlEmail(presupuesto, { conAdjunto: false }),
    htmlPDF: htmlPaginaPDF(presupuesto),
    nombrePDF: `Presupuesto-${numero}.pdf`,
    resumenJordi: resumenJordi({ presupuesto, avisos, descripcion: solicitud.descripcion }),
    filaSolicitud,
    textoPlantilla,
    modelo,
  },
}];

}

// ===== Motor de Reformas Barcelona (generado por n8n/build.mjs desde engine/; no editar aquí) =====
const __catalogo = (() => {

const ESTANCIAS = ['bano', 'cocina', 'salon', 'dormitorio', 'vivienda'];
const CALIDADES = ['basica', 'media', 'alta'];
const EXTRAS_ESTANCIA = ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire'];
const EXTRAS_GENERALES = ['licencia'];
const IDIOMAS = ['es', 'ca', 'en'];
const LIMITES = {
  maxEstancias: 6,
  m2Max: 500,
  nombreMin: 2,
  nombreMax: 100,
  telefonoMax: 30,
  direccionMax: 200,
  descripcionMax: 1000,
  notaFotoMax: 300,
};
const EMPRESA = {
  nombre: 'Reformas Barcelona',
  razonSocial: 'Reformas Barcelona, S.L. (empresa ficticia)',
  nif: 'B00000000 (ficticio)',
  direccion: 'Carrer de la Reforma, 12, 08005 Barcelona',
  telefono: '930 000 000',
  email: 'presupuestos@reformasbarcelona.example',
  web: 'www.reformasbarcelona.example',
  gerente: 'Jordi Ferrer',
  desde: 1998,
  plantilla: 25,
};

return { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES, EMPRESA };
})();
const __formato = (() => {

function formatEUR(cents) {
  const negativo = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const resto = abs % 100;
  const miles = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${miles}${resto ? ',' + String(resto).padStart(2, '0') : ''} €`;
}
const formatM2 = (n) => String(n).replace('.', ',');
const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
function formatFecha(iso, idioma) {
  const [a, m, d] = iso.split('-').map(Number);
  const mes = MESES[idioma][m - 1];
  if (idioma === 'en') return `${d} ${mes} ${a}`;
  if (idioma === 'ca') return `${d} ${/^[aeiou]/i.test(mes) ? "d'" : 'de '}${mes} de ${a}`;
  return `${d} de ${mes} de ${a}`;
}
function sumarDias(iso, dias) {
  const f = new Date(`${iso}T00:00:00Z`);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}
function hoyEnMadrid(ahora = new Date()) {
  return ahora.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}
const SEMANAS = { es: 'semanas', ca: 'setmanes', en: 'weeks' };
function formatPlazo({ minSemanas, maxSemanas }, idioma) {
  const rango = minSemanas === maxSemanas ? `${minSemanas}` : `${minSemanas}–${maxSemanas}`;
  return `${rango} ${SEMANAS[idioma]}`;
}

return { formatEUR, formatM2, formatFecha, sumarDias, hoyEnMadrid, formatPlazo };
})();
const __etiquetas = (() => {

const ETIQUETAS = {
  es: {
    estancia: { bano: 'Baño', cocina: 'Cocina', salon: 'Salón / comedor', dormitorio: 'Dormitorio', vivienda: 'Vivienda completa' },
    estanciaMin: { bano: 'baño', cocina: 'cocina', salon: 'salón/comedor', dormitorio: 'dormitorio', vivienda: 'vivienda completa' },
    calidad: { basica: 'básica', media: 'media', alta: 'alta' },
    extra: {
      demolicion: 'Demolición y retirada de escombros',
      fontaneria: 'Fontanería nueva',
      electricidad: 'Instalación eléctrica nueva',
      pintura: 'Pintura de paredes y techos',
      suelo_radiante: 'Suelo radiante',
      aire: 'Aire acondicionado (1 split)',
      licencia: 'Gestión de licencia de obra',
    },
    unidad: { m2: 'm²', ud: 'ud.' },
    y: 'y',
    concepto: (est, cal) => `Reforma de ${est} · calidad ${cal}`,
    doc: {
      titulo: (lista) => `Presupuesto de reforma de ${lista}`,
      cliente: 'Cliente', email: 'Email', telefono: 'Teléfono', direccion: 'Dirección de la obra',
      trabajos: 'Descripción de los trabajos', presupuesto: 'Presupuesto',
      colConcepto: 'Concepto', colCantidad: 'Cantidad', colPrecio: 'Precio unitario', colImporte: 'Importe',
      general: 'Gestiones de la obra',
      subtotal: 'Subtotal', iva: (p) => `IVA (${p} %)`, total: 'Total',
      plazo: 'Plazo estimado', plazoDesde: 'desde el inicio de la obra',
      validoHasta: 'Válido hasta', condiciones: 'Condiciones',
      despedida: 'Un saludo,', cargo: 'Gerente · Reformas Barcelona',
    },
  },
  ca: {
    estancia: { bano: 'Bany', cocina: 'Cuina', salon: 'Saló / menjador', dormitorio: 'Dormitori', vivienda: 'Habitatge complet' },
    estanciaMin: { bano: 'bany', cocina: 'cuina', salon: 'saló/menjador', dormitorio: 'dormitori', vivienda: 'habitatge complet' },
    calidad: { basica: 'bàsica', media: 'mitjana', alta: 'alta' },
    extra: {
      demolicion: 'Enderroc i retirada de runa',
      fontaneria: 'Lampisteria nova',
      electricidad: 'Instal·lació elèctrica nova',
      pintura: 'Pintura de parets i sostres',
      suelo_radiante: 'Terra radiant',
      aire: 'Aire condicionat (1 split)',
      licencia: "Gestió de llicència d'obra",
    },
    unidad: { m2: 'm²', ud: 'u.' },
    y: 'i',
    concepto: (est, cal) => `Reforma de ${est} · qualitat ${cal}`,
    doc: {
      titulo: (lista) => `Pressupost de reforma de ${lista}`,
      cliente: 'Client', email: 'Correu', telefono: 'Telèfon', direccion: "Adreça de l'obra",
      trabajos: 'Descripció dels treballs', presupuesto: 'Pressupost',
      colConcepto: 'Concepte', colCantidad: 'Quantitat', colPrecio: 'Preu unitari', colImporte: 'Import',
      general: "Gestions de l'obra",
      subtotal: 'Subtotal', iva: (p) => `IVA (${p} %)`, total: 'Total',
      plazo: 'Termini estimat', plazoDesde: "des de l'inici de l'obra",
      validoHasta: 'Vàlid fins al', condiciones: 'Condicions',
      despedida: 'Una salutació,', cargo: 'Gerent · Reformas Barcelona',
    },
  },
  en: {
    estancia: { bano: 'Bathroom', cocina: 'Kitchen', salon: 'Living / dining room', dormitorio: 'Bedroom', vivienda: 'Whole home' },
    estanciaMin: { bano: 'bathroom', cocina: 'kitchen', salon: 'living/dining room', dormitorio: 'bedroom', vivienda: 'whole home' },
    calidad: { basica: 'basic', media: 'mid-range', alta: 'premium' },
    extra: {
      demolicion: 'Demolition and rubble removal',
      fontaneria: 'New plumbing',
      electricidad: 'New electrical installation',
      pintura: 'Painting of walls and ceilings',
      suelo_radiante: 'Underfloor heating',
      aire: 'Air conditioning (1 split unit)',
      licencia: 'Building permit management',
    },
    unidad: { m2: 'm²', ud: 'unit' },
    y: 'and',
    concepto: (est, cal) => `${est.charAt(0).toUpperCase()}${est.slice(1)} renovation · ${cal} quality`,
    doc: {
      titulo: (lista) => `Renovation quote: ${lista}`,
      cliente: 'Client', email: 'Email', telefono: 'Phone', direccion: 'Site address',
      trabajos: 'Description of the work', presupuesto: 'Quote',
      colConcepto: 'Item', colCantidad: 'Quantity', colPrecio: 'Unit price', colImporte: 'Amount',
      general: 'Site management',
      subtotal: 'Subtotal', iva: (p) => `VAT (${p} %)`, total: 'Total',
      plazo: 'Estimated duration', plazoDesde: 'from the start of the work',
      validoHasta: 'Valid until', condiciones: 'Terms',
      despedida: 'Kind regards,', cargo: 'Manager · Reformas Barcelona',
    },
  },
};
function conceptoPartida(partida, seccion, idioma) {
  const E = ETIQUETAS[idioma];
  if (partida.codigo === 'estancia') return E.concepto(E.estanciaMin[seccion.tipo], E.calidad[seccion.calidad]);
  return E.extra[partida.codigo];
}
function listaEstancias(tipos, idioma) {
  const E = ETIQUETAS[idioma];
  const nombres = tipos.map((t) => E.estanciaMin[t]);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} ${E.y} ${nombres[nombres.length - 1]}`;
}

return { ETIQUETAS, conceptoPartida, listaEstancias };
})();
const __plantilla = (() => {

const { ETIQUETAS, listaEstancias } = __etiquetas;
const { formatM2 } = __formato;
const nombrePila = (nombre) => nombre.trim().split(/\s+/)[0];
const POSESIVO_CA = { bano: 'el teu bany', cocina: 'la teva cuina', salon: 'el teu saló/menjador', dormitorio: 'el teu dormitori', vivienda: 'el teu habitatge' };
function listaCatalana(tipos) {
  const n = tipos.map((t) => POSESIVO_CA[t]);
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} i ${n[n.length - 1]}`;
}
const T = {
  es: {
    saludo: (n) => `Hola ${n}:`,
    resumen: (lista) =>
      `Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu ${lista}. ` +
      'Lo hemos preparado con nuestras tarifas y los acabados que has elegido. En la visita técnica gratuita revisaremos ' +
      'contigo las medidas y cualquier detalle que quieras ajustar.',
    estancia: (est, m2, cal, incluye) => `${est} de unos ${m2} m², calidad ${cal}: ${incluye}`,
    incluyeExtras: 'Incluye',
    visita: 'Visita técnica gratuita para confirmar medidas y detalles antes de empezar.',
    limpieza: 'Limpieza final de la obra.',
    cierre: 'Si tienes cualquier duda o quieres ajustar algo, escríbenos o llámanos. Estaremos encantados de ayudarte.',
  },
  ca: {
    saludo: (n) => `Hola ${n}:`,
    resumen: (lista) =>
      `Moltes gràcies per contactar amb Reformas Barcelona. T'enviem el pressupost per reformar ${lista}. ` +
      "L'hem preparat amb les nostres tarifes i els acabats que has triat. A la visita tècnica gratuïta revisarem " +
      'amb tu les mesures i qualsevol detall que vulguis ajustar.',
    estancia: (est, m2, cal, incluye) => `${est} d'uns ${m2} m², qualitat ${cal}: ${incluye}`,
    incluyeExtras: 'Inclou',
    visita: 'Visita tècnica gratuïta per confirmar mesures i detalls abans de començar.',
    limpieza: "Neteja final de l'obra.",
    cierre: "Si tens qualsevol dubte o vols ajustar alguna cosa, escriu-nos o truca'ns. Estarem encantats d'ajudar-te.",
  },
  en: {
    saludo: (n) => `Hi ${n},`,
    resumen: (lista) =>
      `Thank you very much for contacting Reformas Barcelona. Here is the quote to renovate your ${lista}. ` +
      "We have prepared it with our rates and the finishes you chose. During the free technical visit we'll review " +
      'the measurements with you and any detail you would like to adjust.',
    estancia: (est, m2, cal, incluye) => `${est} of about ${m2} m², ${cal} quality: ${incluye}`,
    incluyeExtras: 'Includes',
    visita: 'Free technical visit to confirm measurements and details before starting.',
    limpieza: 'Final clean-up of the site.',
    cierre: "If you have any questions or would like to adjust anything, just write or call us. We'll be happy to help.",
  },
};
function textosPlantilla({ solicitud, tarifas }) {
  const idioma = solicitud.idioma;
  const t = T[idioma];
  const E = ETIQUETAS[idioma];
  const trabajos = solicitud.estancias.map((e) => {
    let linea = t.estancia(E.estancia[e.tipo], formatM2(e.m2), E.calidad[e.calidad], tarifas.queIncluye[e.calidad][idioma]);
    if (e.extras.length) linea += ` ${t.incluyeExtras}: ${e.extras.map((x) => E.extra[x].toLowerCase()).join(', ')}.`;
    return linea;
  });
  for (const x of solicitud.extrasGenerales || []) trabajos.push(tarifas.extras[x].descripcion[idioma]);
  trabajos.push(t.visita, t.limpieza);
  return {
    saludo: t.saludo(nombrePila(solicitud.cliente.nombre)),
    resumen: t.resumen(idioma === 'ca'
      ? listaCatalana(solicitud.estancias.map((e) => e.tipo))
      : listaEstancias(solicitud.estancias.map((e) => e.tipo), idioma)),
    trabajos,
    cierre: t.cierre,
  };
}

return { textosPlantilla };
})();
const __render = (() => {

const { EMPRESA } = __catalogo;
const { ETIQUETAS, conceptoPartida, listaEstancias } = __etiquetas;
const { formatEUR, formatFecha, formatPlazo, formatM2, sumarDias } = __formato;
const C = { terracota: '#C4552D', antracita: '#2A2A2A', crema: '#F6F1EA', gris: '#6B6B6B', linea: '#E4DDD3' };
const euros = (cents) => Math.round(cents) / 100;
const eur = (e) => formatEUR(Math.round(e * 100));
function montarPresupuesto({ solicitud, calculo, textos, numero, fechaISO, tarifas }) {
  const idioma = solicitud.idioma;
  return {
    numero,
    fecha: fechaISO,
    validoHasta: sumarDias(fechaISO, tarifas.config.validezDias),
    idioma,
    cliente: { ...solicitud.cliente },
    secciones: calculo.secciones.map((s) => ({
      ...s,
      partidas: s.partidas.map((p) => ({
        codigo: p.codigo,
        cantidad: p.cantidad,
        unidad: p.unidad,
        precioUnitario: euros(p.precioUnitarioCents),
        importe: euros(p.importeCents),
      })),
    })),
    subtotal: euros(calculo.subtotalCents),
    ivaPct: calculo.ivaPct,
    iva: euros(calculo.ivaCents),
    total: euros(calculo.totalCents),
    plazo: calculo.plazo,
    textos,
    condiciones: tarifas.condiciones.map((c) => ({ titulo: c.titulo[idioma], detalle: c.detalle[idioma] })),
  };
}
function escaparHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const h = escaparHTML;
const tiposEstancia = (p) => p.secciones.filter((s) => s.tipo !== 'general').map((s) => s.tipo);
const tituloSeccion = (s, E) => (s.tipo === 'general' ? E.doc.general : `${E.estancia[s.tipo]} · ${formatM2(s.m2)} m²`);
const CSS_DOCUMENTO = `
.presupuesto{font-family:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;color:${C.antracita};background:#fff;
  max-width:800px;margin:0 auto;padding:40px 44px;font-size:14px;line-height:1.55;box-sizing:border-box}
.presupuesto *{box-sizing:border-box}
.presupuesto .cab{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding-bottom:18px;border-bottom:3px solid ${C.terracota}}
.presupuesto .cab img{height:46px;width:auto;max-width:100%;object-fit:contain;object-position:left}
.presupuesto .datos{border-collapse:collapse}
.presupuesto .datos td:last-child{overflow-wrap:anywhere}
.presupuesto .marca{font-weight:800;font-size:20px;letter-spacing:.04em}
.presupuesto .empresa{text-align:right;color:${C.gris};font-size:12.5px;line-height:1.6}
.presupuesto h1{font-size:24px;margin:28px 0 4px;font-weight:700}
.presupuesto .num{color:${C.gris};margin:0 0 20px}
.presupuesto h2{color:${C.terracota};font-size:17px;margin:28px 0 10px;font-weight:700}
.presupuesto .datos td{padding:3px 24px 3px 0;vertical-align:top}
.presupuesto .datos td:first-child{font-weight:700;white-space:nowrap}
.presupuesto ul{margin:0;padding-left:20px}
.presupuesto li{margin:3px 0}
.presupuesto table.partidas{width:100%;border-collapse:collapse;margin-top:6px}
.presupuesto .partidas th{background:${C.crema};text-align:left;padding:10px 8px;border-bottom:2px solid ${C.terracota};font-size:13px}
.presupuesto .partidas td{padding:9px 8px;border-bottom:1px solid ${C.linea}}
.presupuesto .partidas .n{text-align:right;white-space:nowrap}
.presupuesto .partidas tr.sec td{font-weight:700;background:#fff;border-bottom:1px solid ${C.antracita};padding-top:16px}
.presupuesto .totales{margin-left:auto;margin-top:14px;min-width:280px;border-collapse:collapse}
.presupuesto .totales td{padding:5px 8px}
.presupuesto .totales td:last-child{text-align:right;white-space:nowrap}
.presupuesto .totales tr.iva td{border-bottom:1px solid ${C.antracita};padding-bottom:10px}
.presupuesto .totales tr.total td{color:${C.terracota};font-weight:800;font-size:20px;padding-top:12px}
.presupuesto .plazo{margin-top:18px}
.presupuesto .firma{margin-top:28px}
.presupuesto .pie{margin-top:32px;padding-top:12px;border-top:1px solid ${C.linea};color:${C.gris};font-size:11.5px;text-align:center}
@media (max-width:600px){.presupuesto{padding:22px 16px}.presupuesto .cab{flex-direction:column}.presupuesto .empresa{text-align:left;overflow-wrap:anywhere}
  .presupuesto .cab img{height:auto;width:100%;max-width:260px}
  .presupuesto .datos tr{display:block;margin-bottom:6px}.presupuesto .datos td{display:block;padding:0}
  .presupuesto .partidas .pu{display:none}.presupuesto h1{font-size:20px}
  .presupuesto .totales{min-width:0;width:100%}}
`;
function htmlDocumento(p) {
  const E = ETIQUETAS[p.idioma];
  const D = E.doc;
  const varias = p.secciones.length > 1;
  const filas = p.secciones.map((s) => {
    const cab = varias ? `<tr class="sec"><td colspan="4">${h(tituloSeccion(s, E))}</td></tr>` : '';
    return cab + s.partidas.map((pt) => `<tr><td>${h(conceptoPartida(pt, s, p.idioma))}</td>` +
      `<td class="n">${h(formatM2(pt.cantidad))} ${h(E.unidad[pt.unidad])}</td>` +
      `<td class="n pu">${eur(pt.precioUnitario)}</td><td class="n">${eur(pt.importe)}</td></tr>`).join('');
  }).join('');
  const datos = [[D.cliente, p.cliente.nombre], [D.email, p.cliente.email],
    [D.telefono, p.cliente.telefono], [D.direccion, p.cliente.direccion]]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td>${h(k)}</td><td>${h(v)}</td></tr>`).join('');
  const marca = p.logoUrl
    ? `<img src="${h(p.logoUrl)}" alt="${h(EMPRESA.nombre)}">`
    : `<div class="marca">${h(EMPRESA.nombre.toUpperCase())}</div>`;
  return `<article class="presupuesto" lang="${h(p.idioma)}"><style>${CSS_DOCUMENTO}</style>
<header class="cab">${marca}<div class="empresa">${h(EMPRESA.razonSocial)}<br>${h(EMPRESA.direccion)}<br>${h(EMPRESA.telefono)} · ${h(EMPRESA.email)}<br>${h(EMPRESA.web)}</div></header>
<h1>${h(D.titulo(listaEstancias(tiposEstancia(p), p.idioma)))}</h1>
<p class="num">Nº ${h(p.numero)} · ${h(formatFecha(p.fecha, p.idioma))}</p>
<table class="datos">${datos}</table>
<p>${h(p.textos.saludo)}</p>
<p>${h(p.textos.resumen)}</p>
<h2>${h(D.trabajos)}</h2>
<ul>${p.textos.trabajos.map((t) => `<li>${h(t)}</li>`).join('')}</ul>
<h2>${h(D.presupuesto)}</h2>
<table class="partidas"><thead><tr><th>${h(D.colConcepto)}</th><th class="n">${h(D.colCantidad)}</th><th class="n pu">${h(D.colPrecio)}</th><th class="n">${h(D.colImporte)}</th></tr></thead>
<tbody>${filas}</tbody></table>
<table class="totales"><tr><td>${h(D.subtotal)}</td><td>${eur(p.subtotal)}</td></tr>
<tr class="iva"><td>${h(D.iva(p.ivaPct))}</td><td>${eur(p.iva)}</td></tr>
<tr class="total"><td>${h(D.total)}</td><td>${eur(p.total)}</td></tr></table>
<p class="plazo"><strong>${h(D.plazo)}:</strong> ${h(formatPlazo(p.plazo, p.idioma))} ${h(D.plazoDesde)}.<br>
<strong>${h(D.validoHasta)}:</strong> ${h(formatFecha(p.validoHasta, p.idioma))}</p>
<h2>${h(D.condiciones)}</h2>
<ul>${p.condiciones.map((c) => `<li><strong>${h(c.titulo)}:</strong> ${h(c.detalle)}</li>`).join('')}</ul>
<p>${h(p.textos.cierre)}</p>
<p class="firma">${h(D.despedida)}<br><strong>${h(EMPRESA.gerente)}</strong><br>${h(D.cargo)}</p>
<footer class="pie">${h(EMPRESA.razonSocial)} · ${h(EMPRESA.direccion)} · ${h(EMPRESA.telefono)}</footer>
</article>`;
}
function htmlPaginaPDF(p) {
  return `<!doctype html><html lang="${h(p.idioma)}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>body{margin:0;background:#fff}</style></head><body>${htmlDocumento(p)}</body></html>`;
}
const ASUNTO = {
  es: (n) => `Tu presupuesto ${n} · Reformas Barcelona`,
  ca: (n) => `El teu pressupost ${n} · Reformas Barcelona`,
  en: (n) => `Your quote ${n} · Reformas Barcelona`,
};
const asuntoEmail = (p) => ASUNTO[p.idioma](p.numero);
const ADJUNTO = {
  es: 'Te adjuntamos también el presupuesto en PDF.',
  ca: 'També t’adjuntem el pressupost en PDF.',
  en: 'The quote is also attached as a PDF.',
};
function htmlEmail(p, { conAdjunto = true } = {}) {
  const E = ETIQUETAS[p.idioma];
  const D = E.doc;
  const F = "font-family:Manrope,Arial,Helvetica,sans-serif;color:" + C.antracita;
  const td = (txt, extra = '') => `<td style="${F};font-size:14px;padding:8px 6px;border-bottom:1px solid ${C.linea};${extra}">${txt}</td>`;
  const filas = p.secciones.map((s) => {
    const cab = p.secciones.length > 1
      ? `<tr><td colspan="3" style="${F};font-size:14px;font-weight:700;padding:14px 6px 6px;border-bottom:1px solid ${C.antracita}">${h(tituloSeccion(s, E))}</td></tr>` : '';
    return cab + s.partidas.map((pt) => `<tr>${td(h(conceptoPartida(pt, s, p.idioma)))}` +
      td(`${h(formatM2(pt.cantidad))} ${h(E.unidad[pt.unidad])}`, 'text-align:right;white-space:nowrap') +
      td(eur(pt.importe), 'text-align:right;white-space:nowrap') + '</tr>').join('');
  }).join('');
  const total = (k, v, estilo = '') => `<tr><td style="${F};font-size:14px;padding:4px 6px;text-align:right;${estilo}">${k}</td>` +
    `<td style="${F};font-size:14px;padding:4px 6px;text-align:right;white-space:nowrap;${estilo}">${v}</td></tr>`;
  const marca = p.logoUrl
    ? `<img src="${h(p.logoUrl)}" alt="${h(EMPRESA.nombre)}" height="40" style="display:block;height:40px;border:0">`
    : `<span style="${F};font-size:18px;font-weight:800;letter-spacing:1px;color:${C.antracita}">${h(EMPRESA.nombre.toUpperCase())}</span>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema};padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px">
<tr><td style="padding:24px 28px;border-bottom:3px solid ${C.terracota}">${marca}</td></tr>
<tr><td style="padding:24px 28px;${F};font-size:15px;line-height:1.6">
<p style="margin:0 0 12px">${h(p.textos.saludo)}</p>
<p style="margin:0 0 16px">${h(p.textos.resumen)}</p>
<p style="margin:0 0 6px;color:${C.gris};font-size:13px">${h(D.presupuesto)} Nº ${h(p.numero)} · ${h(formatFecha(p.fecha, p.idioma))}</p>
<h2 style="${F};color:${C.terracota};font-size:17px;margin:22px 0 8px">${h(D.trabajos)}</h2>
<ul style="margin:0;padding-left:20px">${p.textos.trabajos.map((t) => `<li style="margin:3px 0">${h(t)}</li>`).join('')}</ul>
<h2 style="${F};color:${C.terracota};font-size:17px;margin:22px 0 8px">${h(D.presupuesto)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
<table role="presentation" cellpadding="0" cellspacing="0" align="right" style="margin-top:10px">
${total(h(D.subtotal), eur(p.subtotal))}${total(h(D.iva(p.ivaPct)), eur(p.iva))}
${total(h(D.total), eur(p.total), `color:${C.terracota};font-weight:800;font-size:18px;padding-top:10px`)}</table>
<div style="clear:both"></div>
<p style="margin:18px 0 0"><strong>${h(D.plazo)}:</strong> ${h(formatPlazo(p.plazo, p.idioma))} ${h(D.plazoDesde)}.<br>
<strong>${h(D.validoHasta)}:</strong> ${h(formatFecha(p.validoHasta, p.idioma))}</p>
<h2 style="${F};color:${C.terracota};font-size:17px;margin:22px 0 8px">${h(D.condiciones)}</h2>
<ul style="margin:0;padding-left:20px;font-size:13.5px">${p.condiciones.map((c) => `<li style="margin:3px 0"><strong>${h(c.titulo)}:</strong> ${h(c.detalle)}</li>`).join('')}</ul>
<p style="margin:20px 0 0">${h(p.textos.cierre)}${conAdjunto ? ' ' + h(ADJUNTO[p.idioma]) : ''}</p>
<p style="margin:20px 0 0">${h(D.despedida)}<br><strong>${h(EMPRESA.gerente)}</strong><br>${h(D.cargo)}</p>
</td></tr>
<tr><td style="padding:16px 28px;background:${C.antracita};color:#ffffff;font-family:Arial,sans-serif;font-size:12px;border-radius:0 0 10px 10px">
${h(EMPRESA.razonSocial)} · ${h(EMPRESA.direccion)} · ${h(EMPRESA.telefono)}</td></tr>
</table></td></tr></table>`;
}
function resumenJordi({ presupuesto: p, avisos = {}, descripcion = '' }) {
  const E = ETIQUETAS.es;
  const estancias = tiposEstancia(p).map((t) => E.estancia[t]).join(' + ');
  const asunto = `Nueva solicitud · ${estancias} · ${eur(p.total)} · ${p.cliente.nombre}`;
  const lista = [];
  if (avisos.origenTarifas === 'respaldo') lista.push('Se usaron las tarifas de respaldo porque la hoja de Google no se pudo leer: revisa que los precios estén al día.');
  if (avisos.textoPlantilla) lista.push('El texto se generó con la plantilla porque la IA no respondió correctamente.');
  if (avisos.numeroProvisional) lista.push(`El número ${p.numero} es provisional (no se pudo leer la hoja): asígnale uno definitivo.`);
  const notas = (avisos.notasFoto || []).filter(Boolean);
  const fila = (k, v) => `<tr><td style="padding:3px 16px 3px 0;font-weight:700">${h(k)}</td><td>${h(v)}</td></tr>`;
  const resumenPartidas = p.secciones.map((s) => `<li>${h(tituloSeccion(s, E))}: ${s.partidas.map((pt) => h(conceptoPartida(pt, s, 'es'))).join(', ')}</li>`).join('');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${C.antracita};font-size:14px;line-height:1.5">
<h2 style="color:${C.terracota};margin:0 0 12px">Nueva solicitud ${h(p.numero)}</h2>
${lista.length ? `<div style="background:#FCEBEB;border:1px solid #E24B4A;padding:10px 14px;margin-bottom:14px"><strong style="color:#A32D2D">Avisos</strong><ul style="margin:6px 0 0;padding-left:18px">${lista.map((a) => `<li style="color:#A32D2D">${h(a)}</li>`).join('')}</ul></div>` : ''}
<table>${fila('Cliente', p.cliente.nombre)}${fila('Email', p.cliente.email)}${fila('Teléfono', p.cliente.telefono || '—')}${fila('Dirección', p.cliente.direccion || '—')}${fila('Idioma', p.idioma.toUpperCase())}${fila('Total', `${eur(p.total)} (IVA incl.)`)}${fila('Plazo', formatPlazo(p.plazo, 'es'))}${fila('Texto redactado por', avisos.modelo || '—')}</table>
<p style="margin:14px 0 4px"><strong>Trabajos</strong></p><ul style="margin:0;padding-left:18px">${resumenPartidas}</ul>
${notas.length ? `<p style="margin:14px 0 4px"><strong>Notas técnicas de las fotos</strong></p><ul style="margin:0;padding-left:18px">${notas.map((n) => `<li>${h(n)}</li>`).join('')}</ul>` : ''}
<p style="margin:14px 0 4px"><strong>Lo que escribió el cliente</strong></p><p style="margin:0;white-space:pre-wrap">${h(descripcion || '—')}</p>
</div>`;
  return { asunto, html };
}

return { montarPresupuesto, escaparHTML, htmlDocumento, htmlPaginaPDF, asuntoEmail, htmlEmail, resumenJordi };
})();
const { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES, EMPRESA } = __catalogo;
const { formatEUR, formatM2, formatFecha, sumarDias, hoyEnMadrid, formatPlazo } = __formato;
const { ETIQUETAS, conceptoPartida, listaEstancias } = __etiquetas;
const { textosPlantilla } = __plantilla;
const { montarPresupuesto, escaparHTML, htmlDocumento, htmlPaginaPDF, asuntoEmail, htmlEmail, resumenJordi } = __render;
const CONFIG = {"logoUrl":"","emailJordi":"ikerreki544@gmail.com","spreadsheetUrl":"https://docs.google.com/spreadsheets/d/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/edit"};
return paso();
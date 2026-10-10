// Monta el presupuesto final y lo convierte en HTML para la web/PDF y para el email.
// Todo texto que venga del cliente o de la IA pasa por escaparHTML: nunca se inyecta HTML ajeno.
import { EMPRESA } from './catalogo.js';
import { ETIQUETAS, conceptoPartida, listaEstancias } from './etiquetas.js';
import { formatEUR, formatFecha, formatPlazo, formatM2, sumarDias } from './formato.js';

const C = { terracota: '#C4552D', antracita: '#2A2A2A', crema: '#F6F1EA', gris: '#6B6B6B', linea: '#E4DDD3' };
const euros = (cents) => Math.round(cents) / 100;
const eur = (e) => formatEUR(Math.round(e * 100));

/** Une números del motor + textos de la IA en el objeto que recibe la web (spec §4.3). */
export function montarPresupuesto({ solicitud, calculo, textos, numero, fechaISO, tarifas }) {
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

export function escaparHTML(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const h = escaparHTML;

const tiposEstancia = (p) => p.secciones.filter((s) => s.tipo !== 'general').map((s) => s.tipo);
const tituloSeccion = (s, E) => (s.tipo === 'general' ? E.doc.general : `${E.estancia[s.tipo]} · ${formatM2(s.m2)} m²`);

// ---------- Documento (web, descarga en PDF y PDF adjunto) ----------

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

/** <article> autocontenido (con su <style> acotado a .presupuesto). */
export function htmlDocumento(p) {
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

/** Página HTML completa para convertir a PDF en el servidor (PDF.co). */
export function htmlPaginaPDF(p) {
  return `<!doctype html><html lang="${h(p.idioma)}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>@page { size: A4; margin: 10mm 0 } body{margin:0;background:#fff}</style></head><body>${htmlDocumento(p)}</body></html>`;
}

// ---------- Email (tablas y estilos en línea: lo único que pintan bien Gmail y Outlook) ----------

const ASUNTO = {
  es: (n) => `Tu presupuesto ${n} · Reformas Barcelona`,
  ca: (n) => `El teu pressupost ${n} · Reformas Barcelona`,
  en: (n) => `Your quote ${n} · Reformas Barcelona`,
};
export const asuntoEmail = (p) => ASUNTO[p.idioma](p.numero);

const ADJUNTO = {
  es: 'Te adjuntamos también el presupuesto en PDF.',
  ca: 'També t’adjuntem el pressupost en PDF.',
  en: 'The quote is also attached as a PDF.',
};

/** conAdjunto: false cuando PDF.co falló y el correo sale sin el PDF (no prometemos un adjunto que no va). */
export function htmlEmail(p, { conAdjunto = true } = {}) {
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

// ---------- Aviso interno para Jordi (siempre en español) ----------

/** avisos = { origenTarifas, textoPlantilla, numeroProvisional, modelo, notasFoto[] }; descripcion = texto libre del cliente. */
export function resumenJordi({ presupuesto: p, avisos = {}, descripcion = '' }) {
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

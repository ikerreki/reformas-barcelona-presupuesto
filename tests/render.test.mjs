import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarPresupuesto, escaparHTML, htmlDocumento, htmlEmail, asuntoEmail, resumenJordi, htmlPaginaPDF } from '../engine/render.js';
import { validarSolicitud, calcularPresupuesto } from '../engine/pricing.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { solicitudMarta } from './fixtures.mjs';
import { TEXTOS_MARTA } from './textos-marta.mjs';

function presupuestoDe(raw, textos = TEXTOS_MARTA) {
  const solicitud = validarSolicitud(raw).solicitud;
  const calculo = calcularPresupuesto(solicitud, TARIFAS_RESPALDO);
  return montarPresupuesto({ solicitud, calculo, textos, numero: 'P-2026-0001', fechaISO: '2026-10-06', tarifas: TARIFAS_RESPALDO });
}

test('montarPresupuesto: importes en euros y validez a 30 días', () => {
  const p = presupuestoDe(solicitudMarta());
  assert.equal(p.subtotal, 6690);
  assert.equal(p.iva, 1404.9);
  assert.equal(p.total, 8094.9);
  assert.equal(p.ivaPct, 21);
  assert.equal(p.numero, 'P-2026-0001');
  assert.equal(p.fecha, '2026-10-06');
  assert.equal(p.validoHasta, '2026-11-05');
  assert.equal(p.idioma, 'es');
  assert.deepEqual(p.plazo, { minSemanas: 2, maxSemanas: 3 });
  assert.deepEqual(p.secciones[0].partidas[0], { codigo: 'estancia', cantidad: 6, unidad: 'm2', precioUnitario: 880, importe: 5280 });
  assert.equal(p.condiciones.length, 6);
  assert.deepEqual(p.condiciones[0], { titulo: 'Validez del presupuesto', detalle: '30 días desde la fecha de emisión' });
  assert.deepEqual(p.textos, TEXTOS_MARTA);
});

test('montarPresupuesto: condiciones en el idioma del cliente', () => {
  const p = presupuestoDe(solicitudMarta({ idioma: 'en' }));
  assert.equal(p.condiciones[1].titulo, 'Payment terms');
});

test('htmlDocumento muestra los importes y conceptos como el ejemplo', () => {
  const html = htmlDocumento(presupuestoDe(solicitudMarta()));
  for (const s of ['8.094,90 €', '1.404,90 €', '6.690 €', '5.280 €', 'Reforma de baño · calidad media',
    'Demolición y retirada de escombros', 'P-2026-0001', '6 de octubre de 2026', 'Hola Marta:', 'Jordi Ferrer',
    'Presupuesto de reforma de baño', '2–3 semanas', '5 de noviembre de 2026']) {
    assert.ok(html.includes(s), s);
  }
});

test('escaparHTML neutraliza HTML y comillas', () => {
  assert.equal(escaparHTML(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(escaparHTML(null), '');
});

test('un nombre con <script> se muestra como texto, nunca como código', () => {
  const raw = solicitudMarta();
  raw.cliente.nombre = '<script>alert(1)</script>';
  const textos = { ...TEXTOS_MARTA, saludo: 'Hola <script>alert(1)</script>:' };
  const p = presupuestoDe(raw, textos);
  for (const html of [htmlDocumento(p), htmlEmail(p), resumenJordi({ presupuesto: p, avisos: {} }).html]) {
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  }
});

test("nombres con apóstrofo (Núria d'Alòs) se escapan bien", () => {
  const raw = solicitudMarta();
  raw.cliente.nombre = "Núria d'Alòs";
  assert.ok(htmlDocumento(presupuestoDe(raw)).includes('Núria d&#39;Alòs'));
});

test('varias estancias: una cabecera por estancia y sección de gestiones', () => {
  const raw = solicitudMarta({
    estancias: [
      { tipo: 'bano', m2: 6, calidad: 'media', extras: [] },
      { tipo: 'cocina', m2: 10, calidad: 'alta', extras: ['electricidad'] },
    ],
    extrasGenerales: ['licencia'],
  });
  const html = htmlDocumento(presupuestoDe(raw));
  for (const s of ['Baño · 6 m²', 'Cocina · 10 m²', 'Gestiones de la obra', 'Gestión de licencia de obra',
    'Presupuesto de reforma de baño y cocina', '5–7 semanas']) assert.ok(html.includes(s), s);
});

test('htmlEmail: compatible con clientes de correo (estilos en línea, sin <style> ni class=)', () => {
  const html = htmlEmail(presupuestoDe(solicitudMarta()));
  assert.ok(!html.includes('<style'));
  assert.ok(!html.includes('class='));
  assert.ok(html.includes('8.094,90 €'));
  assert.ok(html.includes('<table'));
});

test('asuntoEmail en los tres idiomas', () => {
  assert.equal(asuntoEmail(presupuestoDe(solicitudMarta())), 'Tu presupuesto P-2026-0001 · Reformas Barcelona');
  assert.equal(asuntoEmail(presupuestoDe(solicitudMarta({ idioma: 'ca' }))), 'El teu pressupost P-2026-0001 · Reformas Barcelona');
  assert.equal(asuntoEmail(presupuestoDe(solicitudMarta({ idioma: 'en' }))), 'Your quote P-2026-0001 · Reformas Barcelona');
});

test('resumenJordi: asunto con estancias, total y nombre', () => {
  const r = resumenJordi({ presupuesto: presupuestoDe(solicitudMarta()), avisos: { origenTarifas: 'sheet' } });
  assert.equal(r.asunto, 'Nueva solicitud · Baño · 8.094,90 € · Marta Puig');
  assert.ok(!r.html.includes('tarifas de respaldo'));
});

test('resumenJordi: muestra los avisos activos', () => {
  const r = resumenJordi({
    presupuesto: presupuestoDe(solicitudMarta()),
    avisos: { origenTarifas: 'respaldo', textoPlantilla: true, numeroProvisional: true, modelo: 'plantilla', notasFoto: ['Humedad en la esquina'] },
  });
  for (const s of ['tarifas de respaldo', 'plantilla', 'provisional', 'Humedad en la esquina']) assert.ok(r.html.includes(s), s);
});

test('resumenJordi incluye lo que escribió el cliente, escapado', () => {
  const r = resumenJordi({ presupuesto: presupuestoDe(solicitudMarta()), avisos: {}, descripcion: 'Quiero <b>ducha</b>' });
  assert.ok(r.html.includes('Quiero &lt;b&gt;ducha&lt;/b&gt;'));
});

test('htmlPaginaPDF: documento HTML completo con el presupuesto', () => {
  const html = htmlPaginaPDF(presupuestoDe(solicitudMarta()));
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('8.094,90 €'));
  assert.match(html, /@page\s*\{\s*size:\s*A4/);
});

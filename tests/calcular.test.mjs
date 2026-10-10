import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarSolicitud, calcularPresupuesto } from '../engine/pricing.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { ESTANCIAS, CALIDADES } from '../engine/catalogo.js';
import { solicitudMarta } from './fixtures.mjs';

const valida = (raw) => {
  const r = validarSolicitud(raw);
  assert.equal(r.ok, true, JSON.stringify(r.errores));
  return r.solicitud;
};

test('Marta: 6.690 € + 1.404,90 € IVA = 8.094,90 € (caso de oro del PDF)', () => {
  const c = calcularPresupuesto(valida(solicitudMarta()), TARIFAS_RESPALDO);
  assert.equal(c.subtotalCents, 669000);
  assert.equal(c.ivaCents, 140490);
  assert.equal(c.totalCents, 809490);
  assert.equal(c.ivaPct, 21);
  assert.deepEqual(c.plazo, { minSemanas: 2, maxSemanas: 3 });
});

test('Marta: partidas exactas del presupuesto de ejemplo', () => {
  const c = calcularPresupuesto(valida(solicitudMarta()), TARIFAS_RESPALDO);
  assert.equal(c.secciones.length, 1);
  assert.equal(c.secciones[0].estanciaIndex, 0);
  assert.equal(c.secciones[0].tipo, 'bano');
  assert.deepEqual(c.secciones[0].partidas, [
    { codigo: 'estancia', cantidad: 6, unidad: 'm2', precioUnitarioCents: 88000, importeCents: 528000 },
    { codigo: 'demolicion', cantidad: 6, unidad: 'm2', precioUnitarioCents: 3500, importeCents: 21000 },
    { codigo: 'fontaneria', cantidad: 1, unidad: 'ud', precioUnitarioCents: 120000, importeCents: 120000 },
  ]);
});

test('baño + cocina + licencia: licencia una sola vez y plazos sumados', () => {
  const raw = solicitudMarta({
    estancias: [
      { tipo: 'bano', m2: 6, calidad: 'media', extras: [] },
      { tipo: 'cocina', m2: 10, calidad: 'alta', extras: ['electricidad'] },
    ],
    extrasGenerales: ['licencia'],
  });
  const c = calcularPresupuesto(valida(raw), TARIFAS_RESPALDO);
  assert.equal(c.secciones.length, 3);
  const general = c.secciones[2];
  assert.equal(general.estanciaIndex, null);
  assert.equal(general.tipo, 'general');
  assert.deepEqual(general.partidas, [
    { codigo: 'licencia', cantidad: 1, unidad: 'ud', precioUnitarioCents: 35000, importeCents: 35000 },
  ]);
  assert.equal(c.subtotalCents, 528000 + 1400000 + 150000 + 35000);
  assert.deepEqual(c.plazo, { minSemanas: 5, maxSemanas: 7 });
});

test('sin extras generales no hay sección general', () => {
  const c = calcularPresupuesto(valida(solicitudMarta()), TARIFAS_RESPALDO);
  assert.ok(c.secciones.every((s) => s.tipo !== 'general'));
});

test('m² con decimales: salón 12,5 m² básica + pintura', () => {
  const raw = solicitudMarta({ estancias: [{ tipo: 'salon', m2: '12,5', calidad: 'basica', extras: ['pintura'] }] });
  const c = calcularPresupuesto(valida(raw), TARIFAS_RESPALDO);
  const [estancia, pintura] = c.secciones[0].partidas;
  assert.equal(estancia.importeCents, 137500);
  assert.equal(pintura.importeCents, 15000);
});

test('las partidas siguen el orden del catálogo, no el del cliente', () => {
  const raw = solicitudMarta({ estancias: [{ tipo: 'bano', m2: 6, calidad: 'media', extras: ['aire', 'demolicion'] }] });
  const c = calcularPresupuesto(valida(raw), TARIFAS_RESPALDO);
  assert.deepEqual(c.secciones[0].partidas.map((p) => p.codigo), ['estancia', 'demolicion', 'aire']);
});

test('cada estancia × calidad con 1 m²: importe = tarifa', () => {
  for (const tipo of ESTANCIAS) for (const calidad of CALIDADES) {
    const raw = solicitudMarta({ estancias: [{ tipo, m2: 1, calidad, extras: [] }] });
    const c = calcularPresupuesto(valida(raw), TARIFAS_RESPALDO);
    assert.equal(c.secciones[0].partidas[0].importeCents, TARIFAS_RESPALDO.estancias[tipo][calidad] * 100, `${tipo}/${calidad}`);
  }
});

test('IVA redondeado a céntimos como ROUND(x*0.21, 2) del Excel', () => {
  // 0,35 € de subtotal → IVA 0,0735 → 0,07 €
  const t = structuredClone(TARIFAS_RESPALDO);
  t.estancias.bano.media = 0.35;
  const c = calcularPresupuesto(valida(solicitudMarta({ estancias: [{ tipo: 'bano', m2: 1, calidad: 'media', extras: [] }] })), t);
  assert.equal(c.subtotalCents, 35);
  assert.equal(c.ivaCents, 7);
  assert.equal(c.totalCents, 42);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraerJSON, contieneImportes, validarTextosIA } from '../engine/guardrail.js';
import { TEXTOS_MARTA } from './textos-marta.mjs';

test('extraerJSON: JSON plano', () => {
  assert.deepEqual(extraerJSON('{"a":1}'), { a: 1 });
});

test('extraerJSON: envuelto en ```json … ```', () => {
  assert.deepEqual(extraerJSON('```json\n{"a":1}\n```'), { a: 1 });
});

test('extraerJSON: con texto antes y después', () => {
  assert.deepEqual(extraerJSON('Aquí tienes:\n{"a":{"b":2}}\n¡Espero que sirva!'), { a: { b: 2 } });
});

test('extraerJSON: sin JSON o JSON que no es objeto → null', () => {
  for (const t of ['no json', '', '[1,2]', '{roto', null, undefined, 42]) assert.equal(extraerJSON(t), null, String(t));
});

test('contieneImportes: detecta dinero', () => {
  for (const t of ['cuesta 5.280 €', 'unos 300 euros', 'un total de 8094,90', 'precio: 1200', 'EUR 50',
    'el importe es de 1.404,90', 'el preu és 950', 'the price is 1500', 'te sale por 1.404,90']) {
    assert.equal(contieneImportes(t), true, t);
  }
});

test('contieneImportes: no confunde medidas, años ni cantidades', () => {
  for (const t of ['tu baño de unos 6 m²', 'un plato de 140 × 80 cm', '30 años de oficio', '2 lavabos',
    'cocina de 120 m2', 'llámanos al 930 000 000', 'Te enviamos el presupuesto para tu baño de unos 6 m².',
    'desde 1998', 'Europa y europeos']) {
    assert.equal(contieneImportes(t), false, t);
  }
});

test('validarTextosIA acepta los textos del ejemplo de Marta', () => {
  assert.deepEqual(validarTextosIA(TEXTOS_MARTA), { ok: true, motivo: null });
});

test('validarTextosIA rechaza estructura incompleta', () => {
  const sinCierre = { ...TEXTOS_MARTA };
  delete sinCierre.cierre;
  assert.equal(validarTextosIA(sinCierre).ok, false);
  assert.equal(validarTextosIA({ ...TEXTOS_MARTA, trabajos: ['a', 'b'] }).ok, false);
  assert.equal(validarTextosIA({ ...TEXTOS_MARTA, resumen: 'Corto.' }).ok, false);
  assert.equal(validarTextosIA(null).ok, false);
});

test('validarTextosIA rechaza importes en cualquier campo', () => {
  const r = validarTextosIA({ ...TEXTOS_MARTA, trabajos: [...TEXTOS_MARTA.trabajos, 'Todo por solo 300 euros'] });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /importe/);
});

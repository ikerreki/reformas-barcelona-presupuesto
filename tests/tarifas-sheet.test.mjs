import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumeroES, normalizarTarifas } from '../engine/pricing.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { valueRangesDesde, cambiarCelda } from './fixtures.mjs';

test('parseNumeroES entiende cómo escribe números una persona en España', () => {
  const casos = [
    [880, 880], ['880', 880], ['1.200', 1200], ['1.200,50', 1200.5], ['12,5', 12.5],
    ['880 €', 880], ['12.5', 12.5], ['  35 ', 35], ['1.250.000', 1250000],
  ];
  for (const [entrada, esperado] of casos) assert.equal(parseNumeroES(entrada), esperado, String(entrada));
});

test('parseNumeroES devuelve NaN si no es un número', () => {
  for (const entrada of ['abc', '', null, undefined, 'ochocientos', '12,5,3']) {
    assert.ok(Number.isNaN(parseNumeroES(entrada)), String(entrada));
  }
});

test('la hoja tal cual (todo como texto) produce exactamente las tarifas de respaldo', () => {
  const r = normalizarTarifas(valueRangesDesde(TARIFAS_RESPALDO));
  assert.equal(r.ok, true, r.errores.join('; '));
  assert.deepEqual(r.tarifas, TARIFAS_RESPALDO);
});

test('si Jordi escribe "1.200" en fontanería se lee 1200', () => {
  const vr = cambiarCelda(valueRangesDesde(TARIFAS_RESPALDO), 'Extras', 'fontaneria', 'precio', '1.200');
  const r = normalizarTarifas(vr);
  assert.equal(r.ok, true);
  assert.equal(r.tarifas.extras.fontaneria.precio, 1200);
});

test('un precio ilegible invalida la hoja (se usará el respaldo)', () => {
  const vr = cambiarCelda(valueRangesDesde(TARIFAS_RESPALDO), 'Tarifas', 'bano', 'media', 'ochocientos');
  const r = normalizarTarifas(vr);
  assert.equal(r.ok, false);
  assert.equal(r.tarifas, null);
  assert.ok(r.errores.length > 0);
});

test('un precio 0 o negativo invalida la hoja', () => {
  const vr = cambiarCelda(valueRangesDesde(TARIFAS_RESPALDO), 'Extras', 'pintura', 'precio', '0');
  assert.equal(normalizarTarifas(vr).ok, false);
});

test('falta una pestaña: inválida', () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO).filter((r) => !r.range.startsWith('Extras!'));
  assert.equal(normalizarTarifas(vr).ok, false);
});

test('falta una estancia en Tarifas: inválida', () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO);
  vr[0].values = vr[0].values.filter((f) => f[0] !== 'cocina');
  assert.equal(normalizarTarifas(vr).ok, false);
});

test('entrada basura no rompe', () => {
  for (const x of [null, undefined, 'x', [{}], [{ range: 'Tarifas!A1' }]]) {
    assert.equal(normalizarTarifas(x).ok, false);
  }
});

test('el nombre de pestaña con comillas (\'Tarifas\'!A1) también se reconoce', () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO).map((r) => ({ ...r, range: `'${r.range.split('!')[0]}'!${r.range.split('!')[1]}` }));
  assert.equal(normalizarTarifas(vr).ok, true);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguienteNumero } from '../engine/numeracion.js';

test('sin solicitudes previas: P-2026-0001', () => {
  assert.deepEqual(siguienteNumero([], 2026, 'nuevo-0001'), { numero: 'P-2026-0001', existente: false });
});

test('sigue al mayor número del año (aunque estén desordenados)', () => {
  const filas = [['P-2026-0012', 'b'], ['P-2026-0007', 'a']];
  assert.deepEqual(siguienteNumero(filas, 2026, 'nuevo-0001'), { numero: 'P-2026-0013', existente: false });
});

test('idempotencia: un solicitudId ya registrado devuelve su número', () => {
  const filas = [['P-2026-0007', 'a'], ['P-2026-0012', 'b']];
  assert.deepEqual(siguienteNumero(filas, 2026, 'b'), { numero: 'P-2026-0012', existente: true });
});

test('idempotencia con fila reservada aún sin número: el número sale de su posición', () => {
  // fila 0 → P-2026-0001 (hoja: fila 2), fila 2 → P-2026-0003 (hoja: fila 4)
  const filas = [['P-2026-0001', 'a'], ['P-2026-0002', 'b'], ['', 'c']];
  assert.deepEqual(siguienteNumero(filas, 2026, 'c'), { numero: 'P-2026-0003', existente: true });
});

test('los números de otros años no cuentan', () => {
  const filas = [['P-2025-0099', 'x']];
  assert.deepEqual(siguienteNumero(filas, 2026, 'nuevo-0001'), { numero: 'P-2026-0001', existente: false });
});

test('filas vacías, provisionales o raras se ignoran', () => {
  const filas = [[], [''], ['P-2026-TKX81'], ['basura', 'z'], ['P-2026-0003']];
  assert.deepEqual(siguienteNumero(filas, 2026, 'nuevo-0001'), { numero: 'P-2026-0004', existente: false });
  assert.deepEqual(siguienteNumero(undefined, 2026, 'nuevo-0001'), { numero: 'P-2026-0001', existente: false });
});

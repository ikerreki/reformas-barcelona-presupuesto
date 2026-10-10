// Tests que reproducen los hallazgos de la revisión independiente de las fases 2-4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarSolicitud } from '../engine/pricing.js';
import { siguienteNumero, excedeLimite } from '../engine/numeracion.js';
import { construirPromptRedaccion } from '../engine/prompt.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { solicitudMarta } from './fixtures.mjs';

const conError = (raw, campo, codigo) => validarSolicitud(raw).errores.some((e) => e.campo === campo && e.codigo === codigo);

test('I5: un email con coma o punto y coma no es válido (Gmail lo partiría en dos)', () => {
  for (const email of ['marta,puig@gmail.com', 'a@b.com;c@d.com', 'marta <m@x.com>']) {
    const s = solicitudMarta();
    s.cliente.email = email;
    assert.ok(conError(s, 'cliente.email', 'formato'), email);
  }
});

test('m² por debajo de 1 está fuera de rango (coherente con el mensaje "entre 1 y 500")', () => {
  const s = solicitudMarta();
  s.estancias[0].m2 = 0.01;
  assert.ok(conError(s, 'estancias[0].m2', 'rango'));
});

// Filas de Solicitudes (A:R): numero, solicitud_id, fecha, nombre, email, …, estado (R, índice 17)
const fila = (numero, id, { fecha = '2026-10-10', email = 'x@y.com', estado = 'nuevo' } = {}) => {
  const f = Array(18).fill('');
  f[0] = numero; f[1] = id; f[2] = fecha; f[4] = email; f[17] = estado;
  return f;
};

test('I1: una solicitud ya registrada pero a medias (pendiente) se detecta y se sabe su fila', () => {
  const filas = [fila('P-2026-0001', 'a'), fila('', 'b', { estado: 'pendiente' })];
  assert.deepEqual(siguienteNumero(filas, 2026, 'b'), { numero: 'P-2026-0002', existente: true, pendiente: true, fila: 3 });
});

test('I1: una solicitud completa no está pendiente', () => {
  const filas = [fila('P-2026-0001', 'a')];
  assert.deepEqual(siguienteNumero(filas, 2026, 'a'), { numero: 'P-2026-0001', existente: true, pendiente: false, fila: 2 });
});

test('I7: límite de solicitudes nuevas por email y día', () => {
  const filas = Array.from({ length: 5 }, (_, i) => fila(`P-2026-000${i + 1}`, `id${i}`, { email: 'Marta@Ejemplo.com' }));
  assert.equal(excedeLimite(filas, 'marta@ejemplo.com', '2026-10-10', 5), true);
  assert.equal(excedeLimite(filas, 'marta@ejemplo.com', '2026-10-11', 5), false, 'otro día');
  assert.equal(excedeLimite(filas.slice(0, 4), 'marta@ejemplo.com', '2026-10-10', 5), false);
  assert.equal(excedeLimite(filas, 'otra@ejemplo.com', '2026-10-10', 5), false);
  assert.equal(excedeLimite(undefined, 'x@y.com', '2026-10-10', 5), false);
});

test('el prompt pide no copiar detalles del ejemplo que el cliente no ha pedido', () => {
  const s = validarSolicitud(solicitudMarta({ descripcion: '' })).solicitud;
  assert.match(construirPromptRedaccion({ solicitud: s, tarifas: TARIFAS_RESPALDO }), /no copies detalles concretos del ejemplo/i);
});

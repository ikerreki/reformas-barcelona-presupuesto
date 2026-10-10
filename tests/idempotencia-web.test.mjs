// I2: la web reutiliza el solicitudId solo para reenviar los MISMOS datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idParaEnvio } from '../web/idempotencia.js';

const datosA = { idioma: 'es', estancias: [{ tipo: 'bano', m2: 6 }] };
const datosB = { idioma: 'es', estancias: [{ tipo: 'bano', m2: 8 }] };
let n = 0;
const crearId = () => `nuevo-${++n}`;

test('primer envío: usa el id que ya tenía la solicitud', () => {
  assert.equal(idParaEnvio({ id: 'a', huella: null }, datosA, crearId).id, 'a');
});

test('reintento con los mismos datos (error o corte de red): mismo id → el servidor no duplica', () => {
  const primero = idParaEnvio({ id: 'a', huella: null }, datosA, crearId);
  assert.equal(idParaEnvio(primero, structuredClone(datosA), crearId).id, 'a');
});

test('reintento con datos cambiados: id nuevo → no se confunde con la solicitud anterior', () => {
  const primero = idParaEnvio({ id: 'a', huella: null }, datosA, crearId);
  const segundo = idParaEnvio(primero, datosB, crearId);
  assert.notEqual(segundo.id, 'a');
  assert.equal(idParaEnvio(segundo, datosB, crearId).id, segundo.id, 'y ese id nuevo se mantiene en sus reintentos');
});

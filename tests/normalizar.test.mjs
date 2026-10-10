// Formato automático de los datos del cliente (pedido tras las pruebas reales: «calle valencia 31 1ro 2da»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombrePropio, normalizarEmail, normalizarTelefono, normalizarCalle, normalizarPiso, normalizarCP, componerDireccion } from '../engine/normalizar.js';

test('nombre y apellidos: mayúscula inicial si se escribió todo en minúsculas o en mayúsculas', () => {
  assert.equal(nombrePropio('laura serra prats'), 'Laura Serra Prats');
  assert.equal(nombrePropio('LAURA SERRA'), 'Laura Serra');
  assert.equal(nombrePropio('  maría   josé '), 'María José');
  assert.equal(nombrePropio('ana-belén'), 'Ana-Belén');
});

test('nombre y apellidos: partículas en minúscula y mayúsculas mezcladas respetadas', () => {
  assert.equal(nombrePropio('garcía de la torre'), 'García de la Torre');
  assert.equal(nombrePropio('PUIG I FERRER'), 'Puig i Ferrer');
  assert.equal(nombrePropio('McDonald'), 'McDonald');
  assert.equal(nombrePropio("o'brien"), "O'Brien");
  assert.equal(nombrePropio("joan d'ors"), "Joan d'Ors");
  assert.equal(nombrePropio('de la fuente'), 'De la Fuente', 'la primera palabra siempre en mayúscula');
});

test('email en minúsculas y sin espacios', () => {
  assert.equal(normalizarEmail('  Laura.Serra@GMAIL.com '), 'laura.serra@gmail.com');
});

test('teléfono español agrupado de 3 en 3; extranjeros, tal cual', () => {
  assert.equal(normalizarTelefono('645403020'), '645 403 020');
  assert.equal(normalizarTelefono('+34645403020'), '+34 645 403 020');
  assert.equal(normalizarTelefono('0034 645-40-30-20'), '+34 645 403 020');
  assert.equal(normalizarTelefono('93 000 00 00'), '930 000 000');
  assert.equal(normalizarTelefono('+44 20  7946 0958'), '+44 20 7946 0958');
  assert.equal(normalizarTelefono(''), '');
});

test('calle: mayúscula inicial, partículas en minúscula y coma antes del número', () => {
  assert.equal(normalizarCalle('calle valencia 31'), 'Calle Valencia, 31');
  assert.equal(normalizarCalle('carrer del bruc 2'), 'Carrer del Bruc, 2');
  assert.equal(normalizarCalle('CALLE MAYOR 5B'), 'Calle Mayor, 5B');
  assert.equal(normalizarCalle('c/ mallorca 401'), 'C/ Mallorca, 401');
  assert.equal(normalizarCalle('av. diagonal 600'), 'Av. Diagonal, 600');
  assert.equal(normalizarCalle('Carrer de Provença, 210'), 'Carrer de Provença, 210', 'lo bien escrito no se toca');
});

test('piso y puerta: ordinales normalizados', () => {
  assert.equal(normalizarPiso('1ro 2da'), '1.º 2.ª');
  assert.equal(normalizarPiso('4to 2da'), '4.º 2.ª');
  assert.equal(normalizarPiso('3º 1ª'), '3.º 1.ª');
  assert.equal(normalizarPiso('1r 2a'), '1.º 2.ª');
  assert.equal(normalizarPiso('bajos'), 'Bajos');
  assert.equal(normalizarPiso('ático puerta b'), 'Ático Puerta B');
});

test('código postal: 5 cifras o nada', () => {
  assert.deepEqual(normalizarCP(' 08015 '), { ok: true, cp: '08015' });
  assert.deepEqual(normalizarCP(''), { ok: true, cp: '' });
  assert.equal(normalizarCP('8015').ok, false);
  assert.equal(normalizarCP('abcde').ok, false);
});

test('dirección compuesta en una línea; la población sola (viene rellena) no cuenta como dirección', () => {
  assert.equal(componerDireccion({ calle: 'calle valencia 31', piso: '1ro 2da', cp: '08015', poblacion: 'barcelona' }),
    'Calle Valencia, 31, 1.º 2.ª, 08015 Barcelona');
  assert.equal(componerDireccion({ calle: 'Carrer de Verdi, 48', piso: '', cp: '', poblacion: 'Barcelona' }), 'Carrer de Verdi, 48, Barcelona');
  assert.equal(componerDireccion({ calle: '', piso: '', cp: '', poblacion: 'Barcelona' }), '');
  assert.equal(componerDireccion({ calle: "av. de la generalitat 3", poblacion: "sant cugat del vallès" }), 'Av. de la Generalitat, 3, Sant Cugat del Vallès');
});

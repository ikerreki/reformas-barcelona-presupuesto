import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES, EMPRESA } from '../engine/catalogo.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';

test('el catálogo tiene los códigos exactos de la spec', () => {
  assert.deepEqual(ESTANCIAS, ['bano', 'cocina', 'salon', 'dormitorio', 'vivienda']);
  assert.deepEqual(CALIDADES, ['basica', 'media', 'alta']);
  assert.deepEqual(EXTRAS_ESTANCIA, ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire']);
  assert.deepEqual(EXTRAS_GENERALES, ['licencia']);
  assert.deepEqual(IDIOMAS, ['es', 'ca', 'en']);
  assert.equal(LIMITES.maxEstancias, 6);
  assert.equal(LIMITES.m2Max, 500);
  assert.equal(EMPRESA.gerente, 'Jordi Ferrer');
});

test('baño calidad media cuesta 880 €/m² (Excel)', () => {
  assert.equal(TARIFAS_RESPALDO.estancias.bano.media, 880);
});

test('la fontanería es un extra fijo de 1.200 € por estancia', () => {
  const f = TARIFAS_RESPALDO.extras.fontaneria;
  assert.equal(f.tipo, 'fijo');
  assert.equal(f.precio, 1200);
  assert.equal(f.ambito, 'estancia');
  assert.equal(f.descripcion.es, 'Cambiar todas las tuberías de agua y desagües de la estancia.');
});

test('la licencia es un extra general (una vez por obra)', () => {
  assert.equal(TARIFAS_RESPALDO.extras.licencia.ambito, 'general');
  assert.equal(TARIFAS_RESPALDO.extras.licencia.precio, 350);
});

test('el plazo de vivienda completa es 8–12 semanas', () => {
  assert.deepEqual(TARIFAS_RESPALDO.plazos.vivienda, { min: 8, max: 12 });
});

test('todas las combinaciones estancia × calidad tienen precio > 0', () => {
  for (const e of ESTANCIAS) for (const c of CALIDADES) {
    assert.ok(TARIFAS_RESPALDO.estancias[e][c] > 0, `${e}/${c}`);
  }
});

test('todos los extras del catálogo tienen tarifa y descripción en 3 idiomas', () => {
  for (const codigo of [...EXTRAS_ESTANCIA, ...EXTRAS_GENERALES]) {
    const x = TARIFAS_RESPALDO.extras[codigo];
    assert.ok(x && x.precio > 0, codigo);
    for (const i of IDIOMAS) assert.ok(x.descripcion[i], `${codigo}.${i}`);
  }
});

test('hay 6 condiciones, cada una en es/ca/en', () => {
  assert.equal(TARIFAS_RESPALDO.condiciones.length, 6);
  for (const c of TARIFAS_RESPALDO.condiciones) for (const i of IDIOMAS) {
    assert.ok(c.titulo[i] && c.detalle[i], `${c.titulo.es}.${i}`);
  }
});

test('IVA 21 % y validez 30 días', () => {
  assert.deepEqual(TARIFAS_RESPALDO.config, { ivaPct: 21, validezDias: 30 });
});

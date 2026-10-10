import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textosPlantilla } from '../engine/plantilla.js';
import { construirPromptRedaccion, construirPromptFoto } from '../engine/prompt.js';
import { validarTextosIA, contieneImportes } from '../engine/guardrail.js';
import { validarSolicitud } from '../engine/pricing.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { solicitudMarta } from './fixtures.mjs';

const valida = (raw) => validarSolicitud(raw).solicitud;

test('plantilla de Marta en español: saludo correcto y supera el guardarraíl', () => {
  const t = textosPlantilla({ solicitud: valida(solicitudMarta()), tarifas: TARIFAS_RESPALDO });
  assert.equal(t.saludo, 'Hola Marta:');
  assert.ok(t.trabajos.length >= 3);
  assert.deepEqual(validarTextosIA(t), { ok: true, motivo: null });
});

test('plantilla en catalán e inglés también supera el guardarraíl', () => {
  for (const idioma of ['ca', 'en']) {
    const t = textosPlantilla({ solicitud: valida(solicitudMarta({ idioma })), tarifas: TARIFAS_RESPALDO });
    assert.deepEqual(validarTextosIA(t), { ok: true, motivo: null }, idioma);
  }
  const en = textosPlantilla({ solicitud: valida(solicitudMarta({ idioma: 'en' })), tarifas: TARIFAS_RESPALDO });
  assert.equal(en.saludo, 'Hi Marta,');
});

test('plantilla: 1 estancia sin extras sigue teniendo ≥3 trabajos; 6 estancias con todo, ≤10', () => {
  const minima = valida(solicitudMarta({ estancias: [{ tipo: 'dormitorio', m2: 10, calidad: 'basica', extras: [] }] }));
  assert.ok(textosPlantilla({ solicitud: minima, tarifas: TARIFAS_RESPALDO }).trabajos.length >= 3);
  const todo = ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire'];
  const maxima = valida(solicitudMarta({
    estancias: Array.from({ length: 6 }, () => ({ tipo: 'bano', m2: 6, calidad: 'alta', extras: todo })),
    extrasGenerales: ['licencia'],
  }));
  const t = textosPlantilla({ solicitud: maxima, tarifas: TARIFAS_RESPALDO });
  assert.ok(t.trabajos.length <= 10);
  assert.equal(validarTextosIA(t).ok, true);
});

test('prompt de redacción: datos del cliente delimitados y one-shot incluido', () => {
  const p = construirPromptRedaccion({ solicitud: valida(solicitudMarta()), tarifas: TARIFAS_RESPALDO });
  assert.ok(p.includes('<<<DATOS_CLIENTE'));
  assert.ok(p.includes('DATOS_CLIENTE>>>'));
  // lastIndexOf: la primera aparición está en las reglas que explican el delimitador.
  const ini = p.lastIndexOf('<<<DATOS_CLIENTE');
  const fin = p.lastIndexOf('DATOS_CLIENTE>>>');
  assert.ok(p.slice(ini, fin).includes('plato de ducha grande'));
  assert.ok(p.includes('Plato de ducha extraplano'));
});

test('prompt de redacción: la IA no recibe ningún importe', () => {
  const p = construirPromptRedaccion({
    solicitud: valida(solicitudMarta({ extrasGenerales: ['licencia'] })),
    tarifas: TARIFAS_RESPALDO,
  });
  for (const prohibido of ['€', '880', '1200', '1.200', '350', '21 %']) assert.ok(!p.includes(prohibido), prohibido);
});

test('prompt de redacción: el nombre de la empresa no se traduce («Reformes Barcelona» en CA)', () => {
  const p = construirPromptRedaccion({ solicitud: valida(solicitudMarta({ idioma: 'ca' })), tarifas: TARIFAS_RESPALDO });
  assert.match(p, /«Reformas Barcelona».*no lo traduzcas/i);
});

test('prompt de redacción: idioma de salida explícito', () => {
  const p = construirPromptRedaccion({ solicitud: valida(solicitudMarta({ idioma: 'ca' })), tarifas: TARIFAS_RESPALDO });
  assert.match(p, /catalán/i);
});

test('prompt de foto: catálogo cerrado y sin precios', () => {
  const p = construirPromptFoto({ estancia: { tipo: 'bano', m2: 6, calidad: 'media', extras: [] }, idioma: 'es' });
  for (const codigo of ['demolicion', 'fontaneria', 'suelo_radiante', 'a_reformar', 'esEstancia']) assert.ok(p.includes(codigo), codigo);
  assert.equal(contieneImportes(p), false);
  assert.ok(!p.includes('€'));
});

test('la plantilla nunca nombra un extra que no se ha elegido (todas las combinaciones de un extra)', () => {
  const todos = ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire'];
  for (const idioma of ['es', 'ca', 'en']) {
    for (const calidad of ['basica', 'media', 'alta']) {
      for (const extra of [null, ...todos]) {
        const s = valida(solicitudMarta({ idioma, estancias: [{ tipo: 'cocina', m2: 10, calidad, extras: extra ? [extra] : [] }] }));
        const t = textosPlantilla({ solicitud: s, tarifas: TARIFAS_RESPALDO });
        assert.deepEqual(validarTextosIA(t, { extrasElegidos: extra ? [extra] : [] }), { ok: true, motivo: null }, `${idioma}/${calidad}/${extra}`);
      }
    }
  }
});

test('prompt de redacción: prohíbe nombrar extras no elegidos y adaptar la calidad a la estancia', () => {
  const p = construirPromptRedaccion({ solicitud: valida(solicitudMarta()), tarifas: TARIFAS_RESPALDO });
  assert.match(p, /no lo menciones/);
  assert.match(p, /no hay grifería en un dormitorio/);
});

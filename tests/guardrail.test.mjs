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

// ---- La IA no puede prometer trabajos que el presupuesto no cobra (caso real: ejecución 72) ----
const textosEric = () => ({
  saludo: 'Hola Eric:',
  resumen: 'Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar el salón-comedor y el dormitorio de tu piso de los años 70 en el Eixample, con el punto de luz para el proyector.',
  trabajos: [
    'Demolición de los revestimientos actuales y retirada de la lámpara principal del salón, con transporte de escombros al punto limpio.',
    'Renovación completa de las tuberías de agua y desagües en ambas estancias.',
    'Instalación eléctrica nueva de cableado, enchufes y mecanismos, con cuadro eléctrico y boletín.',
    'Suministro e instalación de un equipo de aire acondicionado tipo split con bomba de calor en el dormitorio.',
    'Limpieza final de la obra.',
  ],
  cierre: 'Si tienes cualquier duda o quieres ajustar algún detalle, estaremos encantados de ayudarte.',
});

test('rechaza un texto que menciona un extra que el cliente no ha elegido (demolición sin demolición)', () => {
  const r = validarTextosIA(textosEric(), { extrasElegidos: ['fontaneria', 'electricidad', 'pintura', 'aire'] });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /demolicion/);
});

test('acepta el mismo texto si todos los extras que nombra están elegidos', () => {
  const r = validarTextosIA(textosEric(), { extrasElegidos: ['demolicion', 'fontaneria', 'electricidad', 'aire'] });
  assert.deepEqual(r, { ok: true, motivo: null });
});

test('Marta: con demolición y fontanería pasa; sin fontanería, no (habla de tuberías)', () => {
  assert.equal(validarTextosIA(TEXTOS_MARTA, { extrasElegidos: ['demolicion', 'fontaneria'] }).ok, true);
  assert.equal(validarTextosIA(TEXTOS_MARTA, { extrasElegidos: ['demolicion'] }).ok, false);
});

test('las señales de cada extra funcionan en catalán e inglés', () => {
  // Resumen neutro: el de Marta habla de tuberías y haría fallar cualquier combinación sin fontanería.
  const resumen = 'Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto con los trabajos que nos has pedido para tu vivienda.';
  const base = { ...TEXTOS_MARTA, resumen, trabajos: ['Neteja final de l\'obra.', 'Final clean-up.', 'x'] };
  for (const [frase, extra] of [
    ['Enderroc del revestiment i retirada de la runa.', 'demolicion'],
    ['Canviar totes les canonades d\'aigua.', 'fontaneria'],
    ['New wiring and fuse box.', 'electricidad'],
    ['Terra radiant per aigua.', 'suelo_radiante'],
    ['Air conditioning split unit with heat pump.', 'aire'],
    ['Gestió de la llicència d\'obra.', 'licencia'],
  ]) {
    const t = { ...base, trabajos: [frase, ...base.trabajos] };
    assert.equal(validarTextosIA(t, { extrasElegidos: [] }).ok, false, frase);
    assert.equal(validarTextosIA(t, { extrasElegidos: [extra] }).ok, true, frase);
  }
});

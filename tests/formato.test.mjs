import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatEUR, formatFecha, sumarDias, formatPlazo, formatM2 } from '../engine/formato.js';
import { conceptoPartida, listaEstancias } from '../engine/etiquetas.js';

test('formatEUR: como el presupuesto de ejemplo', () => {
  assert.equal(formatEUR(809490), '8.094,90 €');
  assert.equal(formatEUR(140490), '1.404,90 €');
  assert.equal(formatEUR(669000), '6.690 €');
  assert.equal(formatEUR(21000), '210 €');
  assert.equal(formatEUR(88000), '880 €');
  assert.equal(formatEUR(5), '0,05 €');
  assert.equal(formatEUR(123456789), '1.234.567,89 €');
  assert.equal(formatEUR(0), '0 €');
});

test('formatFecha en los tres idiomas', () => {
  assert.equal(formatFecha('2026-10-06', 'es'), '6 de octubre de 2026');
  assert.equal(formatFecha('2026-10-06', 'ca'), "6 d'octubre de 2026");
  assert.equal(formatFecha('2026-01-15', 'ca'), '15 de gener de 2026');
  assert.equal(formatFecha('2026-10-06', 'en'), '6 October 2026');
});

test('sumarDias cruza meses correctamente', () => {
  assert.equal(sumarDias('2026-10-10', 30), '2026-11-09');
  assert.equal(sumarDias('2026-12-20', 30), '2027-01-19');
});

test('formatPlazo', () => {
  assert.equal(formatPlazo({ minSemanas: 2, maxSemanas: 3 }, 'es'), '2–3 semanas');
  assert.equal(formatPlazo({ minSemanas: 5, maxSemanas: 7 }, 'ca'), '5–7 setmanes');
  assert.equal(formatPlazo({ minSemanas: 8, maxSemanas: 12 }, 'en'), '8–12 weeks');
  assert.equal(formatPlazo({ minSemanas: 2, maxSemanas: 2 }, 'es'), '2 semanas');
});

test('formatM2 usa coma decimal', () => {
  assert.equal(formatM2(6), '6');
  assert.equal(formatM2(12.5), '12,5');
});

test('conceptoPartida: estancia y extras traducidos', () => {
  const seccion = { estanciaIndex: 0, tipo: 'bano', calidad: 'media', m2: 6 };
  assert.equal(conceptoPartida({ codigo: 'estancia' }, seccion, 'es'), 'Reforma de baño · calidad media');
  assert.equal(conceptoPartida({ codigo: 'estancia' }, seccion, 'ca'), 'Reforma de bany · qualitat mitjana');
  assert.equal(conceptoPartida({ codigo: 'estancia' }, seccion, 'en'), 'Bathroom renovation · mid-range quality');
  assert.equal(conceptoPartida({ codigo: 'demolicion' }, seccion, 'es'), 'Demolición y retirada de escombros');
  assert.equal(conceptoPartida({ codigo: 'licencia' }, { tipo: 'general' }, 'es'), 'Gestión de licencia de obra');
});

test('listaEstancias une con "y" / "i" / "and"', () => {
  assert.equal(listaEstancias(['bano'], 'es'), 'baño');
  assert.equal(listaEstancias(['bano', 'cocina'], 'es'), 'baño y cocina');
  assert.equal(listaEstancias(['bano', 'cocina', 'salon'], 'ca'), 'bany, cuina i saló/menjador');
  assert.equal(listaEstancias(['bano', 'bano'], 'en'), 'bathroom and bathroom');
});

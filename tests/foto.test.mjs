import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarAnalisisFoto, estimarConFoto, validarEntradaFoto } from '../engine/foto.js';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';

const analisisBueno = () => ({
  esEstancia: true,
  estanciaDetectada: 'bano',
  estado: 'a_reformar',
  elementos: ['bañera', 'azulejo antiguo', 'sanitarios de los 90'],
  calidadAparente: 'basica',
  extrasSugeridos: [
    { extra: 'demolicion', motivo: 'Se ven azulejos y sanitarios antiguos que habría que retirar.' },
    { extra: 'fontaneria', motivo: 'La instalación parece la original.' },
  ],
  confianza: 0.82,
  notaTecnica: 'Posible humedad en la esquina superior: revisar en la visita.',
});

test('un análisis correcto se conserva', () => {
  const r = validarAnalisisFoto(analisisBueno());
  assert.equal(r.ok, true);
  assert.equal(r.analisis.estanciaDetectada, 'bano');
  assert.equal(r.analisis.estado, 'a_reformar');
  assert.deepEqual(r.analisis.extrasSugeridos.map((x) => x.extra), ['demolicion', 'fontaneria']);
  assert.equal(r.analisis.confianza, 0.82);
});

test('extras inventados por la IA se descartan (y los repetidos también)', () => {
  const a = analisisBueno();
  a.extrasSugeridos = [{ extra: 'demolicion', motivo: 'x' }, { extra: 'jacuzzi', motivo: 'y' }, { extra: 'demolicion', motivo: 'z' }];
  assert.deepEqual(validarAnalisisFoto(a).analisis.extrasSugeridos.map((x) => x.extra), ['demolicion']);
});

test('la confianza se acota a [0, 1]', () => {
  assert.equal(validarAnalisisFoto({ ...analisisBueno(), confianza: 7 }).analisis.confianza, 1);
  assert.equal(validarAnalisisFoto({ ...analisisBueno(), confianza: -2 }).analisis.confianza, 0);
  assert.equal(validarAnalisisFoto({ ...analisisBueno(), confianza: 'mucha' }).analisis.confianza, 0);
});

test('valores fuera del catálogo pasan a null', () => {
  const r = validarAnalisisFoto({ ...analisisBueno(), estanciaDetectada: 'garaje', estado: 'fatal', calidadAparente: 'lujo' });
  assert.equal(r.analisis.estanciaDetectada, null);
  assert.equal(r.analisis.estado, null);
  assert.equal(r.analisis.calidadAparente, null);
});

test('si la foto no es una estancia, no hay sugerencias', () => {
  const r = validarAnalisisFoto({ ...analisisBueno(), esEstancia: false });
  assert.equal(r.ok, true);
  assert.equal(r.analisis.esEstancia, false);
  assert.deepEqual(r.analisis.extrasSugeridos, []);
});

test('textos de la IA acotados y sin importes', () => {
  const a = analisisBueno();
  a.elementos = Array.from({ length: 10 }, (_, i) => `elemento ${i}`);
  a.notaTecnica = 'x'.repeat(1000);
  a.extrasSugeridos = [{ extra: 'demolicion', motivo: 'Cuesta unos 300 euros retirar todo' }];
  const r = validarAnalisisFoto(a).analisis;
  assert.equal(r.elementos.length, 6);
  assert.ok(r.notaTecnica.length <= 300);
  assert.equal(r.extrasSugeridos[0].motivo, '');
});

test('entrada basura no rompe', () => {
  for (const x of [null, 'hola', 42, []]) assert.equal(validarAnalisisFoto(x).ok, false);
});

test('estimación: baño 6 m² media + sugerencias demolición y fontanería = 8.094,90 € (el motor, no la IA)', () => {
  const e = estimarConFoto({
    estancia: { tipo: 'bano', m2: 6, calidad: 'media', extras: [] },
    analisis: validarAnalisisFoto(analisisBueno()).analisis,
    tarifas: TARIFAS_RESPALDO,
  });
  assert.deepEqual(e.extras, ['demolicion', 'fontaneria']);
  assert.equal(e.total, 8094.9);
  assert.deepEqual(e.plazo, { minSemanas: 2, maxSemanas: 3 });
});

test('estimación: une los extras que ya tenía el cliente con los sugeridos', () => {
  const e = estimarConFoto({
    estancia: { tipo: 'bano', m2: 6, calidad: 'media', extras: ['pintura'] },
    analisis: validarAnalisisFoto(analisisBueno()).analisis,
    tarifas: TARIFAS_RESPALDO,
  });
  assert.deepEqual(e.extras, ['demolicion', 'fontaneria', 'pintura']);
});

test('estimación sin m² válidos: total null (la foto no mide superficies)', () => {
  const e = estimarConFoto({
    estancia: { tipo: 'bano', m2: '', calidad: 'media', extras: [] },
    analisis: validarAnalisisFoto(analisisBueno()).analisis,
    tarifas: TARIFAS_RESPALDO,
  });
  assert.equal(e.total, null);
});

// ---- Entrada que llega de la web al flujo «Analizar foto» ----
const entrada = (cambios = {}) => ({
  idioma: 'es',
  estancia: { tipo: 'bano', m2: 6, calidad: 'media', extras: [] },
  imagen: { mime: 'image/jpeg', base64: '/9j/4AAQSkZJRgABAQ' },
  ...cambios,
});

test('entrada de foto válida', () => {
  const r = validarEntradaFoto(entrada());
  assert.equal(r.ok, true);
  assert.equal(r.idioma, 'es');
  assert.equal(r.estancia.tipo, 'bano');
  assert.equal(r.imagen.mime, 'image/jpeg');
});

test('entrada de foto: tipo de imagen no permitido, vacía o demasiado grande', () => {
  assert.equal(validarEntradaFoto(entrada({ imagen: { mime: 'application/pdf', base64: 'abc' } })).ok, false);
  assert.equal(validarEntradaFoto(entrada({ imagen: { mime: 'image/png', base64: '' } })).ok, false);
  assert.equal(validarEntradaFoto(entrada({ imagen: { mime: 'image/png', base64: 'A'.repeat(2_900_000) } })).ok, false);
  assert.equal(validarEntradaFoto(entrada({ imagen: { mime: 'image/png', base64: 'no es base64!!' } })).ok, false);
});

test('entrada de foto: estancia o idioma desconocidos', () => {
  assert.equal(validarEntradaFoto(entrada({ estancia: { tipo: 'garaje', m2: 6, calidad: 'media', extras: [] } })).ok, false);
  assert.equal(validarEntradaFoto(entrada({ idioma: 'fr' })).ok, false);
  for (const x of [null, 'hola', {}]) assert.equal(validarEntradaFoto(x).ok, false);
});

test('entrada de foto: acepta un data URL y se queda solo con el base64', () => {
  const r = validarEntradaFoto(entrada({ imagen: { mime: 'image/jpeg', base64: 'data:image/jpeg;base64,/9j/4AAQ' } }));
  assert.equal(r.ok, true);
  assert.equal(r.imagen.base64, '/9j/4AAQ');
});

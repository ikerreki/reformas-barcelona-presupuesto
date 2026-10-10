import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarSolicitud } from '../engine/pricing.js';
import { solicitudMarta, clonar } from './fixtures.mjs';

const tieneError = (r, campo, codigo) =>
  r.errores.some((e) => e.campo === campo && e.codigo === codigo);

test('la solicitud de Marta es válida', () => {
  const r = validarSolicitud(solicitudMarta());
  assert.equal(r.ok, true);
  assert.equal(r.esBot, false);
  assert.deepEqual(r.errores, []);
  assert.equal(r.solicitud.cliente.nombre, 'Marta');
  assert.equal(r.solicitud.cliente.nombreCompleto, 'Marta Puig');
  assert.equal(r.solicitud.estancias[0].m2, 6);
});

test('honeypot relleno: es un bot', () => {
  const r = validarSolicitud(solicitudMarta({ website: 'http://spam.example' }));
  assert.equal(r.esBot, true);
  assert.equal(r.ok, false);
});

test('email sin dominio: error de formato', () => {
  const s = solicitudMarta();
  s.cliente.email = 'marta@';
  assert.ok(tieneError(validarSolicitud(s), 'cliente.email', 'formato'));
});

test('nombre vacío: requerido', () => {
  const s = solicitudMarta();
  s.cliente.nombre = '   ';
  assert.ok(tieneError(validarSolicitud(s), 'cliente.nombre', 'requerido'));
});

test('m² fuera de rango (0 y 501)', () => {
  for (const m2 of [0, 501, -3]) {
    const s = solicitudMarta();
    s.estancias[0].m2 = m2;
    assert.ok(tieneError(validarSolicitud(s), 'estancias[0].m2', 'rango'), String(m2));
  }
});

test('m² con coma decimal ("6,5") se acepta como 6.5', () => {
  const s = solicitudMarta();
  s.estancias[0].m2 = '6,5';
  const r = validarSolicitud(s);
  assert.equal(r.ok, true);
  assert.equal(r.solicitud.estancias[0].m2, 6.5);
});

test('m² con más de 2 decimales: formato', () => {
  const s = solicitudMarta();
  s.estancias[0].m2 = 6.555;
  assert.ok(tieneError(validarSolicitud(s), 'estancias[0].m2', 'formato'));
});

test('m² no numérico: formato', () => {
  const s = solicitudMarta();
  s.estancias[0].m2 = 'seis';
  assert.ok(tieneError(validarSolicitud(s), 'estancias[0].m2', 'formato'));
});

test('tipo de estancia desconocido', () => {
  const s = solicitudMarta();
  s.estancias[0].tipo = 'garaje';
  assert.ok(tieneError(validarSolicitud(s), 'estancias[0].tipo', 'desconocido'));
});

test('calidad desconocida', () => {
  const s = solicitudMarta();
  s.estancias[0].calidad = 'lujo';
  assert.ok(tieneError(validarSolicitud(s), 'estancias[0].calidad', 'desconocido'));
});

test('extras duplicados se eliminan', () => {
  const s = solicitudMarta();
  s.estancias[0].extras = ['demolicion', 'demolicion'];
  const r = validarSolicitud(s);
  assert.equal(r.ok, true);
  assert.deepEqual(r.solicitud.estancias[0].extras, ['demolicion']);
});

test('la licencia no se puede pedir dentro de una estancia', () => {
  const s = solicitudMarta();
  s.estancias[0].extras = ['licencia'];
  assert.ok(tieneError(validarSolicitud(s), 'estancias[0].extras', 'desconocido'));
});

test('extras generales: solo licencia', () => {
  const ok = validarSolicitud(solicitudMarta({ extrasGenerales: ['licencia'] }));
  assert.equal(ok.ok, true);
  const mal = validarSolicitud(solicitudMarta({ extrasGenerales: ['pintura'] }));
  assert.ok(tieneError(mal, 'extrasGenerales', 'desconocido'));
});

test('sin estancias o con 7 estancias: rango', () => {
  assert.ok(tieneError(validarSolicitud(solicitudMarta({ estancias: [] })), 'estancias', 'rango'));
  const base = solicitudMarta().estancias[0];
  const siete = Array.from({ length: 7 }, () => clonar(base));
  assert.ok(tieneError(validarSolicitud(solicitudMarta({ estancias: siete })), 'estancias', 'rango'));
});

test('sin aceptar la privacidad', () => {
  assert.ok(tieneError(validarSolicitud(solicitudMarta({ privacidad: false })), 'privacidad', 'privacidad'));
});

test('descripción de más de 1.000 caracteres', () => {
  const r = validarSolicitud(solicitudMarta({ descripcion: 'a'.repeat(1001) }));
  assert.ok(tieneError(r, 'descripcion', 'longitud'));
});

test('idioma no soportado', () => {
  assert.ok(tieneError(validarSolicitud(solicitudMarta({ idioma: 'fr' })), 'idioma', 'desconocido'));
});

test('solicitudId obligatorio', () => {
  assert.ok(tieneError(validarSolicitud(solicitudMarta({ solicitudId: '' })), 'solicitudId', 'requerido'));
});

test('normaliza: recorta textos y rellena opcionales', () => {
  const s = solicitudMarta();
  s.cliente.nombre = '  Marta  ';
  delete s.cliente.telefono;
  delete s.extrasGenerales;
  delete s.estancias[0].notaFoto;
  const r = validarSolicitud(s);
  assert.equal(r.ok, true);
  assert.equal(r.solicitud.cliente.nombre, 'Marta');
  assert.equal(r.solicitud.cliente.telefono, '');
  assert.deepEqual(r.solicitud.extrasGenerales, []);
  assert.equal(r.solicitud.estancias[0].notaFoto, null);
});

test('entrada basura (null, string) no rompe: devuelve errores', () => {
  for (const raw of [null, 'hola', 42, {}]) {
    const r = validarSolicitud(raw);
    assert.equal(r.ok, false);
    assert.ok(r.errores.length > 0);
  }
});

// ---- Apellidos obligatorios y formato automático (pedido tras las pruebas reales) ----
test('apellidos obligatorios y con longitud acotada', () => {
  const s = solicitudMarta();
  delete s.cliente.apellidos;
  assert.ok(tieneError(validarSolicitud(s), 'cliente.apellidos', 'requerido'));
  const t = solicitudMarta();
  t.cliente.apellidos = 'x'.repeat(101);
  assert.ok(tieneError(validarSolicitud(t), 'cliente.apellidos', 'longitud'));
});

test('formato automático: mayúsculas, email en minúsculas, teléfono agrupado y dirección en una línea', () => {
  const s = solicitudMarta();
  s.cliente = { nombre: 'reki', apellidos: 'SILVA', email: 'IkerRodriguezSilva@Gmail.com', telefono: '645403020',
    direccion: { calle: 'calle valencia 31', piso: '1ro 2da', cp: '08015', poblacion: 'barcelona' } };
  assert.deepEqual(validarSolicitud(s).solicitud.cliente, {
    nombre: 'Reki', apellidos: 'Silva', nombreCompleto: 'Reki Silva', email: 'ikerrodriguezsilva@gmail.com',
    telefono: '645 403 020', direccion: 'Calle Valencia, 31, 1.º 2.ª, 08015 Barcelona',
  });
});

test('dirección por campos: el error sale en el campo concreto', () => {
  const a = solicitudMarta();
  a.cliente.direccion = { calle: 'Carrer de Verdi, 48', piso: '', cp: '8012', poblacion: 'Barcelona' };
  assert.ok(tieneError(validarSolicitud(a), 'cliente.direccion.cp', 'formato'));
  const b = solicitudMarta();
  b.cliente.direccion = { calle: '', piso: '3.º 1.ª', cp: '', poblacion: 'Barcelona' };
  assert.ok(tieneError(validarSolicitud(b), 'cliente.direccion.calle', 'requerido'));
  const c = solicitudMarta();
  c.cliente.direccion = { calle: '', piso: '', cp: '', poblacion: 'Barcelona' };
  assert.equal(validarSolicitud(c).solicitud.cliente.direccion, '', 'solo la población (rellena de serie) = sin dirección');
});

test('la dirección en una sola línea (formato anterior) sigue funcionando y se formatea', () => {
  const s = solicitudMarta();
  s.cliente.direccion = 'carrer del bruc 2';
  assert.equal(validarSolicitud(s).solicitud.cliente.direccion, 'Carrer del Bruc, 2');
});

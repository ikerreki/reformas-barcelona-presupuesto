// Ejecuta el código generado para los nodos Code de n8n en una sandbox (node:vm),
// simulando la API de n8n ($input, $('Nodo'), $prevNode). Así probamos lo que realmente correrá en n8n.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildCodigoNodo } from '../n8n/build.mjs';
import { TARIFAS_RESPALDO } from '../engine/tarifas.js';
import { hoyEnMadrid } from '../engine/formato.js';
import { solicitudMarta, valueRangesDesde } from './fixtures.mjs';
import { TEXTOS_MARTA } from './textos-marta.mjs';

async function ejecutarNodo(nombre, { input, nodos = {}, prevNode = 'Anterior' }) {
  const codigo = buildCodigoNodo(nombre);
  const ctx = vm.createContext({
    $input: { first: () => ({ json: input }), all: () => [{ json: input }] },
    $: (n) => ({ first: () => ({ json: nodos[n] }) }),
    $prevNode: { name: prevNode },
    console,
  });
  const salida = await vm.runInContext(`(async () => {\n${codigo}\n})()`, ctx);
  assert.ok(Array.isArray(salida) && salida[0] && salida[0].json, 'el nodo debe devolver [{ json }]');
  // n8n serializa a JSON lo que pasa entre nodos; hacemos lo mismo (y así salimos del "realm" de vm).
  return JSON.parse(JSON.stringify(salida[0].json));
}

const anio = Number(hoyEnMadrid().slice(0, 4));

test('el código generado no contiene import/export (n8n no los admite)', () => {
  for (const n of ['validar', 'calcular', 'comprobar-ia', 'montar']) {
    const c = buildCodigoNodo(n);
    assert.ok(!/^\s*(import|export)\s/m.test(c), n);
  }
});

test('hoyEnMadrid devuelve AAAA-MM-DD en hora de Madrid', () => {
  assert.equal(hoyEnMadrid(new Date('2026-12-31T23:30:00Z')), '2027-01-01');
  assert.match(hoyEnMadrid(), /^\d{4}-\d{2}-\d{2}$/);
});

test('nodo validar: lee el body del Webhook', async () => {
  const out = await ejecutarNodo('validar', { input: { body: solicitudMarta(), headers: {} } });
  assert.equal(out.ok, true);
  assert.equal(out.solicitud.cliente.nombre, 'Marta Puig');
});

test('nodo calcular: con la hoja → total de Marta, tarifas de la hoja y número correlativo', async () => {
  const validar = { ok: true, solicitud: solicitudMarta() };
  const hoja = { valueRanges: valueRangesDesde(TARIFAS_RESPALDO, [[`P-${anio}-0007`, 'otro-id-0001']]) };
  const out = await ejecutarNodo('calcular', { input: hoja, nodos: { Validar: validar } });
  assert.equal(out.calculo.totalCents, 809490);
  assert.equal(out.origenTarifas, 'sheet');
  assert.equal(out.numero, `P-${anio}-0008`);
  assert.equal(out.numeroExistente, false);
  assert.equal(out.numeroProvisional, false);
  assert.match(out.fechaISO, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(out.promptRedaccion.includes('<<<DATOS_CLIENTE'));
});

test('nodo calcular: Solicitudes vacía (Google omite "values") → P-AAAA-0001', async () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO);
  delete vr[vr.length - 1].values;
  const out = await ejecutarNodo('calcular', { input: { valueRanges: vr }, nodos: { Validar: { ok: true, solicitud: solicitudMarta() } } });
  assert.equal(out.numero, `P-${anio}-0001`);
});

test('nodo calcular: hoja caída → tarifas de respaldo, mismo total y número provisional', async () => {
  const out = await ejecutarNodo('calcular', {
    input: { error: { message: 'Google no responde' } },
    nodos: { Validar: { ok: true, solicitud: solicitudMarta() } },
  });
  assert.equal(out.origenTarifas, 'respaldo');
  assert.equal(out.calculo.totalCents, 809490);
  assert.equal(out.numeroProvisional, true);
  assert.ok(out.numero.startsWith(`P-${anio}-T`));
});

test('nodo calcular: hoja legible pero con un precio roto → respaldo, pero numeración real', async () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO);
  vr[0].values[1][3] = 'ochocientos';
  const out = await ejecutarNodo('calcular', { input: { valueRanges: vr }, nodos: { Validar: { ok: true, solicitud: solicitudMarta() } } });
  assert.equal(out.origenTarifas, 'respaldo');
  assert.equal(out.numeroProvisional, false);
  assert.equal(out.calculo.totalCents, 809490);
});

test('nodo calcular: mismo solicitudId ya registrado → mismo número (idempotencia)', async () => {
  const vr = valueRangesDesde(TARIFAS_RESPALDO, [[`P-${anio}-0003`, 'test-0001']]);
  const out = await ejecutarNodo('calcular', { input: { valueRanges: vr }, nodos: { Validar: { ok: true, solicitud: solicitudMarta() } } });
  assert.equal(out.numero, `P-${anio}-0003`);
  assert.equal(out.numeroExistente, true);
});

test('nodo comprobar-ia: JSON en ```json``` desde Gemini → ok y modelo gemini', async () => {
  const out = await ejecutarNodo('comprobar-ia', {
    input: { text: '```json\n' + JSON.stringify(TEXTOS_MARTA) + '\n```' },
    prevNode: 'Redactar · Gemini',
  });
  assert.equal(out.ok, true);
  assert.equal(out.modelo, 'gemini');
  assert.deepEqual(out.textos, TEXTOS_MARTA);
});

test('nodo comprobar-ia: texto con un importe → rechazado', async () => {
  const malo = { ...TEXTOS_MARTA, cierre: 'Todo por solo 300 euros.' };
  const out = await ejecutarNodo('comprobar-ia', { input: { text: JSON.stringify(malo) }, prevNode: 'Redactar · Claude' });
  assert.equal(out.ok, false);
  assert.equal(out.modelo, 'claude');
  assert.equal(out.textos, null);
});

test('nodo comprobar-ia: el modelo falló (error) → ok:false', async () => {
  const out = await ejecutarNodo('comprobar-ia', { input: { error: { message: 'rate limit' } }, prevNode: 'Redactar · Claude' });
  assert.equal(out.ok, false);
});

async function calcularMarta() {
  return ejecutarNodo('calcular', {
    input: { valueRanges: valueRangesDesde(TARIFAS_RESPALDO) },
    nodos: { Validar: { ok: true, solicitud: solicitudMarta() } },
  });
}

test('nodo montar: con textos de la IA → respuesta completa, email y fila de la hoja', async () => {
  const calcular = await calcularMarta();
  const out = await ejecutarNodo('montar', {
    input: { ok: true, textos: TEXTOS_MARTA, modelo: 'claude' },
    nodos: { Calcular: calcular },
  });
  assert.equal(out.respuesta.ok, true);
  assert.equal(out.respuesta.presupuesto.total, 8094.9);
  assert.deepEqual(out.respuesta.presupuesto.textos, TEXTOS_MARTA);
  assert.equal(out.textoPlantilla, false);
  assert.equal(out.modelo, 'claude');
  assert.ok(out.htmlEmail.includes('8.094,90 €'));
  assert.ok(out.htmlPDF.startsWith('<!doctype html>'));
  assert.equal(out.asunto, `Tu presupuesto ${calcular.numero} · Reformas Barcelona`);
  assert.ok(out.resumenJordi.asunto.startsWith('Nueva solicitud · Baño'));
  assert.equal(out.filaSolicitud[0], calcular.numero);
  assert.equal(out.filaSolicitud[1], 'test-0001');
  assert.equal(out.filaSolicitud.length, 18);
});

test('nodo montar: si la IA falló → plantilla, y el aviso llega a Jordi', async () => {
  const calcular = await calcularMarta();
  const out = await ejecutarNodo('montar', { input: { ok: false, textos: null, modelo: 'gemini' }, nodos: { Calcular: calcular } });
  assert.equal(out.textoPlantilla, true);
  assert.equal(out.modelo, 'plantilla');
  assert.equal(out.respuesta.presupuesto.textos.saludo, 'Hola Marta:');
  assert.ok(out.resumenJordi.html.includes('plantilla'));
});

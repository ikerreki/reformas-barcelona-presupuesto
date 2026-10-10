// Prueba rápida contra el webhook real de producción.
// Uso: node tests/eval/smoke.mjs [webhookBase]
import { contieneImportes, validarTextosIA } from '../../engine/guardrail.js';
import { solicitudMarta } from '../fixtures.mjs';

const BASE = process.argv[2] || 'https://ikerrodriguez.app.n8n.cloud/webhook';
const id = () => `smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

async function enviar(cuerpo) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/presupuesto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { estado: r.status, json: await r.json().catch(() => null), ms: Date.now() - t0 };
}

const resultados = [];
const comprobar = (nombre, ok, detalle = '') => { resultados.push({ nombre, ok }); console.log(`${ok ? '✔' : '✖'} ${nombre}${detalle ? ' · ' + detalle : ''}`); };

const marta = solicitudMarta({ solicitudId: id() });
marta.cliente.email = 'ikerreki544+smoke@gmail.com';
const a = await enviar(marta);
const p = a.json && a.json.presupuesto;
comprobar('Marta → 200', a.estado === 200, `${a.ms} ms`);
comprobar('Marta → total 8094,9 / IVA 1404,9 / subtotal 6690', p && p.total === 8094.9 && p.iva === 1404.9 && p.subtotal === 6690);
comprobar('Marta → número P-AAAA-NNNN', p && /^P-\d{4}-\d{4}$/.test(p.numero), p && p.numero);
comprobar('Marta → textos válidos y sin importes', p && validarTextosIA(p.textos).ok && ![p.textos.resumen, ...p.textos.trabajos].some(contieneImportes));

const b = await enviar(marta); // mismo solicitudId
comprobar('Reintento con el mismo solicitudId → mismo número', b.json && b.json.presupuesto && b.json.presupuesto.numero === p.numero, b.json && b.json.presupuesto && b.json.presupuesto.numero);

const malo = solicitudMarta({ solicitudId: id() });
malo.estancias[0].m2 = 0;
const c = await enviar(malo);
comprobar('m² = 0 → 400 con el campo marcado', c.estado === 400 && c.json.error.campos.some((e) => e.campo === 'estancias[0].m2'));

const d = await enviar(solicitudMarta({ solicitudId: id(), website: 'http://spam.example' }));
comprobar('Honeypot → 200 con presupuesto null', d.estado === 200 && d.json.presupuesto === null);

const fallos = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - fallos}/${resultados.length} correctas`);
process.exit(fallos ? 1 : 0);

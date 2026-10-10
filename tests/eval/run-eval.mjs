// Set de evaluación contra el flujo real: números (comparados con el motor local), idioma del
// texto, cero importes en lo que redacta la IA y latencia. Escribe un informe en Markdown.
// Uso: node tests/eval/run-eval.mjs [webhookBase]
import { readFileSync, writeFileSync } from 'node:fs';
import { validarSolicitud, calcularPresupuesto } from '../../engine/pricing.js';
import { TARIFAS_RESPALDO } from '../../engine/tarifas.js';
import { contieneImportes, validarTextosIA } from '../../engine/guardrail.js';

const BASE = process.argv[2] || 'https://ikerrodriguez.app.n8n.cloud/webhook';
const casos = JSON.parse(readFileSync(new URL('./casos.json', import.meta.url), 'utf8'));
const marca = Date.now().toString(36);

// Idioma por palabras frecuentes y exclusivas de cada lengua.
const PISTAS = {
  es: [' y ', ' con ', ' tu ', ' para ', ' los ', ' las ', ' del '],
  ca: [' i ', ' amb ', ' per ', ' teu', ' teva', ' els ', ' les ', ' del '],
  en: [' the ', ' and ', ' your ', ' with ', ' of ', ' to '],
};
function idiomaDe(texto) {
  const t = ` ${texto.toLowerCase()} `;
  const puntos = Object.fromEntries(Object.entries(PISTAS).map(([k, ws]) => [k, ws.reduce((s, w) => s + t.split(w).length - 1, 0)]));
  return Object.entries(puntos).sort((a, b) => b[1] - a[1])[0][0];
}

const filas = [];
const latencias = [];
for (const [n, c] of casos.entries()) {
  const raw = {
    solicitudId: `eval-${marca}-${n}`,
    idioma: c.idioma,
    cliente: { nombre: 'Prueba Evaluación', email: c.email || `ikerreki544+eval${n}@gmail.com`, telefono: '', direccion: '' },
    estancias: c.estancias,
    extrasGenerales: c.extrasGenerales,
    descripcion: c.descripcion,
    privacidad: true,
    website: c.website || '',
  };
  const t0 = Date.now();
  const r = await fetch(`${BASE}/presupuesto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(raw) });
  const ms = Date.now() - t0;
  const json = await r.json().catch(() => null);
  const p = json && json.presupuesto;
  const e = c.esperado;
  const checks = [];
  const ok = (nombre, cond) => checks.push({ nombre, ok: Boolean(cond) });

  ok('estado HTTP', r.status === e.estado);
  if (e.campos) ok('campos con error', e.campos.every((campo) => json?.error?.campos?.some((x) => x.campo === campo)));
  if (e.presupuestoNulo) ok('presupuesto nulo', json && json.presupuesto === null);
  if (p) {
    latencias.push(ms);
    const local = calcularPresupuesto(validarSolicitud(raw).solicitud, TARIFAS_RESPALDO);
    // Math.round: en JS 81021.6 * 100 = 8102160.000000001 (por eso el motor trabaja en céntimos).
    const cents = (x) => Math.round(x * 100);
    ok('números = motor local', cents(p.total) === local.totalCents && cents(p.iva) === local.ivaCents && cents(p.subtotal) === local.subtotalCents);
    if (e.total) ok('total esperado', p.total === e.total && p.iva === e.iva && p.subtotal === e.subtotal);
    if (e.plazo) ok('plazo', p.plazo.minSemanas === e.plazo[0] && p.plazo.maxSemanas === e.plazo[1]);
    if (e.licenciaUnaVez) ok('licencia una vez', p.secciones.flatMap((s) => s.partidas).filter((x) => x.codigo === 'licencia').length === 1);
    const textos = [p.textos.saludo, p.textos.resumen, ...p.textos.trabajos, p.textos.cierre];
    ok('textos válidos (guardarraíl)', validarTextosIA(p.textos).ok);
    ok('sin importes en el texto', !textos.some(contieneImportes));
    ok('idioma correcto', idiomaDe(textos.join(' ')) === c.idioma);
  }
  const fallos = checks.filter((x) => !x.ok).map((x) => x.nombre);
  filas.push({ caso: c.nombre, ms, numero: p?.numero || '—', ok: fallos.length === 0, fallos, resumen: p?.textos?.resumen?.slice(0, 140) || '' });
  console.log(`${fallos.length ? '✖' : '✔'} ${c.nombre} · ${ms} ms${fallos.length ? ' · falla: ' + fallos.join(', ') : ''}`);
}

const orden = [...latencias].sort((a, b) => a - b);
const p50 = orden.length ? orden[Math.floor(orden.length / 2)] : 0;
const max = orden.length ? orden[orden.length - 1] : 0;
const aciertos = filas.filter((f) => f.ok).length;
const fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');
const md = `# Evaluación en producción · ${fecha}

Webhook: \`${BASE}/presupuesto\` · ${aciertos}/${filas.length} casos correctos · latencia p50 ${(p50 / 1000).toFixed(1)} s · máx. ${(max / 1000).toFixed(1)} s

| Caso | Resultado | Nº | Latencia | Fallos |
|---|---|---|---|---|
${filas.map((f) => `| ${f.caso} | ${f.ok ? '✔' : '✖'} | ${f.numero} | ${(f.ms / 1000).toFixed(1)} s | ${f.fallos.join(', ') || '—'} |`).join('\n')}

**Qué se comprueba en cada caso con presupuesto:** los importes coinciden con el motor local (céntimo a céntimo), el plazo es el esperado,
los textos superan el guardarraíl, no contienen importes y están en el idioma pedido.

## Extracto de los textos de la IA
${filas.filter((f) => f.resumen).map((f) => `- **${f.caso}:** ${f.resumen}…`).join('\n')}
`;
const salida = new URL(`./resultados-${new Date().toISOString().slice(0, 10)}.md`, import.meta.url);
writeFileSync(salida, md);
console.log(`\n${aciertos}/${filas.length} · p50 ${(p50 / 1000).toFixed(1)} s · máx ${(max / 1000).toFixed(1)} s → ${salida.pathname}`);
process.exit(aciertos === filas.length ? 0 : 1);

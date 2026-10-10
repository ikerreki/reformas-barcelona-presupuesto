// Lectura de las tarifas desde Google Sheets (pestañas que edita Jordi).
// Si algo falta o no se puede leer con seguridad, ok:false y el flujo usa las tarifas de respaldo.
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS } from './catalogo.js';
import { TARIFAS_RESPALDO } from './tarifas.js';

/**
 * Lee un número tal como lo escribiría una persona en España en una hoja de cálculo:
 * "1.200" → 1200, "1.200,50" → 1200.5, "12,5" → 12.5, "880 €" → 880. NaN si no es un número
 * o si el formato es inglés/ambiguo ("1,200", "1,200.50"): nunca adivinamos un precio.
 */
export function parseNumeroES(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v !== 'string') return NaN;
  let s = v.replace(/€/g, '').replace(/[\s ]/g, '');
  if (s === '') return NaN;
  const tienePunto = s.includes('.');
  const tieneComa = s.includes(',');
  if (tienePunto && tieneComa) {
    // Formato español: puntos de miles y coma decimal al final ("1.200,50"). "1,200.50" (inglés) no vale.
    s = /^-?\d{1,3}(\.\d{3})*,\d+$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : 'x';
  } else if (tieneComa) {
    // "1,200" es ambiguo (¿1,2 o 1200 en inglés?): mejor NaN que un precio equivocado.
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) || s.match(/,/g).length > 1 ? 'x' : s.replace(',', '.');
  }
  else if (tienePunto && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

// Convierte la respuesta de values:batchGet en { pestaña: [filas como objetos por cabecera] }.
function pestanasDesde(valueRanges) {
  const out = {};
  for (const vr of valueRanges) {
    if (!vr || typeof vr.range !== 'string' || !Array.isArray(vr.values)) continue;
    const nombre = vr.range.split('!')[0].replace(/^'|'$/g, '');
    const [cabecera = [], ...filas] = vr.values;
    out[nombre] = filas
      .filter((f) => Array.isArray(f) && f.some((c) => String(c ?? '').trim() !== ''))
      .map((f) => Object.fromEntries(cabecera.map((h, i) => [String(h).trim(), typeof f[i] === 'number' ? f[i] : String(f[i] ?? '').trim()])));
  }
  return out;
}

/**
 * Convierte las pestañas de Google Sheets al formato interno de tarifas y las valida.
 * Si algo falta o no se puede leer, devuelve ok:false y el flujo usa las tarifas de respaldo:
 * nunca se calcula con un precio dudoso.
 */
export function normalizarTarifas(valueRanges) {
  const errores = [];
  if (!Array.isArray(valueRanges)) return { ok: false, tarifas: null, errores: ['respuesta de Sheets no válida'] };
  const p = pestanasDesde(valueRanges);
  for (const nombre of ['Tarifas', 'Extras', 'Plazos', 'QueIncluye', 'Condiciones', 'Config']) {
    if (!p[nombre]) errores.push(`falta la pestaña ${nombre}`);
  }
  if (errores.length) return { ok: false, tarifas: null, errores };

  const positivo = (valor, donde) => {
    const n = parseNumeroES(valor);
    if (!(n > 0)) errores.push(`${donde}: "${valor}" no es un número válido`);
    return n;
  };
  // Un precio 5 veces mayor o menor que el de referencia casi seguro es un error al teclear
  // (o una hoja con otro formato numérico): se usa el respaldo y se avisa a Jordi.
  const precio = (valor, referencia, donde) => {
    const n = positivo(valor, donde);
    if (n > 0 && (n < referencia / 5 || n > referencia * 5)) errores.push(`${donde}: ${n} se aleja demasiado del precio de referencia (${referencia})`);
    return n;
  };
  const porClave = (filas, col, pestana) => {
    const out = {};
    for (const f of filas) {
      if (out[f[col]]) errores.push(`${pestana}: "${f[col]}" está repetido`);
      out[f[col]] = f;
    }
    return out;
  };

  const filasTarifas = porClave(p.Tarifas, 'estancia', 'Tarifas');
  const estancias = {};
  for (const e of ESTANCIAS) {
    const f = filasTarifas[e];
    if (!f) { errores.push(`Tarifas: falta ${e}`); continue; }
    estancias[e] = Object.fromEntries(CALIDADES.map((c) => [c, precio(f[c], TARIFAS_RESPALDO.estancias[e][c], `Tarifas ${e}/${c}`)]));
  }

  const filasExtras = porClave(p.Extras, 'codigo', 'Extras');
  const extras = {};
  for (const codigo of [...EXTRAS_ESTANCIA, ...EXTRAS_GENERALES]) {
    const f = filasExtras[codigo];
    if (!f) { errores.push(`Extras: falta ${codigo}`); continue; }
    const ambitoEsperado = EXTRAS_GENERALES.includes(codigo) ? 'general' : 'estancia';
    if (!['m2', 'fijo'].includes(f.tipo)) errores.push(`Extras ${codigo}: tipo "${f.tipo}" no válido`);
    if (f.ambito !== ambitoEsperado) errores.push(`Extras ${codigo}: ámbito debe ser ${ambitoEsperado}`);
    // Un extra general se cobra una vez por obra: solo tiene sentido como precio fijo.
    if (ambitoEsperado === 'general' && f.tipo !== 'fijo') errores.push(`Extras ${codigo}: un extra general debe ser fijo`);
    const descripcion = { es: f.descripcion_es, ca: f.descripcion_ca, en: f.descripcion_en };
    if (!descripcion.es || !descripcion.ca || !descripcion.en) errores.push(`Extras ${codigo}: falta descripción`);
    extras[codigo] = { tipo: f.tipo, precio: precio(f.precio, TARIFAS_RESPALDO.extras[codigo].precio, `Extras ${codigo}`), ambito: f.ambito, descripcion };
  }

  const filasPlazos = porClave(p.Plazos, 'estancia', 'Plazos');
  const plazos = {};
  for (const e of ESTANCIAS) {
    const f = filasPlazos[e];
    if (!f) { errores.push(`Plazos: falta ${e}`); continue; }
    const min = positivo(f.min_semanas, `Plazos ${e} mín`);
    const max = positivo(f.max_semanas, `Plazos ${e} máx`);
    if (max < min) errores.push(`Plazos ${e}: máx < mín`);
    if (!Number.isInteger(min) || !Number.isInteger(max)) errores.push(`Plazos ${e}: deben ser semanas enteras`);
    plazos[e] = { min, max };
  }

  const filasQue = porClave(p.QueIncluye, 'calidad', 'QueIncluye');
  const queIncluye = {};
  for (const c of CALIDADES) {
    const f = filasQue[c];
    if (!f || !f.es || !f.ca || !f.en) { errores.push(`QueIncluye: falta ${c}`); continue; }
    queIncluye[c] = { es: f.es, ca: f.ca, en: f.en };
  }

  const condiciones = p.Condiciones
    .slice()
    .sort((a, b) => parseNumeroES(a.orden) - parseNumeroES(b.orden))
    .map((f) => ({
      titulo: { es: f.titulo_es, ca: f.titulo_ca, en: f.titulo_en },
      detalle: { es: f.detalle_es, ca: f.detalle_ca, en: f.detalle_en },
    }));
  if (!condiciones.length) errores.push('Condiciones: vacía');
  if (condiciones.some((c) => IDIOMAS.some((i) => !c.titulo[i] || !c.detalle[i]))) errores.push('Condiciones: falta algún texto');

  const cfg = porClave(p.Config, 'clave', 'Config');
  const ivaPct = parseNumeroES(cfg.iva_pct && cfg.iva_pct.valor);
  // "0,21" (fracción en vez de porcentaje) o "0" darían un IVA erróneo sin que nadie lo notara.
  if (!(ivaPct >= 1 && ivaPct <= 50)) errores.push('Config: iva_pct debe ser un porcentaje entre 1 y 50 (p. ej. 21)');
  const validezDias = positivo(cfg.validez_dias && cfg.validez_dias.valor, 'Config validez_dias');

  if (errores.length) return { ok: false, tarifas: null, errores };
  return { ok: true, tarifas: { estancias, extras, plazos, queIncluye, condiciones, config: { ivaPct, validezDias } }, errores: [] };
}

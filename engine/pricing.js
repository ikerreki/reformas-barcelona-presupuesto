// Motor de cálculo de Reformas Barcelona.
// Funciones puras, sin dependencias: las usan los tests (Node), la web (navegador)
// y los nodos Code de n8n (inyectadas por n8n/build.mjs). Una sola fuente de verdad.
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES } from './catalogo.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Convierte los m² que escribe un cliente ("6", "6,5", 6.5) a número; NaN si no se puede.
function leerM2(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || v.trim() === '') return NaN;
  const limpio = v.trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : NaN;
}

const decimales = (n) => (String(n).split('.')[1] || '').length;

/**
 * Valida y normaliza la solicitud que llega de la web.
 * Nunca lanza excepciones: cualquier entrada devuelve { ok, esBot, solicitud, errores }.
 */
export function validarSolicitud(raw) {
  const errores = [];
  const err = (campo, codigo) => errores.push({ campo, codigo });

  if (!esObjeto(raw)) {
    return { ok: false, esBot: false, solicitud: null, errores: [{ campo: 'solicitud', codigo: 'formato' }] };
  }

  // Honeypot: un campo invisible para personas. Si llega relleno, es un bot.
  const esBot = texto(raw.website) !== '';

  const solicitudId = texto(raw.solicitudId);
  if (!solicitudId) err('solicitudId', 'requerido');
  else if (solicitudId.length < 8 || solicitudId.length > 64) err('solicitudId', 'longitud');

  const idioma = texto(raw.idioma);
  if (!IDIOMAS.includes(idioma)) err('idioma', 'desconocido');

  const c = esObjeto(raw.cliente) ? raw.cliente : {};
  const cliente = {
    nombre: texto(c.nombre),
    email: texto(c.email),
    telefono: texto(c.telefono),
    direccion: texto(c.direccion),
  };
  if (!cliente.nombre) err('cliente.nombre', 'requerido');
  else if (cliente.nombre.length < LIMITES.nombreMin || cliente.nombre.length > LIMITES.nombreMax) err('cliente.nombre', 'longitud');
  if (!cliente.email) err('cliente.email', 'requerido');
  else if (!EMAIL_RE.test(cliente.email)) err('cliente.email', 'formato');
  if (cliente.telefono.length > LIMITES.telefonoMax) err('cliente.telefono', 'longitud');
  if (cliente.direccion.length > LIMITES.direccionMax) err('cliente.direccion', 'longitud');

  const estanciasRaw = Array.isArray(raw.estancias) ? raw.estancias : [];
  if (estanciasRaw.length < 1 || estanciasRaw.length > LIMITES.maxEstancias) err('estancias', 'rango');

  const estancias = estanciasRaw.slice(0, LIMITES.maxEstancias).map((e, i) => {
    const p = `estancias[${i}]`;
    const est = esObjeto(e) ? e : {};
    const tipo = texto(est.tipo);
    const calidad = texto(est.calidad);
    if (!ESTANCIAS.includes(tipo)) err(`${p}.tipo`, 'desconocido');
    if (!CALIDADES.includes(calidad)) err(`${p}.calidad`, 'desconocido');

    const m2 = leerM2(est.m2);
    if (Number.isNaN(m2)) err(`${p}.m2`, 'formato');
    else if (m2 <= 0 || m2 > LIMITES.m2Max) err(`${p}.m2`, 'rango');
    else if (decimales(m2) > 2) err(`${p}.m2`, 'formato');

    const extrasRaw = Array.isArray(est.extras) ? est.extras.map(texto) : [];
    if (extrasRaw.some((x) => !EXTRAS_ESTANCIA.includes(x))) err(`${p}.extras`, 'desconocido');
    const extras = [...new Set(extrasRaw)].filter((x) => EXTRAS_ESTANCIA.includes(x));

    const notaFoto = texto(est.notaFoto) || null;
    return { tipo, m2, calidad, extras, notaFoto };
  });

  const generalesRaw = Array.isArray(raw.extrasGenerales) ? raw.extrasGenerales.map(texto) : [];
  if (generalesRaw.some((x) => !EXTRAS_GENERALES.includes(x))) err('extrasGenerales', 'desconocido');
  const extrasGenerales = [...new Set(generalesRaw)].filter((x) => EXTRAS_GENERALES.includes(x));

  const descripcion = texto(raw.descripcion);
  if (descripcion.length > LIMITES.descripcionMax) err('descripcion', 'longitud');

  if (raw.privacidad !== true) err('privacidad', 'privacidad');

  const ok = errores.length === 0 && !esBot;
  const solicitud = { solicitudId, idioma, cliente, estancias, extrasGenerales, descripcion, privacidad: raw.privacidad === true };
  return { ok, esBot, solicitud: ok ? solicitud : null, errores };
}

/**
 * Calcula el presupuesto. Todo en céntimos enteros para no arrastrar errores de coma
 * flotante (en JS, 0.1 + 0.2 = 0.30000000000000004).
 * - Estancia: m² × tarifa(tipo, calidad).
 * - Extra "por m²": m² de esa estancia × precio. Extra "fijo": su precio, una vez por estancia.
 * - Extras generales (licencia): una vez por solicitud, en una sección aparte.
 * - IVA: redondeado a céntimos, igual que ROUND(subtotal*0.21; 2) del Excel.
 * - Plazo: suma de los rangos de cada estancia (decisión D11 de la spec).
 */
export function calcularPresupuesto(solicitud, tarifas) {
  const cents = (euros) => Math.round(euros * 100);
  const partidaExtra = (codigo, m2) => {
    const x = tarifas.extras[codigo];
    const porM2 = x.tipo === 'm2';
    const cantidad = porM2 ? m2 : 1;
    const precioUnitarioCents = cents(x.precio);
    return { codigo, cantidad, unidad: porM2 ? 'm2' : 'ud', precioUnitarioCents, importeCents: Math.round(cantidad * precioUnitarioCents) };
  };

  const secciones = solicitud.estancias.map((e, i) => {
    const precioUnitarioCents = cents(tarifas.estancias[e.tipo][e.calidad]);
    const partidas = [
      { codigo: 'estancia', cantidad: e.m2, unidad: 'm2', precioUnitarioCents, importeCents: Math.round(e.m2 * precioUnitarioCents) },
      ...EXTRAS_ESTANCIA.filter((x) => e.extras.includes(x)).map((x) => partidaExtra(x, e.m2)),
    ];
    return { estanciaIndex: i, tipo: e.tipo, calidad: e.calidad, m2: e.m2, partidas };
  });

  const generales = EXTRAS_GENERALES.filter((x) => (solicitud.extrasGenerales || []).includes(x));
  if (generales.length) {
    secciones.push({ estanciaIndex: null, tipo: 'general', partidas: generales.map((x) => partidaExtra(x, 0)) });
  }

  const subtotalCents = secciones.reduce((s, sec) => s + sec.partidas.reduce((t, p) => t + p.importeCents, 0), 0);
  const ivaPct = tarifas.config.ivaPct;
  const ivaCents = Math.round((subtotalCents * ivaPct) / 100);
  const plazo = solicitud.estancias.reduce(
    (p, e) => ({ minSemanas: p.minSemanas + tarifas.plazos[e.tipo].min, maxSemanas: p.maxSemanas + tarifas.plazos[e.tipo].max }),
    { minSemanas: 0, maxSemanas: 0 },
  );

  return { secciones, subtotalCents, ivaPct, ivaCents, totalCents: subtotalCents + ivaCents, plazo };
}

/**
 * Lee un número tal como lo escribiría una persona en España en una hoja de cálculo:
 * "1.200" → 1200, "1.200,50" → 1200.5, "12,5" → 12.5, "880 €" → 880. NaN si no es un número.
 */
export function parseNumeroES(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  if (typeof v !== 'string') return NaN;
  let s = v.replace(/€/g, '').replace(/[\s ]/g, '');
  if (s === '') return NaN;
  const tienePunto = s.includes('.');
  const tieneComa = s.includes(',');
  if (tienePunto && tieneComa) s = s.replace(/\./g, '').replace(',', '.');
  else if (tieneComa) s = (s.match(/,/g).length === 1) ? s.replace(',', '.') : 'x';
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
      .map((f) => Object.fromEntries(cabecera.map((h, i) => [String(h).trim(), String(f[i] ?? '').trim()])));
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
  const porClave = (filas, col) => Object.fromEntries(filas.map((f) => [f[col], f]));

  const filasTarifas = porClave(p.Tarifas, 'estancia');
  const estancias = {};
  for (const e of ESTANCIAS) {
    const f = filasTarifas[e];
    if (!f) { errores.push(`Tarifas: falta ${e}`); continue; }
    estancias[e] = Object.fromEntries(CALIDADES.map((c) => [c, positivo(f[c], `Tarifas ${e}/${c}`)]));
  }

  const filasExtras = porClave(p.Extras, 'codigo');
  const extras = {};
  for (const codigo of [...EXTRAS_ESTANCIA, ...EXTRAS_GENERALES]) {
    const f = filasExtras[codigo];
    if (!f) { errores.push(`Extras: falta ${codigo}`); continue; }
    const ambitoEsperado = EXTRAS_GENERALES.includes(codigo) ? 'general' : 'estancia';
    if (!['m2', 'fijo'].includes(f.tipo)) errores.push(`Extras ${codigo}: tipo "${f.tipo}" no válido`);
    if (f.ambito !== ambitoEsperado) errores.push(`Extras ${codigo}: ámbito debe ser ${ambitoEsperado}`);
    const descripcion = { es: f.descripcion_es, ca: f.descripcion_ca, en: f.descripcion_en };
    if (!descripcion.es || !descripcion.ca || !descripcion.en) errores.push(`Extras ${codigo}: falta descripción`);
    extras[codigo] = { tipo: f.tipo, precio: positivo(f.precio, `Extras ${codigo}`), ambito: f.ambito, descripcion };
  }

  const filasPlazos = porClave(p.Plazos, 'estancia');
  const plazos = {};
  for (const e of ESTANCIAS) {
    const f = filasPlazos[e];
    if (!f) { errores.push(`Plazos: falta ${e}`); continue; }
    const min = positivo(f.min_semanas, `Plazos ${e} mín`);
    const max = positivo(f.max_semanas, `Plazos ${e} máx`);
    if (max < min) errores.push(`Plazos ${e}: máx < mín`);
    plazos[e] = { min, max };
  }

  const filasQue = porClave(p.QueIncluye, 'calidad');
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

  const cfg = porClave(p.Config, 'clave');
  const ivaPct = parseNumeroES(cfg.iva_pct && cfg.iva_pct.valor);
  if (!(ivaPct >= 0 && ivaPct < 100)) errores.push('Config: iva_pct no válido');
  const validezDias = positivo(cfg.validez_dias && cfg.validez_dias.valor, 'Config validez_dias');

  if (errores.length) return { ok: false, tarifas: null, errores };
  return { ok: true, tarifas: { estancias, extras, plazos, queIncluye, condiciones, config: { ivaPct, validezDias } }, errores: [] };
}

/**
 * Número de presupuesto correlativo por año (P-2026-0001, P-2026-0002…).
 * filasSolicitudes: columnas A:B de la pestaña Solicitudes (numero, solicitud_id), sin cabecera.
 * Si el solicitudId ya está registrado (doble clic, reintento), devuelve su número: idempotencia.
 */
export function siguienteNumero(filasSolicitudes, anio, solicitudId) {
  const filas = Array.isArray(filasSolicitudes) ? filasSolicitudes : [];
  const previa = filas.find((f) => Array.isArray(f) && f[1] && f[1] === solicitudId && /^P-\d{4}-\d{4,}$/.test(f[0]));
  if (previa) return { numero: previa[0], existente: true };
  const re = new RegExp(`^P-${anio}-(\\d{4,})$`);
  const max = filas.reduce((m, f) => {
    const g = Array.isArray(f) && re.exec(String(f[0] ?? ''));
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return { numero: `P-${anio}-${String(max + 1).padStart(4, '0')}`, existente: false };
}

// Motor de cálculo de Reformas Barcelona.
// Funciones puras, sin dependencias: las usan los tests (Node), la web (navegador)
// y los nodos Code de n8n (inyectadas por n8n/build.mjs). Una sola fuente de verdad.
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES } from './catalogo.js';


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const texto = (v) => (typeof v === 'string' ? v.trim() : '');
// Campos de una sola línea: sin saltos ni caracteres de control (evita colar instrucciones o cabeceras).
const linea = (v) => texto(v).replace(/[\s\p{Cc}]+/gu, ' ');
// Texto libre: se conservan los saltos de línea, pero no otros caracteres de control.
const textoLibre = (v) => texto(v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Convierte los m² que escribe un cliente ("6", "6,5", 6.5, "1.200") a número; NaN si no se puede.
function leerM2(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || v.trim() === '') return NaN;
  const s = v.trim();
  const limpio = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(',', '.');
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
    nombre: linea(c.nombre),
    email: linea(c.email),
    telefono: linea(c.telefono),
    direccion: linea(c.direccion),
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

    // La nota de la foto la escribe la IA de visión pero viaja por el navegador: se acota.
    const notaFoto = linea(est.notaFoto).slice(0, LIMITES.notaFotoMax) || null;
    return { tipo, m2, calidad, extras, notaFoto };
  });

  const generalesRaw = Array.isArray(raw.extrasGenerales) ? raw.extrasGenerales.map(texto) : [];
  if (generalesRaw.some((x) => !EXTRAS_GENERALES.includes(x))) err('extrasGenerales', 'desconocido');
  const extrasGenerales = [...new Set(generalesRaw)].filter((x) => EXTRAS_GENERALES.includes(x));

  const descripcion = textoLibre(raw.descripcion);
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
 * - Cada importe = ROUND(cantidad × precio; 2), como el Excel: los m² (máx. 2 decimales) se pasan
 *   a centésimas enteras antes de multiplicar, para que 5,27 × 12,50 dé 65,88 y no 65,87.
 * - IVA: redondeado a céntimos, igual que ROUND(subtotal*0.21; 2) del Excel.
 * - Plazo: suma de los rangos de cada estancia (decisión D11 de la spec).
 */
export function calcularPresupuesto(solicitud, tarifas) {
  const cents = (euros) => Math.round(euros * 100);
  const importe = (cantidad, precioCents) => Math.round((Math.round(cantidad * 100) * precioCents) / 100);
  const partidaExtra = (codigo, m2) => {
    const x = tarifas.extras[codigo];
    const porM2 = x.tipo === 'm2';
    const cantidad = porM2 ? m2 : 1;
    const precioUnitarioCents = cents(x.precio);
    return { codigo, cantidad, unidad: porM2 ? 'm2' : 'ud', precioUnitarioCents, importeCents: importe(cantidad, precioUnitarioCents) };
  };

  const secciones = solicitud.estancias.map((e, i) => {
    const precioUnitarioCents = cents(tarifas.estancias[e.tipo][e.calidad]);
    const partidas = [
      { codigo: 'estancia', cantidad: e.m2, unidad: 'm2', precioUnitarioCents, importeCents: importe(e.m2, precioUnitarioCents) },
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

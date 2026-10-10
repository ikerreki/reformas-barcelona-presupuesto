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

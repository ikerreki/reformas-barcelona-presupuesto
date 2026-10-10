// Módulo de visión: valida lo que devuelve la IA al analizar una foto y estima el precio
// con el MISMO motor de cálculo (la IA clasifica y sugiere; los euros salen de las tarifas).
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, IDIOMAS } from './catalogo.js';
import { calcularPresupuesto } from './pricing.js';
import { contieneImportes } from './guardrail.js';

const ESTADOS = ['bueno', 'regular', 'a_reformar'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64 = 2_800_000; // ≈ 2 MB de imagen (la web la reduce antes a ~1024 px)

/** Valida lo que manda la web al flujo «Analizar foto»: idioma, estancia y una imagen razonable. */
export function validarEntradaFoto(raw) {
  const no = (motivo) => ({ ok: false, motivo });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return no('formato');
  if (!IDIOMAS.includes(raw.idioma)) return no('idioma');
  const e = raw.estancia || {};
  // Si el cliente sube la foto antes de elegir la estancia, se analiza igual: la IA la reconoce.
  const tipo = e.tipo === undefined || e.tipo === null || e.tipo === '' ? null : e.tipo;
  if (tipo !== null && !ESTANCIAS.includes(tipo)) return no('estancia');
  const calidad = CALIDADES.includes(e.calidad) ? e.calidad : 'media';
  const img = raw.imagen || {};
  if (!MIMES.includes(img.mime)) return no('tipo de imagen');
  const base64 = String(img.base64 || '').replace(/^data:[^,]*,/, '');
  if (!base64 || base64.length > MAX_BASE64 || !/^[A-Za-z0-9+/]+=*$/.test(base64)) return no('imagen');
  const extras = Array.isArray(e.extras) ? e.extras.filter((x) => EXTRAS_ESTANCIA.includes(x)) : [];
  return { ok: true, idioma: raw.idioma, estancia: { tipo, m2: e.m2, calidad, extras }, imagen: { mime: img.mime, base64 } };
}
const enLista = (v, lista) => (lista.includes(v) ? v : null);
const textoCorto = (v, max) => (typeof v === 'string' ? v.replace(/[\s\p{Cc}]+/gu, ' ').trim().slice(0, max) : '');

/** Normaliza el JSON de la IA de visión: nada fuera del catálogo, textos acotados y sin importes. */
export function validarAnalisisFoto(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, analisis: null };
  const esEstancia = raw.esEstancia === true;
  const vistos = new Set();
  const extrasSugeridos = !esEstancia ? [] : (Array.isArray(raw.extrasSugeridos) ? raw.extrasSugeridos : [])
    .filter((x) => x && EXTRAS_ESTANCIA.includes(x.extra) && !vistos.has(x.extra) && vistos.add(x.extra))
    .map((x) => {
      const motivo = textoCorto(x.motivo, 200);
      return { extra: x.extra, motivo: contieneImportes(motivo) ? '' : motivo };
    });
  const confianza = Number(raw.confianza);
  const nota = textoCorto(raw.notaTecnica, 300);
  return {
    ok: true,
    analisis: {
      esEstancia,
      estanciaDetectada: esEstancia ? enLista(raw.estanciaDetectada, ESTANCIAS) : null,
      estado: enLista(raw.estado, ESTADOS),
      elementos: (Array.isArray(raw.elementos) ? raw.elementos : []).map((e) => textoCorto(e, 60)).filter(Boolean).slice(0, 6),
      calidadAparente: enLista(raw.calidadAparente, CALIDADES),
      extrasSugeridos,
      confianza: Number.isFinite(confianza) ? Math.min(1, Math.max(0, confianza)) : 0,
      notaTecnica: nota && !contieneImportes(nota) ? nota : null,
    },
  };
}

const CONFIANZA_MIN = 0.6;

/**
 * Estancia que la web marca sola tras analizar la foto: solo si el cliente aún no había elegido ninguna
 * y la IA la reconoce con confianza. Nunca cambia lo que eligió el cliente.
 */
export function tipoSugerido(tipoActual, analisis) {
  if (tipoActual || !analisis || !analisis.esEstancia || !(analisis.confianza >= CONFIANZA_MIN)) return null;
  return ESTANCIAS.includes(analisis.estanciaDetectada) ? analisis.estanciaDetectada : null;
}

/** Precio orientativo (con IVA) de la estancia del cliente + los extras sugeridos por la foto. */
export function estimarConFoto({ estancia, analisis, tarifas }) {
  const sugeridos = (analisis && analisis.extrasSugeridos || []).map((x) => x.extra);
  const extras = EXTRAS_ESTANCIA.filter((x) => (estancia.extras || []).includes(x) || sugeridos.includes(x));
  const tipo = estancia.tipo || tipoSugerido('', analisis);
  const m2 = Number(String(estancia.m2).replace(',', '.'));
  const valida = ESTANCIAS.includes(tipo) && CALIDADES.includes(estancia.calidad) && m2 > 0;
  if (!valida) return { extras, total: null, plazo: null };
  const c = calcularPresupuesto({ estancias: [{ tipo, m2, calidad: estancia.calidad, extras }], extrasGenerales: [] }, tarifas);
  return { extras, total: c.totalCents / 100, plazo: c.plazo };
}

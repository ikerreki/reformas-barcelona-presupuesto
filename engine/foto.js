// Módulo de visión: valida lo que devuelve la IA al analizar una foto y estima el precio
// con el MISMO motor de cálculo (la IA clasifica y sugiere; los euros salen de las tarifas).
import { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA } from './catalogo.js';
import { calcularPresupuesto } from './pricing.js';
import { contieneImportes } from './guardrail.js';

const ESTADOS = ['bueno', 'regular', 'a_reformar'];
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

/** Precio orientativo (con IVA) de la estancia del cliente + los extras sugeridos por la foto. */
export function estimarConFoto({ estancia, analisis, tarifas }) {
  const sugeridos = (analisis && analisis.extrasSugeridos || []).map((x) => x.extra);
  const extras = EXTRAS_ESTANCIA.filter((x) => (estancia.extras || []).includes(x) || sugeridos.includes(x));
  const m2 = Number(String(estancia.m2).replace(',', '.'));
  const valida = ESTANCIAS.includes(estancia.tipo) && CALIDADES.includes(estancia.calidad) && m2 > 0;
  if (!valida) return { extras, total: null, plazo: null };
  const c = calcularPresupuesto({ estancias: [{ tipo: estancia.tipo, m2, calidad: estancia.calidad, extras }], extrasGenerales: [] }, tarifas);
  return { extras, total: c.totalCents / 100, plazo: c.plazo };
}

// Guardarraíl: comprobamos lo que devuelve la IA antes de usarlo.
// La regla del caso es "la IA redacta, pero no inventa ni cambia precios": no nos fiamos, lo verificamos.

/** Saca el objeto JSON de la respuesta de la IA aunque venga en ```json … ``` o con texto alrededor. */
export function extraerJSON(texto) {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  const intentos = [texto.trim()];
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (bloque) intentos.push(bloque[1].trim());
  const ini = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (ini !== -1 && fin > ini) intentos.push(texto.slice(ini, fin + 1));
  for (const t of intentos) {
    try {
      const obj = JSON.parse(t);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    } catch { /* probar el siguiente */ }
  }
  return null;
}

const MONEDA = /€|\beur\b|\beuros?\b/i;
// Palabras que, cerca de un número, indican que es dinero (ES / CA / EN).
const PALABRAS_DINERO = /^(precios?|costes?|importes?|cuestan?|total(es)?|presupuestos?|sale|preus?|costa|imports?|pressupostos?|costs?|prices?|budgets?|amount)$/i;
// Unidades que convierten un número en una medida o cantidad inofensiva.
const UNIDAD_TRAS = /^\s*(m²|m2|m\b|cm\b|mm\b|metros?|años|anys|years?|semanas|setmanes|weeks?|días|dies|days?|%|x\b|×)/i;
// Formato típico de importe: 1.404,90 / 8094,90 (coma y exactamente 2 decimales).
const FORMATO_DINERO = /\d,\d{2}(?!\d)/;

/** ¿El texto contiene algo que parezca un importe? */
export function contieneImportes(texto) {
  if (typeof texto !== 'string') return false;
  if (MONEDA.test(texto)) return true;
  if (FORMATO_DINERO.test(texto.replace(/\d,\d{2}(?=\s*(m²|m2)\b)/gi, ''))) return true;

  const palabras = texto.split(/\s+/);
  const limpia = (p) => p.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');
  for (let i = 0; i < palabras.length; i++) {
    const p = limpia(palabras[i]);
    if (!/^\d[\d.,]*$/.test(p)) continue;
    const valor = Number(p.replace(/\./g, '').replace(',', '.'));
    if (!(valor >= 100)) continue;
    const resto = palabras.slice(i + 1).join(' ');
    if (UNIDAD_TRAS.test(resto)) continue;
    const ventana = palabras.slice(Math.max(0, i - 4), i + 5).map(limpia);
    if (ventana.some((w) => PALABRAS_DINERO.test(w))) return true;
  }
  return false;
}

const esTexto = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

/** Valida la estructura y el contenido de los textos redactados por la IA. */
export function validarTextosIA(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, motivo: 'respuesta vacía o no es un objeto' };
  if (!esTexto(obj.saludo, 1, 200)) return { ok: false, motivo: 'saludo ausente o con longitud no válida' };
  if (!esTexto(obj.resumen, 100, 1200)) return { ok: false, motivo: 'resumen ausente o con longitud no válida' };
  if (!Array.isArray(obj.trabajos) || obj.trabajos.length < 3 || obj.trabajos.length > 10) {
    return { ok: false, motivo: 'trabajos debe tener entre 3 y 10 puntos' };
  }
  if (!obj.trabajos.every((t) => esTexto(t, 1, 400))) return { ok: false, motivo: 'algún trabajo vacío o demasiado largo' };
  if (!esTexto(obj.cierre, 1, 400)) return { ok: false, motivo: 'cierre ausente o con longitud no válida' };
  const todos = [obj.saludo, obj.resumen, ...obj.trabajos, obj.cierre];
  if (todos.some(contieneImportes)) return { ok: false, motivo: 'el texto contiene un importe' };
  return { ok: true, motivo: null };
}

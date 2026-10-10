// Guardarraíl: comprobamos lo que devuelve la IA antes de usarlo.
// La regla del caso es "la IA redacta, pero no inventa ni cambia precios": no nos fiamos, lo verificamos.
import { EMPRESA } from './catalogo.js';

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

const MONEDA = /€|\$|£|\beur\b|\beuros?\b/iu;
// Unidades que convierten un número en una medida, una duración o una cantidad inofensiva.
// (?![\p{L}\d]) en vez de \b: "m²" termina en un carácter no ASCII y "más" NO es la unidad "m".
const UNIDAD = String.raw`(?:m²|m2|m|cm|mm|metros?|metres?|meters?|años|anys|years?|semanas|setmanes|weeks?|días|dies|days?|meses|mesos|months?|%)(?![\p{L}\d])`;
const NUMERO_CON_UNIDAD = new RegExp(String.raw`\d[\d.,]*\s*` + UNIDAD, 'giu');
const MEDIDA_POR = /\d[\d.,]*\s*[×x]\s*\d[\d.,]*/giu;            // 140 × 80, 1,40 x 0,80
// Formato típico de importe: 1.404,90 / 8094,90 / 8,094.90 (dos decimales exactos).
const FORMATO_DINERO = /\d[.,]\d{2}(?!\d)/u;
// Palabras que, cerca de un número, indican dinero (ES / CA / EN). Familias por raíz.
const RAICES_DINERO = ['cost', 'cuest', 'sald', 'pag', 'preci', 'preu', 'price', 'import', 'presupuest', 'pressupost',
  'tarif', 'cobr', 'inversi', 'invest', 'charg'];
const PALABRAS_DINERO = new Set(['total', 'totales', 'subtotal', 'iva', 'vat', 'quote', 'budget', 'amount', 'sale', 'surt',
  'sortirà', 'pay', 'paid', 'payment', 'fee', 'fees']);
const NO_DINERO = new Set(['importante', 'importantes', 'important', 'importància', 'importancia', 'página', 'pàgina']);

function esPalabraDinero(w) {
  const p = w.toLowerCase();
  if (!p || NO_DINERO.has(p)) return false;
  return PALABRAS_DINERO.has(p) || RAICES_DINERO.some((r) => p.startsWith(r));
}

/** ¿El texto contiene algo que parezca un importe? */
export function contieneImportes(texto) {
  if (typeof texto !== 'string') return false;
  if (MONEDA.test(texto)) return true;
  // Quitamos medidas y duraciones ("6,75 m²", "140 × 80", "30 años") antes de buscar dinero.
  const limpio = texto.replace(MEDIDA_POR, ' ').replace(NUMERO_CON_UNIDAD, ' ');
  if (FORMATO_DINERO.test(limpio)) return true;

  const palabras = limpio.split(/[\s:;()[\]/]+/).map((p) => p.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ''));
  for (let i = 0; i < palabras.length; i++) {
    if (!/^\d[\d.,]*$/.test(palabras[i])) continue;
    // Magnitud por número de dígitos sin separadores: "6,690" (inglés) y "6.690" (español) cuentan igual.
    if (Number(palabras[i].replace(/\D/g, '')) < 100) continue;
    const ventana = palabras.slice(Math.max(0, i - 4), i + 5);
    if (ventana.some(esPalabraDinero)) return true;
  }
  return false;
}

// Contenido que nunca debe aparecer en un texto redactado por la IA: un atacante podría usar
// el formulario para que la empresa enviase un email con un enlace o una promesa falsa a un tercero.
const ENLACE_O_EMAIL = /https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+|\b[\w-]+\.(?:com|es|cat|net|org|io|info|biz|link|xyz)\b/iu;
const TELEFONO = /(?:\+?\d[\s.-]?){9,}/u;
const PROMESAS = /(?<![\p{L}])(?:regal\p{L}*|descuentos?|descomptes?|discounts?|gratis|sin coste|sin cargo|sense cost|free of charge|for free|at no cost|no cost|rebaja\p{L}*|oferta especial)(?![\p{L}])/iu;

// Palabras que delatan cada extra (es, ca, en). Si el texto nombra un extra que el cliente NO ha elegido,
// promete un trabajo que el presupuesto no cobra. La pintura no se vigila: «pintura plástica» forma parte
// de lo que incluye la calidad básica.
const SENALES_EXTRA = {
  demolicion: /demoli|derrib|enderroc|escombro|\bruna\b|rubble/iu,
  fontaneria: /fontaner|tuber[ií]a|desag[uü]e|lampister|canonad|desgu[aà]s|plumbing|\bpipes?\b|\bdrains?\b/iu,
  electricidad: /instalaci[oó]n el[eé]ctrica|instal·laci[oó] el[eè]ctrica|cablead|cablejat|cuadro el[eé]ctrico|quadre el[eè]ctric|bolet[ií]n|butllet[ií]|wiring|fuse ?box|electrical installation/iu,
  suelo_radiante: /suelo radiante|terra radiant|underfloor/iu,
  aire: /aire acondicionado|aire condicionat|air[- ]?condition|\bsplit\b|bomba de calor|heat pump/iu,
  licencia: /licencia|ll?ic[eè]ncia|permiso de obra|perm[ií]s d'obra|building permit/iu,
};

const esTexto = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

/**
 * Valida la estructura y el contenido de los textos redactados por la IA.
 * extrasElegidos (opcional): si se indica, el texto no puede nombrar ningún otro extra.
 */
export function validarTextosIA(obj, { extrasElegidos } = {}) {
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
  const sinTelefonoEmpresa = todos.map((t) => t.split(EMPRESA.telefono).join(' '));
  if (sinTelefonoEmpresa.some((t) => ENLACE_O_EMAIL.test(t) || TELEFONO.test(t))) {
    return { ok: false, motivo: 'el texto contiene un enlace, un email o un teléfono' };
  }
  if (todos.some((t) => PROMESAS.test(t))) return { ok: false, motivo: 'el texto promete algo gratis o un descuento' };
  if (Array.isArray(extrasElegidos)) {
    const noElegido = Object.keys(SENALES_EXTRA).find((x) => !extrasElegidos.includes(x) && todos.some((t) => SENALES_EXTRA[x].test(t)));
    if (noElegido) return { ok: false, motivo: `el texto menciona un extra que el cliente no ha elegido (${noElegido})` };
  }
  return { ok: true, motivo: null };
}

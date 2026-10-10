// ===== Paso «comprobar-ia»: lo que hace este nodo =====
async function paso() {
// Nodo «Comprobar Claude» / «Comprobar Gemini» (mismo código): el guardarraíl.
// Extrae el JSON de la respuesta de la IA y verifica estructura y que NO haya importes.
const salida = $input.first().json || {};
const modelo = /gemini/i.test($prevNode.name) ? 'gemini' : 'claude';
const bruto = typeof salida.text === 'string' ? salida.text
  : typeof salida.output === 'string' ? salida.output
  : '';
const textos = extraerJSON(bruto);
const v = validarTextosIA(textos);
return [{
  json: {
    ok: v.ok,
    textos: v.ok ? textos : null,
    motivo: salida.error ? 'el modelo devolvió un error' : v.motivo,
    modelo,
  },
}];

}

// ===== Motor de Reformas Barcelona (generado por n8n/build.mjs desde engine/; no editar aquí) =====
const __catalogo = (() => {



const ESTANCIAS = ['bano', 'cocina', 'salon', 'dormitorio', 'vivienda'];
const CALIDADES = ['basica', 'media', 'alta'];

const EXTRAS_ESTANCIA = ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire'];

const EXTRAS_GENERALES = ['licencia'];
const IDIOMAS = ['es', 'ca', 'en'];

const LIMITES = {
  maxEstancias: 6,
  m2Max: 500,
  nombreMin: 2,
  nombreMax: 100,
  telefonoMax: 30,
  direccionMax: 200,
  descripcionMax: 1000,
  notaFotoMax: 300,
};

const EMPRESA = {
  nombre: 'Reformas Barcelona',
  razonSocial: 'Reformas Barcelona, S.L. (empresa ficticia)',
  nif: 'B00000000 (ficticio)',
  direccion: 'Carrer de la Reforma, 12, 08005 Barcelona',
  telefono: '930 000 000',
  email: 'presupuestos@reformasbarcelona.example',
  web: 'www.reformasbarcelona.example',
  gerente: 'Jordi Ferrer',
  desde: 1998,
  plantilla: 25,
};

return { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES, EMPRESA };
})();
const __guardrail = (() => {


const { EMPRESA } = __catalogo;
function extraerJSON(texto) {
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


const UNIDAD = String.raw`(?:m²|m2|m|cm|mm|metros?|metres?|meters?|años|anys|years?|semanas|setmanes|weeks?|días|dies|days?|meses|mesos|months?|%)(?![\p{L}\d])`;
const NUMERO_CON_UNIDAD = new RegExp(String.raw`\d[\d.,]*\s*` + UNIDAD, 'giu');
const MEDIDA_POR = /\d[\d.,]*\s*[×x]\s*\d[\d.,]*/giu;            // 140 × 80, 1,40 x 0,80

const FORMATO_DINERO = /\d[.,]\d{2}(?!\d)/u;

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


function contieneImportes(texto) {
  if (typeof texto !== 'string') return false;
  if (MONEDA.test(texto)) return true;

  const limpio = texto.replace(MEDIDA_POR, ' ').replace(NUMERO_CON_UNIDAD, ' ');
  if (FORMATO_DINERO.test(limpio)) return true;

  const palabras = limpio.split(/[\s:;()[\]/]+/).map((p) => p.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ''));
  for (let i = 0; i < palabras.length; i++) {
    if (!/^\d[\d.,]*$/.test(palabras[i])) continue;

    if (Number(palabras[i].replace(/\D/g, '')) < 100) continue;
    const ventana = palabras.slice(Math.max(0, i - 4), i + 5);
    if (ventana.some(esPalabraDinero)) return true;
  }
  return false;
}


const ENLACE_O_EMAIL = /https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+|\b[\w-]+\.(?:com|es|cat|net|org|io|info|biz|link|xyz)\b/iu;
const TELEFONO = /(?:\+?\d[\s.-]?){9,}/u;
const PROMESAS = /(?<![\p{L}])(?:regal\p{L}*|descuentos?|descomptes?|discounts?|gratis|sin coste|sin cargo|sense cost|free of charge|for free|at no cost|no cost|rebaja\p{L}*|oferta especial)(?![\p{L}])/iu;

const esTexto = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;


function validarTextosIA(obj) {
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
  return { ok: true, motivo: null };
}

return { extraerJSON, contieneImportes, validarTextosIA };
})();
const { ESTANCIAS, CALIDADES, EXTRAS_ESTANCIA, EXTRAS_GENERALES, IDIOMAS, LIMITES, EMPRESA } = __catalogo;
const { extraerJSON, contieneImportes, validarTextosIA } = __guardrail;
const CONFIG = {"logoUrl":"","emailJordi":"ikerreki544@gmail.com","spreadsheetUrl":"https://docs.google.com/spreadsheets/d/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/edit"};
return paso();
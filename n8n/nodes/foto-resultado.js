// Nodo «Resultado»: valida lo que ha visto Gemini (nada fuera del catálogo) y calcula el precio
// orientativo con el motor y las tarifas de la hoja (o las de respaldo). La IA nunca pone euros.
const entrada = $('Validar foto').first().json;
let gemini = $('Analizar con Gemini').first().json;
if (Array.isArray(gemini)) gemini = gemini[0] || {};

// La respuesta de Gemini puede venir simplificada o completa: buscamos el texto.
const texto = typeof gemini.text === 'string' ? gemini.text
  : gemini.content && Array.isArray(gemini.content.parts) ? gemini.content.parts.map((p) => p.text || '').join('')
  : gemini.candidates ? ((gemini.candidates[0] || {}).content || { parts: [] }).parts.map((p) => p.text || '').join('')
  : '';
const bruto = gemini.error ? null : (typeof gemini.esEstancia === 'boolean' ? gemini : extraerJSON(texto));
const v = validarAnalisisFoto(bruto);
if (!v.ok) return [{ json: { ok: false, error: { codigo: 'FOTO_NO_DISPONIBLE' } } }];

const hoja = $input.first().json || {};
const lectura = Array.isArray(hoja.valueRanges) ? normalizarTarifas(hoja.valueRanges) : { ok: false };
const tarifas = lectura.ok ? lectura.tarifas : TARIFAS_RESPALDO;
const estimacion = estimarConFoto({ estancia: entrada.estancia, analisis: v.analisis, tarifas });

return [{ json: { ok: true, analisis: v.analisis, estimacion } }];

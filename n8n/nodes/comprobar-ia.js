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

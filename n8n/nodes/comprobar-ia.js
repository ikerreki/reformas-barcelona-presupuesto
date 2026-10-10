// Nodo «Comprobar Claude» / «Comprobar Gemini» (mismo código): el guardarraíl.
// Extrae el JSON de la respuesta de la IA y verifica estructura, que NO haya importes y que no prometa extras no elegidos.
const salida = $input.first().json || {};
const modelo = /gemini/i.test($prevNode.name) ? 'gemini' : 'claude';
const bruto = typeof salida.text === 'string' ? salida.text
  : typeof salida.output === 'string' ? salida.output
  : '';
const textos = extraerJSON(bruto);
// La IA no puede nombrar extras que el cliente no ha elegido: serían trabajos prometidos que no se cobran.
const solicitud = ($('Calcular').first().json || {}).solicitud;
const extrasElegidos = solicitud
  ? [...new Set([...solicitud.estancias.flatMap((e) => e.extras), ...(solicitud.extrasGenerales || [])])]
  : undefined;
const v = validarTextosIA(textos, { extrasElegidos });
return [{
  json: {
    ok: v.ok,
    textos: v.ok ? textos : null,
    motivo: salida.error ? 'el modelo devolvió un error' : v.motivo,
    modelo,
  },
}];

// Nodo «Validar foto»: comprueba la imagen y la estancia, convierte el base64 en un archivo
// binario (lo que espera el nodo de Gemini) y prepara el prompt de análisis (sin precios).
const entrada = $input.first().json;
const v = validarEntradaFoto(entrada.body !== undefined ? entrada.body : entrada);
if (!v.ok) return [{ json: { ok: false, motivo: v.motivo } }];

const extension = v.imagen.mime.split('/')[1].replace('jpeg', 'jpg');
return [{
  json: { ok: true, idioma: v.idioma, estancia: v.estancia, prompt: construirPromptFoto({ estancia: v.estancia, idioma: v.idioma }) },
  binary: { data: { data: v.imagen.base64, mimeType: v.imagen.mime, fileName: `estancia.${extension}` } },
}];

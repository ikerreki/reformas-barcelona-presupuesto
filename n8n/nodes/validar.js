// Nodo «Validar»: comprueba lo que llega de la web. Nunca confiamos en el navegador,
// aunque la web ya haya validado: cualquiera puede llamar al webhook directamente.
const entrada = $input.first().json;
const resultado = validarSolicitud(entrada.body !== undefined ? entrada.body : entrada);
return [{ json: resultado }];

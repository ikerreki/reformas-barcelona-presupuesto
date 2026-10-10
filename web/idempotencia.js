// Idempotencia desde la web: el solicitudId identifica UNA solicitud con UNOS datos concretos.
// - Reintento con los mismos datos (error, corte de red): mismo id → n8n no crea un presupuesto duplicado.
// - El cliente cambia algo antes de reintentar: es otra solicitud → id nuevo.

/**
 * @param {{id: string, huella: string|null}} actual  id de la solicitud y huella de lo último enviado con él
 * @param {object} datos  lo que se va a enviar (sin el solicitudId)
 * @returns {{id: string, huella: string}}
 */
export function idParaEnvio(actual, datos, crearId) {
  const huella = JSON.stringify(datos);
  if (actual.huella === null || actual.huella === huella) return { id: actual.id, huella };
  return { id: crearId(), huella };
}

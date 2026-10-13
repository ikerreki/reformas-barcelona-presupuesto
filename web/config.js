// Configuración pública de la web (nada secreto: las claves viven en n8n).
export const CONFIG = {
  webhookBase: 'https://ikerrodriguez.app.n8n.cloud/webhook',
  timeoutMs: 60000,
  // El análisis de foto depende de la velocidad de Gemini: se le da más margen.
  timeoutFotoMs: 90000,
};

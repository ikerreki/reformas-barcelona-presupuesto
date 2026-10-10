// Llamada al flujo de n8n. Traduce cualquier resultado a uno de cuatro casos que la web sabe mostrar.
import { CONFIG } from './config.js';

/** @returns {Promise<{tipo:'ok', presupuesto} | {tipo:'validacion', errores} | {tipo:'error', motivo:'red'|'timeout'|'interno'}>} */
export async function enviarPresupuesto(raw) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), CONFIG.timeoutMs);
  try {
    const r = await fetch(`${CONFIG.webhookBase}/presupuesto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw),
      signal: control.signal,
    });
    const json = await r.json().catch(() => null);
    if (r.status === 400 && json && json.error) return { tipo: 'validacion', errores: json.error.campos || [] };
    if (!r.ok || !json || !json.ok) return { tipo: 'error', motivo: 'interno' };
    return { tipo: 'ok', presupuesto: json.presupuesto };
  } catch (e) {
    return { tipo: 'error', motivo: e.name === 'AbortError' ? 'timeout' : 'red' };
  } finally {
    clearTimeout(reloj);
  }
}

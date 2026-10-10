// Numeración de presupuestos P-AAAA-NNNN a partir de la pestaña Solicitudes.

/**
 * Número de presupuesto correlativo por año (P-2026-0001, P-2026-0002…).
 * filasSolicitudes: columnas A:B de la pestaña Solicitudes (numero, solicitud_id), sin cabecera.
 * Si el solicitudId ya está registrado (doble clic, reintento), devuelve su número: idempotencia.
 */
export function siguienteNumero(filasSolicitudes, anio, solicitudId) {
  const filas = Array.isArray(filasSolicitudes) ? filasSolicitudes : [];
  const i = filas.findIndex((f) => Array.isArray(f) && f[1] && f[1] === solicitudId);
  if (i !== -1) {
    // Ya registrada. Si la fila está reservada pero aún sin número (otra ejecución en curso),
    // su número es el de su posición, igual que numeroDesdeFila (fila de la hoja = i + 2).
    const n = String(filas[i][0] ?? '');
    return { numero: /^P-\d{4}-\d{4,}$/.test(n) ? n : `P-${anio}-${String(i + 1).padStart(4, '0')}`, existente: true };
  }
  const re = new RegExp(`^P-${anio}-(\\d{4,})$`);
  const max = filas.reduce((m, f) => {
    const g = Array.isArray(f) && re.exec(String(f[0] ?? ''));
    return g ? Math.max(m, Number(g[1])) : m;
  }, 0);
  return { numero: `P-${anio}-${String(max + 1).padStart(4, '0')}`, existente: false };
}

/**
 * Número de presupuesto a partir de la fila reservada en la pestaña Solicitudes.
 * El "append" de Google Sheets es atómico: dos solicitudes simultáneas reciben filas distintas,
 * así que nunca comparten número. updatedRange: "Solicitudes!A5:R5" → fila 5 → P-AAAA-0004.
 */
export function numeroDesdeFila(updatedRange, anio) {
  const m = /!\$?[A-Z]+\$?(\d+)/.exec(String(updatedRange ?? ''));
  if (!m || Number(m[1]) < 2) return null;
  return `P-${anio}-${String(Number(m[1]) - 1).padStart(4, '0')}`;
}

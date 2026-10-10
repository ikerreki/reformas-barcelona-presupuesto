// Numeración de presupuestos P-AAAA-NNNN a partir de la pestaña Solicitudes.

// Columnas de la pestaña Solicitudes que se consultan (A=0 … R=17).
const COL = { numero: 0, id: 1, fecha: 2, email: 4, estado: 17 };

/**
 * Número de presupuesto correlativo por año (P-2026-0001, P-2026-0002…).
 * filasSolicitudes: columnas A:R de la pestaña Solicitudes, sin cabecera.
 * Si el solicitudId ya está registrado (doble clic, reintento), devuelve su número: idempotencia.
 * pendiente = la fila se reservó pero la ejecución no llegó a completarla (hay que terminarla);
 * fila = su número de fila en la hoja, para completarla en su sitio.
 */
export function siguienteNumero(filasSolicitudes, anio, solicitudId) {
  const filas = Array.isArray(filasSolicitudes) ? filasSolicitudes : [];
  const i = filas.findIndex((f) => Array.isArray(f) && f[COL.id] && f[COL.id] === solicitudId);
  if (i !== -1) {
    // Ya registrada. Si la fila está reservada pero aún sin número, su número es el de su
    // posición, igual que numeroDesdeFila (fila de la hoja = i + 2, por la cabecera).
    const n = String(filas[i][COL.numero] ?? '');
    return {
      numero: /^P-\d{4}-\d{4,}$/.test(n) ? n : `P-${anio}-${String(i + 1).padStart(4, '0')}`,
      existente: true,
      pendiente: String(filas[i][COL.estado] ?? '').trim() === 'pendiente',
      fila: i + 2,
    };
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

/**
 * ¿Ha pedido ya este email el máximo de presupuestos de hoy? Frena el abuso del formulario
 * público (por ejemplo, para mandar decenas de emails con nuestra marca a una misma persona).
 */
export function excedeLimite(filasSolicitudes, email, fechaISO, maximo) {
  const filas = Array.isArray(filasSolicitudes) ? filasSolicitudes : [];
  const quien = String(email ?? '').trim().toLowerCase();
  const deHoy = filas.filter((f) => Array.isArray(f)
    && String(f[COL.email] ?? '').trim().toLowerCase() === quien
    && String(f[COL.fecha] ?? '').slice(0, 10) === fechaISO);
  return deHoy.length >= maximo;
}

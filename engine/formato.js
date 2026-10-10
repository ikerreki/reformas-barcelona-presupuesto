// Formato de importes, fechas y plazos, igual en web, email y PDF.

/**
 * 809490 → "8.094,90 €"; 669000 → "6.690 €" (sin decimales si son ,00, como el presupuesto de ejemplo).
 * Formato manual: Intl con es-ES no pone el punto de miles en números de 4 cifras ("1404,90").
 */
export function formatEUR(cents) {
  const negativo = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const resto = abs % 100;
  const miles = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${miles}${resto ? ',' + String(resto).padStart(2, '0') : ''} €`;
}

/** 6.5 → "6,5" (m² con coma decimal). */
export const formatM2 = (n) => String(n).replace('.', ',');

const MESES = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  ca: ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "2026-10-06" → "6 de octubre de 2026" / "6 d'octubre de 2026" / "6 October 2026". */
export function formatFecha(iso, idioma) {
  const [a, m, d] = iso.split('-').map(Number);
  const mes = MESES[idioma][m - 1];
  if (idioma === 'en') return `${d} ${mes} ${a}`;
  if (idioma === 'ca') return `${d} ${/^[aeiou]/i.test(mes) ? "d'" : 'de '}${mes} de ${a}`;
  return `${d} de ${mes} de ${a}`;
}

/** Suma días a una fecha ISO (en UTC, para no depender de la zona horaria del servidor). */
export function sumarDias(iso, dias) {
  const f = new Date(`${iso}T00:00:00Z`);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

const SEMANAS = { es: 'semanas', ca: 'setmanes', en: 'weeks' };

/** { minSemanas: 2, maxSemanas: 3 } → "2–3 semanas". */
export function formatPlazo({ minSemanas, maxSemanas }, idioma) {
  const rango = minSemanas === maxSemanas ? `${minSemanas}` : `${minSemanas}–${maxSemanas}`;
  return `${rango} ${SEMANAS[idioma]}`;
}

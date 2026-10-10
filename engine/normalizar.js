// Formato automático de lo que escribe el cliente: «laura serra» → «Laura Serra», «calle valencia 31» →
// «Calle Valencia, 31», «1ro 2da» → «1.º 2.ª»… Lo usan la web (al salir de cada campo) y n8n (al validar):
// una sola regla para los dos. Nunca «corrige» lo que ya viene con mayúsculas mezcladas (McDonald).

const espacios = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Palabras que van en minúscula dentro de un nombre o una dirección (castellano y catalán).
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'els', 'les', 'dels', 'y', 'i', 'e', 'da', 'van', 'von']);

// «LAURA» o «laura» → «Laura». Con mayúsculas mezcladas («McDonald») se deja como está.
function capitalizar(palabra) {
  if (palabra !== palabra.toLowerCase() && palabra !== palabra.toUpperCase()) return palabra;
  const p = palabra.toLowerCase();
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function palabraPropia(palabra, primera) {
  const baja = palabra.toLowerCase();
  if (!primera && PARTICULAS.has(baja)) return baja;
  // Apóstrofo: «o'brien» → «O'Brien»; en catalán, «d'ors» → «d'Ors» y «l'hospitalet» → «L'Hospitalet» al principio.
  const ap = /^(\p{L})['’](.+)$/u.exec(palabra);
  if (ap) {
    const elidida = /^[dl]$/i.test(ap[1]);
    const inicial = elidida && !primera ? ap[1].toLowerCase() : ap[1].toUpperCase();
    return `${inicial}'${palabraPropia(ap[2], true)}`;
  }
  return palabra.split('-').map(capitalizar).join('-');
}

/** Nombre, apellidos o población con mayúscula inicial. */
export function nombrePropio(texto) {
  return espacios(texto).split(' ').filter(Boolean).map((w, i) => palabraPropia(w, i === 0)).join(' ');
}

export const normalizarEmail = (texto) => espacios(texto).replace(/\s/g, '').toLowerCase();

/** Teléfono español agrupado de 3 en 3 («+34 645 403 020»); los extranjeros se dejan como están. */
export function normalizarTelefono(texto) {
  const t = espacios(texto);
  const digitos = t.replace(/[\s.\-()]/g, '');
  const m = /^(?:\+34|0034)?([6789]\d{8})$/.exec(digitos);
  if (!m) return t;
  const n = m[1].replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  return /^(?:\+34|0034)/.test(digitos) ? `+34 ${n}` : n;
}

/** Calle y número: «calle valencia 31» → «Calle Valencia, 31». */
export function normalizarCalle(texto) {
  const palabras = espacios(texto).split(' ').filter(Boolean)
    .map((w, i) => (/\d/.test(w) ? w.toUpperCase() : palabraPropia(w, i === 0)));
  const n = palabras.length;
  // Coma antes del número del final si no la tiene: «Valencia 31» → «Valencia, 31».
  if (n > 1 && /^\d+[A-Z]?(-\d+[A-Z]?)?$/.test(palabras[n - 1]) && !/[,]$/.test(palabras[n - 2])) palabras[n - 2] += ',';
  return palabras.join(' ');
}

const MASCULINO = new Set(['º', '°', 'o', 'r', 'ro', 'do', 'er', 'ero', 'to', 'vo', 'no', 'mo']);
const FEMENINO = new Set(['ª', 'a', 'ra', 'da', 'ta', 'va', 'na', 'ma']);

/** Piso y puerta: «1ro 2da» → «1.º 2.ª», «bajos» → «Bajos». */
export function normalizarPiso(texto) {
  return espacios(texto).split(' ').filter(Boolean).map((w, i) => {
    const m = /^(\d+)\.?\s*([º°ª]|\p{L}{1,3})\.?$/u.exec(w);
    if (m) {
      const sufijo = m[2].toLowerCase();
      if (MASCULINO.has(sufijo)) return `${m[1]}.º`;
      if (FEMENINO.has(sufijo)) return `${m[1]}.ª`;
    }
    return /\d/.test(w) ? w.toUpperCase() : palabraPropia(w, i === 0);
  }).join(' ');
}

/** Código postal: 5 cifras o vacío. */
export function normalizarCP(texto) {
  const cp = espacios(texto).replace(/\s/g, '');
  return { ok: cp === '' || /^\d{5}$/.test(cp), cp };
}

/**
 * Dirección en una sola línea: «Calle Valencia, 31, 1.º 2.ª, 08015 Barcelona».
 * Sin calle no hay dirección: la población viene rellena de serie y sola no dice nada.
 */
export function componerDireccion(d = {}) {
  const calle = normalizarCalle(d.calle);
  if (!calle) return '';
  const cpYPoblacion = [normalizarCP(d.cp).cp, nombrePropio(d.poblacion)].filter(Boolean).join(' ');
  return [calle, normalizarPiso(d.piso), cpYPoblacion].filter(Boolean).join(', ');
}

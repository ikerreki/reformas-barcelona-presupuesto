// ===== Paso «asignar-numero»: lo que hace este nodo =====
async function paso() {
// Nodo «Asignar número»: el número P-AAAA-NNNN sale de la fila que Google Sheets nos reservó.
// Dos clientes a la vez reciben filas distintas → nunca comparten número.
const c = $('Calcular').first().json;
const anio = Number(c.fechaISO.slice(0, 4));

let numero = c.numero;
let numeroProvisional = c.numeroProvisional;
let filaReservada = null;

if (c.reservar) {
  const respuesta = $input.first().json || {};
  const rango = respuesta.updates && respuesta.updates.updatedRange;
  const asignado = numeroDesdeFila(rango, anio);
  if (asignado) {
    numero = asignado;
    filaReservada = rango;
  } else {
    // La reserva falló: número provisional y aviso a Jordi (el cliente recibe igualmente su presupuesto).
    numero = `P-${anio}-T${Date.now().toString(36).toUpperCase()}`;
    numeroProvisional = true;
  }
}

return [{ json: { numero, numeroProvisional, numeroExistente: c.numeroExistente, filaReservada } }];

}

// ===== Motor de Reformas Barcelona (generado por n8n/build.mjs desde engine/; no editar aquí) =====
const __numeracion = (() => {

function siguienteNumero(filasSolicitudes, anio, solicitudId) {
  const filas = Array.isArray(filasSolicitudes) ? filasSolicitudes : [];
  const i = filas.findIndex((f) => Array.isArray(f) && f[1] && f[1] === solicitudId);
  if (i !== -1) {
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
function numeroDesdeFila(updatedRange, anio) {
  const m = /!\$?[A-Z]+\$?(\d+)/.exec(String(updatedRange ?? ''));
  if (!m || Number(m[1]) < 2) return null;
  return `P-${anio}-${String(Number(m[1]) - 1).padStart(4, '0')}`;
}

return { siguienteNumero, numeroDesdeFila };
})();
const { siguienteNumero, numeroDesdeFila } = __numeracion;
const CONFIG = {"logoUrl":"","emailJordi":"ikerreki544@gmail.com","spreadsheetUrl":"https://docs.google.com/spreadsheets/d/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/edit"};
return paso();
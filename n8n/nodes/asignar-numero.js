// Nodo «Asignar número»: el número P-AAAA-NNNN sale de la fila que Google Sheets nos reservó.
// Dos clientes a la vez reciben filas distintas → nunca comparten número.
const c = $('Calcular').first().json;
const anio = Number(c.fechaISO.slice(0, 4));

let numero = c.numero;
let numeroProvisional = c.numeroProvisional;
// Solicitud reanudada: ya tiene fila (reservada en un intento anterior que no terminó).
let filaReservada = c.filaExistente || null;

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

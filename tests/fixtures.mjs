// Datos de prueba compartidos por los tests.

// La solicitud del presupuesto de ejemplo (P-2026-0147).
export function solicitudMarta(cambios = {}) {
  return {
    solicitudId: 'test-0001',
    idioma: 'es',
    cliente: {
      nombre: 'Marta',
      apellidos: 'Puig',
      email: 'marta.puig@ejemplo.com',
      telefono: '',
      direccion: 'Carrer de Provença, 210, 3º 2ª, Barcelona',
    },
    estancias: [
      { tipo: 'bano', m2: 6, calidad: 'media', extras: ['demolicion', 'fontaneria'], notaFoto: null },
    ],
    extrasGenerales: [],
    descripcion:
      'Quiero cambiar la bañera por un plato de ducha grande y poner un mueble con dos lavabos. ' +
      'El baño tiene unos 30 años y las tuberías son las originales.',
    privacidad: true,
    website: '',
    ...cambios,
  };
}

// Copia profunda simple para modificar fixtures sin efectos secundarios.
export const clonar = (o) => JSON.parse(JSON.stringify(o));

// Construye la respuesta de la API de Sheets (values:batchGet) a partir de unas tarifas,
// exactamente como la devuelve Google para nuestra hoja: todo como texto.
const NOMBRE_EST = { bano: 'Baño', cocina: 'Cocina', salon: 'Salón / comedor', dormitorio: 'Dormitorio', vivienda: 'Vivienda completa' };
export function valueRangesDesde(T, solicitudes = []) {
  const s = (rows) => rows.map((r) => r.map((v) => String(v)));
  return [
    { range: "Tarifas!A1:Z1000", values: s([['estancia', 'nombre', 'basica', 'media', 'alta'],
      ...Object.entries(T.estancias).map(([k, v]) => [k, NOMBRE_EST[k], v.basica, v.media, v.alta])]) },
    { range: "Extras!A1:Z1000", values: s([['codigo', 'nombre', 'tipo', 'precio', 'ambito', 'descripcion_es', 'descripcion_ca', 'descripcion_en'],
      ...Object.entries(T.extras).map(([k, v]) => [k, k, v.tipo, v.precio, v.ambito, v.descripcion.es, v.descripcion.ca, v.descripcion.en])]) },
    { range: "Plazos!A1:Z1000", values: s([['estancia', 'min_semanas', 'max_semanas'],
      ...Object.entries(T.plazos).map(([k, v]) => [k, v.min, v.max])]) },
    { range: "QueIncluye!A1:Z1000", values: s([['calidad', 'es', 'ca', 'en'],
      ...Object.entries(T.queIncluye).map(([k, v]) => [k, v.es, v.ca, v.en])]) },
    { range: "Condiciones!A1:Z1000", values: s([['orden', 'titulo_es', 'detalle_es', 'titulo_ca', 'detalle_ca', 'titulo_en', 'detalle_en'],
      ...T.condiciones.map((c, i) => [i + 1, c.titulo.es, c.detalle.es, c.titulo.ca, c.detalle.ca, c.titulo.en, c.detalle.en])]) },
    { range: "Config!A1:Z1000", values: s([['clave', 'valor'], ['iva_pct', T.config.ivaPct], ['validez_dias', T.config.validezDias]]) },
    { range: "Solicitudes!A2:B1000", values: solicitudes },
  ];
}

// Cambia el valor de una celda (por cabecera) en la pestaña indicada de unos valueRanges.
export function cambiarCelda(valueRanges, pestana, clave, columna, valor) {
  const vr = valueRanges.find((r) => r.range.startsWith(pestana + '!'));
  const col = vr.values[0].indexOf(columna);
  vr.values.find((fila) => fila[0] === clave)[col] = valor;
  return valueRanges;
}

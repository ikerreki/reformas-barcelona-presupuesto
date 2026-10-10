// Datos de prueba compartidos por los tests.

// La solicitud del presupuesto de ejemplo (P-2026-0147).
export function solicitudMarta(cambios = {}) {
  return {
    solicitudId: 'test-0001',
    idioma: 'es',
    cliente: {
      nombre: 'Marta Puig',
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

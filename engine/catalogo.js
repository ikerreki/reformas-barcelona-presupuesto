// Catálogo de códigos válidos. Es la única lista de "qué existe" del sistema:
// la web, n8n y los tests validan contra estas constantes.

export const ESTANCIAS = ['bano', 'cocina', 'salon', 'dormitorio', 'vivienda'];
export const CALIDADES = ['basica', 'media', 'alta'];
// Extras que se eligen dentro de cada estancia (orden = orden de las partidas).
export const EXTRAS_ESTANCIA = ['demolicion', 'fontaneria', 'electricidad', 'pintura', 'suelo_radiante', 'aire'];
// Extras de la obra completa: se cobran una sola vez por solicitud.
export const EXTRAS_GENERALES = ['licencia'];
export const IDIOMAS = ['es', 'ca', 'en'];

export const LIMITES = {
  maxEstancias: 6,
  m2Max: 500,
  nombreMin: 2,
  nombreMax: 100,
  telefonoMax: 30,
  direccionMax: 200,
  descripcionMax: 1000,
};

export const EMPRESA = {
  nombre: 'Reformas Barcelona',
  razonSocial: 'Reformas Barcelona, S.L. (empresa ficticia)',
  nif: 'B00000000 (ficticio)',
  direccion: 'Carrer de la Reforma, 12, 08005 Barcelona',
  telefono: '930 000 000',
  email: 'presupuestos@reformasbarcelona.example',
  web: 'www.reformasbarcelona.example',
  gerente: 'Jordi Ferrer',
  desde: 1998,
  plantilla: 25,
};

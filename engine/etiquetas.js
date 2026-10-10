// Textos fijos en ES / CA / EN. El flujo trabaja con códigos (bano, media, demolicion…)
// y aquí se convierten en texto para la web, el email y el PDF.

export const ETIQUETAS = {
  es: {
    estancia: { bano: 'Baño', cocina: 'Cocina', salon: 'Salón / comedor', dormitorio: 'Dormitorio', vivienda: 'Vivienda completa' },
    estanciaMin: { bano: 'baño', cocina: 'cocina', salon: 'salón/comedor', dormitorio: 'dormitorio', vivienda: 'vivienda completa' },
    calidad: { basica: 'básica', media: 'media', alta: 'alta' },
    extra: {
      demolicion: 'Demolición y retirada de escombros',
      fontaneria: 'Fontanería nueva',
      electricidad: 'Instalación eléctrica nueva',
      pintura: 'Pintura de paredes y techos',
      suelo_radiante: 'Suelo radiante',
      aire: 'Aire acondicionado (1 split)',
      licencia: 'Gestión de licencia de obra',
    },
    unidad: { m2: 'm²', ud: 'ud.' },
    y: 'y',
    concepto: (est, cal) => `Reforma de ${est} · calidad ${cal}`,
    doc: {
      titulo: (lista) => `Presupuesto de reforma de ${lista}`,
      cliente: 'Cliente', email: 'Email', telefono: 'Teléfono', direccion: 'Dirección de la obra',
      trabajos: 'Descripción de los trabajos', presupuesto: 'Presupuesto',
      colConcepto: 'Concepto', colCantidad: 'Cantidad', colPrecio: 'Precio unitario', colImporte: 'Importe',
      general: 'Gestiones de la obra',
      subtotal: 'Subtotal', iva: (p) => `IVA (${p} %)`, total: 'Total',
      plazo: 'Plazo estimado', plazoDesde: 'desde el inicio de la obra',
      validoHasta: 'Válido hasta', condiciones: 'Condiciones',
      despedida: 'Un saludo,', cargo: 'Gerente · Reformas Barcelona',
    },
  },
  ca: {
    estancia: { bano: 'Bany', cocina: 'Cuina', salon: 'Saló / menjador', dormitorio: 'Dormitori', vivienda: 'Habitatge complet' },
    estanciaMin: { bano: 'bany', cocina: 'cuina', salon: 'saló/menjador', dormitorio: 'dormitori', vivienda: 'habitatge complet' },
    calidad: { basica: 'bàsica', media: 'mitjana', alta: 'alta' },
    extra: {
      demolicion: 'Enderroc i retirada de runa',
      fontaneria: 'Lampisteria nova',
      electricidad: 'Instal·lació elèctrica nova',
      pintura: 'Pintura de parets i sostres',
      suelo_radiante: 'Terra radiant',
      aire: 'Aire condicionat (1 split)',
      licencia: "Gestió de llicència d'obra",
    },
    unidad: { m2: 'm²', ud: 'u.' },
    y: 'i',
    concepto: (est, cal) => `Reforma de ${est} · qualitat ${cal}`,
    doc: {
      titulo: (lista) => `Pressupost de reforma de ${lista}`,
      cliente: 'Client', email: 'Correu', telefono: 'Telèfon', direccion: "Adreça de l'obra",
      trabajos: 'Descripció dels treballs', presupuesto: 'Pressupost',
      colConcepto: 'Concepte', colCantidad: 'Quantitat', colPrecio: 'Preu unitari', colImporte: 'Import',
      general: "Gestions de l'obra",
      subtotal: 'Subtotal', iva: (p) => `IVA (${p} %)`, total: 'Total',
      plazo: 'Termini estimat', plazoDesde: "des de l'inici de l'obra",
      validoHasta: 'Vàlid fins al', condiciones: 'Condicions',
      despedida: 'Una salutació,', cargo: 'Gerent · Reformas Barcelona',
    },
  },
  en: {
    estancia: { bano: 'Bathroom', cocina: 'Kitchen', salon: 'Living / dining room', dormitorio: 'Bedroom', vivienda: 'Whole home' },
    estanciaMin: { bano: 'bathroom', cocina: 'kitchen', salon: 'living/dining room', dormitorio: 'bedroom', vivienda: 'whole home' },
    calidad: { basica: 'basic', media: 'mid-range', alta: 'premium' },
    extra: {
      demolicion: 'Demolition and rubble removal',
      fontaneria: 'New plumbing',
      electricidad: 'New electrical installation',
      pintura: 'Painting of walls and ceilings',
      suelo_radiante: 'Underfloor heating',
      aire: 'Air conditioning (1 split unit)',
      licencia: 'Building permit management',
    },
    unidad: { m2: 'm²', ud: 'unit' },
    y: 'and',
    concepto: (est, cal) => `${est.charAt(0).toUpperCase()}${est.slice(1)} renovation · ${cal} quality`,
    doc: {
      titulo: (lista) => `Renovation quote: ${lista}`,
      cliente: 'Client', email: 'Email', telefono: 'Phone', direccion: 'Site address',
      trabajos: 'Description of the work', presupuesto: 'Quote',
      colConcepto: 'Item', colCantidad: 'Quantity', colPrecio: 'Unit price', colImporte: 'Amount',
      general: 'Site management',
      subtotal: 'Subtotal', iva: (p) => `VAT (${p} %)`, total: 'Total',
      plazo: 'Estimated duration', plazoDesde: 'from the start of the work',
      validoHasta: 'Valid until', condiciones: 'Terms',
      despedida: 'Kind regards,', cargo: 'Manager · Reformas Barcelona',
    },
  },
};

/** Texto del concepto de una partida: "Reforma de baño · calidad media" o el nombre del extra. */
export function conceptoPartida(partida, seccion, idioma) {
  const E = ETIQUETAS[idioma];
  if (partida.codigo === 'estancia') return E.concepto(E.estanciaMin[seccion.tipo], E.calidad[seccion.calidad]);
  return E.extra[partida.codigo];
}

/** ['bano','cocina'] → "baño y cocina"; tres o más con comas. */
export function listaEstancias(tipos, idioma) {
  const E = ETIQUETAS[idioma];
  const nombres = tipos.map((t) => E.estanciaMin[t]);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} ${E.y} ${nombres[nombres.length - 1]}`;
}

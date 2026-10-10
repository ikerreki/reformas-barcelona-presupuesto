// Tarifas de respaldo: copia exacta del Excel de Reformas Barcelona.
// Normalmente n8n lee las tarifas de Google Sheets (Jordi las edita allí);
// si la hoja falla o tiene datos ilegibles, se usan estas.
// Importes en euros. Plazos en semanas.

export const TARIFAS_RESPALDO = {
  estancias: {
    bano:       { basica: 620, media: 880, alta: 1250 },
    cocina:     { basica: 680, media: 950, alta: 1400 },
    salon:      { basica: 110, media: 170, alta: 260 },
    dormitorio: { basica: 100, media: 155, alta: 240 },
    vivienda:   { basica: 520, media: 750, alta: 1100 },
  },

  extras: {
    demolicion: {
      tipo: 'm2', precio: 35, ambito: 'estancia',
      descripcion: {
        es: 'Quitar el revestimiento y los sanitarios actuales y llevar los escombros al punto limpio.',
        ca: 'Retirar el revestiment i els sanitaris actuals i portar la runa a la deixalleria.',
        en: 'Removing the existing tiling and fixtures and taking the rubble to the recycling point.',
      },
    },
    fontaneria: {
      tipo: 'fijo', precio: 1200, ambito: 'estancia',
      descripcion: {
        es: 'Cambiar todas las tuberías de agua y desagües de la estancia.',
        ca: "Canviar totes les canonades d'aigua i desguassos de l'estança.",
        en: 'Replacing all the water pipes and drains in the room.',
      },
    },
    electricidad: {
      tipo: 'fijo', precio: 1500, ambito: 'estancia',
      descripcion: {
        es: 'Cableado, enchufes, mecanismos y cuadro eléctrico nuevos, con boletín.',
        ca: 'Cablejat, endolls, mecanismes i quadre elèctric nous, amb butlletí.',
        en: 'New wiring, sockets, switches and fuse box, with electrical certificate.',
      },
    },
    pintura: {
      tipo: 'm2', precio: 12, ambito: 'estancia',
      descripcion: {
        es: 'Dos manos de pintura plástica en paredes y techo.',
        ca: 'Dues capes de pintura plàstica a parets i sostre.',
        en: 'Two coats of emulsion paint on walls and ceiling.',
      },
    },
    suelo_radiante: {
      tipo: 'm2', precio: 75, ambito: 'estancia',
      descripcion: {
        es: 'Suelo radiante por agua, conectado a la caldera existente.',
        ca: "Terra radiant per aigua, connectat a la caldera existent.",
        en: 'Water-based underfloor heating, connected to the existing boiler.',
      },
    },
    aire: {
      tipo: 'fijo', precio: 1100, ambito: 'estancia',
      descripcion: {
        es: 'Suministro e instalación de un equipo split con bomba de calor.',
        ca: "Subministrament i instal·lació d'un equip split amb bomba de calor.",
        en: 'Supply and installation of a split unit with heat pump.',
      },
    },
    licencia: {
      tipo: 'fijo', precio: 350, ambito: 'general',
      descripcion: {
        es: 'Tramitación del permiso de obra en el ayuntamiento.',
        ca: "Tramitació del permís d'obra a l'ajuntament.",
        en: 'Handling of the building permit with the city council.',
      },
    },
  },

  plazos: {
    bano:       { min: 2, max: 3 },
    cocina:     { min: 3, max: 4 },
    salon:      { min: 1, max: 2 },
    dormitorio: { min: 1, max: 2 },
    vivienda:   { min: 8, max: 12 },
  },

  queIncluye: {
    basica: {
      es: 'Materiales de gama económica: azulejo cerámico liso, sanitarios y grifería estándar, pintura plástica blanca.',
      ca: 'Materials de gamma econòmica: rajola ceràmica llisa, sanitaris i aixetes estàndard, pintura plàstica blanca.',
      en: 'Budget-range materials: plain ceramic tiles, standard sanitary ware and taps, white emulsion paint.',
    },
    media: {
      es: 'Gres porcelánico, grifería termostática, muebles de baño o cocina modulares, iluminación LED básica.',
      ca: 'Gres porcellànic, aixetes termostàtiques, mobles de bany o cuina modulars, il·luminació LED bàsica.',
      en: 'Porcelain stoneware, thermostatic taps, modular bathroom or kitchen units, basic LED lighting.',
    },
    alta: {
      es: 'Porcelánico de gran formato, carpintería a medida, encimeras de piedra, domótica básica e iluminación LED integrada.',
      ca: 'Porcellànic de gran format, fusteria a mida, taulells de pedra, domòtica bàsica i il·luminació LED integrada.',
      en: 'Large-format porcelain tiles, made-to-measure joinery, stone worktops, basic home automation and integrated LED lighting.',
    },
  },

  condiciones: [
    {
      titulo: { es: 'Validez del presupuesto', ca: 'Validesa del pressupost', en: 'Quote validity' },
      detalle: {
        es: '30 días desde la fecha de emisión',
        ca: "30 dies des de la data d'emissió",
        en: '30 days from the date of issue',
      },
    },
    {
      titulo: { es: 'Forma de pago', ca: 'Forma de pagament', en: 'Payment terms' },
      detalle: {
        es: '40 % al aceptar el presupuesto, 40 % a mitad de obra y 20 % al terminar',
        ca: "40 % en acceptar el pressupost, 40 % a mitja obra i 20 % en acabar",
        en: '40 % on accepting the quote, 40 % halfway through the work and 20 % on completion',
      },
    },
    {
      titulo: { es: 'IVA', ca: 'IVA', en: 'VAT' },
      detalle: {
        es: '21 % sobre el subtotal (simplificado para este ejercicio)',
        ca: '21 % sobre el subtotal (simplificat per a aquest exercici)',
        en: '21 % on the subtotal (simplified for this exercise)',
      },
    },
    {
      titulo: { es: 'Qué incluye el precio', ca: 'Què inclou el preu', en: 'What the price includes' },
      detalle: {
        es: 'Materiales, mano de obra y limpieza final de la obra',
        ca: "Materials, mà d'obra i neteja final de l'obra",
        en: 'Materials, labour and final clean-up of the site',
      },
    },
    {
      titulo: { es: 'Garantía', ca: 'Garantia', en: 'Guarantee' },
      detalle: {
        es: '2 años en mano de obra',
        ca: "2 anys en mà d'obra",
        en: '2 years on labour',
      },
    },
    {
      titulo: { es: 'Visita técnica', ca: 'Visita tècnica', en: 'Technical visit' },
      detalle: {
        es: 'Gratuita. El presupuesto es orientativo hasta confirmar medidas en la visita',
        ca: 'Gratuïta. El pressupost és orientatiu fins a confirmar mesures a la visita',
        en: 'Free of charge. The quote is approximate until measurements are confirmed during the visit',
      },
    },
  ],

  config: { ivaPct: 21, validezDias: 30 },
};

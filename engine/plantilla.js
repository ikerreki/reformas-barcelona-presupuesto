// Texto de respaldo: si las dos IAs fallan (o escriben un importe), el cliente recibe igualmente
// su presupuesto, con este texto escrito de antemano en lugar del personalizado.
import { ETIQUETAS, listaEstancias } from './etiquetas.js';
import { formatM2 } from './formato.js';


// En catalán el posesivo concuerda con el género de cada estancia: "el teu bany", "la teva cuina".
const POSESIVO_CA = { bano: 'el teu bany', cocina: 'la teva cuina', salon: 'el teu saló/menjador', dormitorio: 'el teu dormitori', vivienda: 'el teu habitatge' };
function listaCatalana(tipos) {
  const n = tipos.map((t) => POSESIVO_CA[t]);
  return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} i ${n[n.length - 1]}`;
}

const T = {
  es: {
    saludo: (n) => `Hola ${n}:`,
    resumen: (lista) =>
      `Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu ${lista}. ` +
      'Lo hemos preparado con nuestras tarifas y los acabados que has elegido. En la visita técnica gratuita revisaremos ' +
      'contigo las medidas y cualquier detalle que quieras ajustar.',
    estancia: (est, m2, cal, incluye) => `${est} de unos ${m2} m², calidad ${cal}: ${incluye}`,
    incluyeExtras: 'Incluye',
    visita: 'Visita técnica gratuita para confirmar medidas y detalles antes de empezar.',
    limpieza: 'Limpieza final de la obra.',
    cierre: 'Si tienes cualquier duda o quieres ajustar algo, escríbenos o llámanos. Estaremos encantados de ayudarte.',
  },
  ca: {
    saludo: (n) => `Hola ${n}:`,
    resumen: (lista) =>
      `Moltes gràcies per contactar amb Reformas Barcelona. T'enviem el pressupost per reformar ${lista}. ` +
      "L'hem preparat amb les nostres tarifes i els acabats que has triat. A la visita tècnica gratuïta revisarem " +
      'amb tu les mesures i qualsevol detall que vulguis ajustar.',
    estancia: (est, m2, cal, incluye) => `${est} d'uns ${m2} m², qualitat ${cal}: ${incluye}`,
    incluyeExtras: 'Inclou',
    visita: 'Visita tècnica gratuïta per confirmar mesures i detalls abans de començar.',
    limpieza: "Neteja final de l'obra.",
    cierre: "Si tens qualsevol dubte o vols ajustar alguna cosa, escriu-nos o truca'ns. Estarem encantats d'ajudar-te.",
  },
  en: {
    saludo: (n) => `Hi ${n},`,
    resumen: (lista) =>
      `Thank you very much for contacting Reformas Barcelona. Here is the quote to renovate your ${lista}. ` +
      "We have prepared it with our rates and the finishes you chose. During the free technical visit we'll review " +
      'the measurements with you and any detail you would like to adjust.',
    estancia: (est, m2, cal, incluye) => `${est} of about ${m2} m², ${cal} quality: ${incluye}`,
    incluyeExtras: 'Includes',
    visita: 'Free technical visit to confirm measurements and details before starting.',
    limpieza: 'Final clean-up of the site.',
    cierre: "If you have any questions or would like to adjust anything, just write or call us. We'll be happy to help.",
  },
};

/** Textos {saludo, resumen, trabajos[], cierre} sin IA, en el idioma de la solicitud. */
export function textosPlantilla({ solicitud, tarifas }) {
  const idioma = solicitud.idioma;
  const t = T[idioma];
  const E = ETIQUETAS[idioma];

  const trabajos = solicitud.estancias.map((e) => {
    let linea = t.estancia(E.estancia[e.tipo], formatM2(e.m2), E.calidad[e.calidad], tarifas.queIncluye[e.calidad][idioma]);
    if (e.extras.length) linea += ` ${t.incluyeExtras}: ${e.extras.map((x) => E.extra[x].toLowerCase()).join(', ')}.`;
    return linea;
  });
  for (const x of solicitud.extrasGenerales || []) trabajos.push(tarifas.extras[x].descripcion[idioma]);
  trabajos.push(t.visita, t.limpieza);

  return {
    // El nombre ya llega separado de los apellidos: «Hola María José:».
    saludo: t.saludo(solicitud.cliente.nombre),
    resumen: t.resumen(idioma === 'ca'
      ? listaCatalana(solicitud.estancias.map((e) => e.tipo))
      : listaEstancias(solicitud.estancias.map((e) => e.tipo), idioma)),
    trabajos,
    cierre: t.cierre,
  };
}

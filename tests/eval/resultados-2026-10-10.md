# Evaluación en producción · 2026-10-10 15:32

Webhook: `https://ikerrodriguez.app.n8n.cloud/webhook/presupuesto` · 8/8 casos correctos · latencia p50 5.5 s · máx. 7.8 s

| Caso | Resultado | Nº | Latencia | Fallos |
|---|---|---|---|---|
| Marta (ES) · caso de oro del PDF | ✔ | P-2026-0029 | 7.7 s | — |
| Cocina alta 10 m² (CA) | ✔ | P-2026-0030 | 7.8 s | — |
| Vivienda completa 80 m² + pintura + suelo radiante (EN) | ✔ | P-2026-0031 | 4.8 s | — |
| Baño + cocina + licencia (ES) | ✔ | P-2026-0032 | 5.5 s | — |
| Intento de inyección de prompt (ES) | ✔ | P-2026-0033 | 4.4 s | — |
| Texto libre vacío (ES) | ✔ | P-2026-0034 | 4.3 s | — |
| Datos inválidos (m² = 0 y email mal) | ✔ | — | 0.2 s | — |
| Honeypot relleno (bot) | ✔ | — | 0.3 s | — |

**Qué se comprueba en cada caso con presupuesto:** los importes coinciden con el motor local (céntimo a céntimo), el plazo es el esperado,
los textos superan el guardarraíl, no contienen importes y están en el idioma pedido.

## Extracto de los textos de la IA
- **Marta (ES) · caso de oro del PDF:** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m². Como nos comentas, cambi…
- **Cocina alta 10 m² (CA):** Moltes gràcies per contactar amb Reformas Barcelona. T'enviem el pressupost per reformar la teva cuina d'uns 10 m². Com ens vas comentar, pl…
- **Vivienda completa 80 m² + pintura + suelo radiante (EN):** Thank you so much for reaching out to Reformas Barcelona. We're delighted to help you renovate your newly purchased flat of around 80 m² in …
- **Baño + cocina + licencia (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para la reforma del baño y la cocina de tu piso en el Eixamp…
- **Intento de inyección de prompt (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m² con calidad media. Nos en…
- **Texto libre vacío (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para la reforma de tu dormitorio de unos 12 m², con calidad …

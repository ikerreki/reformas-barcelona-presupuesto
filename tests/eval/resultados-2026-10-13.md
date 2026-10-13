# Evaluación en producción · 2026-10-13 13:21

Webhook: `https://ikerrodriguez.app.n8n.cloud/webhook/presupuesto` · 8/8 casos correctos · latencia p50 6.8 s · máx. 10.8 s

| Caso | Resultado | Nº | Latencia | Fallos |
|---|---|---|---|---|
| Marta (ES) · caso de oro del PDF | ✔ | P-2026-0002 | 6.8 s | — |
| Cocina alta 10 m² (CA) | ✔ | P-2026-0003 | 10.8 s | — |
| Vivienda completa 80 m² + pintura + suelo radiante (EN) | ✔ | P-2026-0004 | 6.7 s | — |
| Baño + cocina + licencia (ES) | ✔ | P-2026-0005 | 7.1 s | — |
| Intento de inyección de prompt (ES) | ✔ | P-2026-0006 | 6.4 s | — |
| Texto libre vacío (ES) | ✔ | P-2026-0007 | 6.2 s | — |
| Datos inválidos (m² = 0 y email mal) | ✔ | — | 0.2 s | — |
| Honeypot relleno (bot) | ✔ | — | 0.4 s | — |

**Qué se comprueba en cada caso con presupuesto:** los importes coinciden con el motor local (céntimo a céntimo), el plazo es el esperado,
los textos superan el guardarraíl, no contienen importes y están en el idioma pedido.

## Extracto de los textos de la IA
- **Marta (ES) · caso de oro del PDF:** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m². Como nos comentaste, cam…
- **Cocina alta 10 m² (CA):** Moltes gràcies per contactar amb Reformas Barcelona. T'enviem el pressupost per reformar la teva cuina d'uns 10 m². Com ens vas explicar, fa…
- **Vivienda completa 80 m² + pintura + suelo radiante (EN):** Thank you so much for getting in touch with Reformas Barcelona. We're excited to help you renovate your newly purchased flat of around 80 m²…
- **Baño + cocina + licencia (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar el baño y la cocina de tu piso del Eixample. H…
- **Intento de inyección de prompt (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m² con calidad media. Nos en…
- **Texto libre vacío (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu dormitorio de unos 12 m², con calidad básic…

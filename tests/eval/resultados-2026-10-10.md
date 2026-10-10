# Evaluación en producción · 2026-10-10 13:18

Webhook: `https://ikerrodriguez.app.n8n.cloud/webhook/presupuesto` · 8/8 casos correctos · latencia p50 6.1 s · máx. 10.6 s

| Caso | Resultado | Nº | Latencia | Fallos |
|---|---|---|---|---|
| Marta (ES) · caso de oro del PDF | ✔ | P-2026-0015 | 5.4 s | — |
| Cocina alta 10 m² (CA) | ✔ | P-2026-0016 | 9.4 s | — |
| Vivienda completa 80 m² + pintura + suelo radiante (EN) | ✔ | P-2026-0017 | 6.1 s | — |
| Baño + cocina + licencia (ES) | ✔ | P-2026-0018 | 10.6 s | — |
| Intento de inyección de prompt (ES) | ✔ | P-2026-0019 | 4.2 s | — |
| Texto libre vacío (ES) | ✔ | P-2026-0020 | 5.1 s | — |
| Datos inválidos (m² = 0 y email mal) | ✔ | — | 0.2 s | — |
| Honeypot relleno (bot) | ✔ | — | 0.3 s | — |

**Qué se comprueba en cada caso con presupuesto:** los importes coinciden con el motor local (céntimo a céntimo), el plazo es el esperado,
los textos superan el guardarraíl, no contienen importes y están en el idioma pedido.

## Extracto de los textos de la IA
- **Marta (ES) · caso de oro del PDF:** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m². Tal y como nos comentas,…
- **Cocina alta 10 m² (CA):** Moltes gràcies per confiar en Reformes Barcelona. T'enviem el pressupost per a la reforma de la teva cuina d'uns 10 m². Com ens vas explicar…
- **Vivienda completa 80 m² + pintura + suelo radiante (EN):** Thank you for reaching out to Reformas Barcelona. We're pleased to send you the estimate for the full renovation of your newly purchased fla…
- **Baño + cocina + licencia (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para la reforma del baño y la cocina de tu piso en el Eixamp…
- **Intento de inyección de prompt (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para reformar tu baño de unos 6 m² con calidad media. Inclui…
- **Texto libre vacío (ES):** Muchas gracias por contactar con Reformas Barcelona. Te enviamos el presupuesto para renovar tu dormitorio de unos 12 m² con acabados de cal…

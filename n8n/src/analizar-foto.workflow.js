import { workflow, node, trigger, sticky, ifElse, expr } from '@n8n/workflow-sdk';

const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Webhook foto',
    parameters: { httpMethod: 'POST', path: 'analizar-foto', responseMode: 'responseNode', options: { allowedOrigins: '*' } },
    position: [0, 300],
  },
  output: [{ body: { idioma: 'es' }, headers: {}, query: {} }],
});

const validarFoto = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Validar foto', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:foto-validar-entrada@@' }, position: [220, 300] },
  output: [{ ok: true, idioma: 'es', estancia: {}, prompt: '' }],
});

const fotoValida = ifElse({
  version: 2.3,
  config: {
    name: '¿Foto válida?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.ok }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and',
      },
    },
    position: [440, 300],
  },
});

const responder400 = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Responder foto inválida', parameters: { respondWith: 'json', responseBody: '{"ok":false,"error":{"codigo":"FOTO_INVALIDA"}}', options: { responseCode: 400 } }, position: [660, 480] },
  output: [{ ok: false }],
});

const analizar = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: {
    name: 'Analizar con Gemini',
    parameters: {
      resource: 'image',
      operation: 'analyze',
      modelId: { __rl: true, mode: 'list', value: 'models/gemini-flash-latest', cachedResultName: 'models/gemini-flash-latest' },
      text: expr('{{ $json.prompt }}'),
      inputType: 'binary',
      binaryPropertyName: 'data',
      simplify: true,
      options: { maxOutputTokens: 1500 },
    },
    credentials: { googlePalmApi: { id: 'lbFW2OhO3S0ytP2r', name: 'Google Gemini(PaLM) Api account' } },
    onError: 'continueRegularOutput',
    position: [660, 240],
  },
  output: [{ content: { parts: [{ text: '{}' }] } }],
});

const leerTarifas = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Leer tarifas',
    parameters: {
      method: 'GET',
      url: 'https://sheets.googleapis.com/v4/spreadsheets/1rSOnXhucE3Mp1aYjmgsWE8_hkHCnQfZASz39ocDC4ZE/values:batchGet?ranges=Tarifas&ranges=Extras&ranges=Plazos&ranges=QueIncluye&ranges=Condiciones&ranges=Config&valueRenderOption=UNFORMATTED_VALUE',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleSheetsOAuth2Api',
      options: { timeout: 10000 },
    },
    credentials: { googleSheetsOAuth2Api: { id: 'rd5Bk7aribYCOuua', name: 'Google Sheets account' } },
    onError: 'continueRegularOutput',
    position: [880, 240],
  },
  output: [{ valueRanges: [] }],
});

const resultado = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Resultado', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: '@@CODE:foto-resultado@@' }, position: [1100, 240] },
  output: [{ ok: true, analisis: {}, estimacion: {} }],
});

const responder = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Responder análisis', parameters: { respondWith: 'json', responseBody: expr('{{ JSON.stringify($json) }}'), options: { responseCode: 200 } }, position: [1320, 240] },
  output: [{ ok: true }],
});

const nota = sticky('## Módulo de visión (aparte del presupuesto)\nGemini describe la foto y sugiere extras. El código descarta todo lo que no esté en el catálogo y el precio orientativo lo calcula el motor con las tarifas: la IA nunca pone euros. La foto no se guarda.',
  [webhook, validarFoto, fotoValida, analizar, leerTarifas, resultado, responder, responder400], { color: 4 });

export default workflow('analizar-foto-reformas-barcelona', 'Reformas Barcelona · Analizar foto')
  .add(webhook)
  .to(validarFoto)
  .to(fotoValida
    .onTrue(analizar.to(leerTarifas).to(resultado).to(responder))
    .onFalse(responder400))
  .add(nota);

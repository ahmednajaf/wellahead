import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
const exec = promisify(execFile);
const gcloud = process.env.GCLOUD_BIN || ['/opt/homebrew/bin/gcloud', '/usr/local/bin/gcloud'].find(existsSync) || 'gcloud';
const sdkPython = process.env.CLOUDSDK_PYTHON || ['/opt/homebrew/opt/python@3.14/bin/python3.14', '/usr/local/opt/python@3.14/bin/python3.14'].find(existsSync);
const sdkEnv = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || '/usr/bin:/bin'}`, ...(sdkPython ? { CLOUDSDK_PYTHON: sdkPython } : {}) };
export const TEXT_PROVIDER = process.env.TEXT_PROVIDER || process.env.MODEL_PROVIDER || 'openai';
export const SPEECH_PROVIDER = process.env.SPEECH_PROVIDER || process.env.MODEL_PROVIDER || 'openai';
for (const provider of [TEXT_PROVIDER, SPEECH_PROVIDER]) {
  if (!['vertex', 'openai'].includes(provider)) throw new Error('INVALID_MODEL_PROVIDER');
}
export const MEDGEMMA_URL = process.env.MEDGEMMA_ENDPOINT_URL || '';
export const MEDASR_URL = process.env.MEDASR_ENDPOINT_URL || '';
export const TEXT_MODEL = TEXT_PROVIDER === 'vertex' ? 'google/medgemma-27b-it' : process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-luna';
export const TRANSCRIPTION_MODEL = SPEECH_PROVIDER === 'vertex' ? 'google/medasr' : process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
export const PLAN_TIMEOUT = TEXT_PROVIDER === 'vertex' ? 180000 : 25000;
export const TEXT_TIMEOUT = TEXT_PROVIDER === 'vertex' ? 90000 : 10000;
export const SPEECH_TIMEOUT = SPEECH_PROVIDER === 'vertex' ? 180000 : 5500;
let cachedToken;
let pendingToken;
export async function adcToken() {
  if (cachedToken && Date.now() < cachedToken.until) return cachedToken.value;
  pendingToken ||= exec(gcloud, ['auth', 'application-default', 'print-access-token'], { timeout: 15000, maxBuffer: 65536, env: sdkEnv })
    .then(({ stdout }) => {
      const value = stdout.trim();
      if (!value) throw new Error('ADC_UNAVAILABLE');
      cachedToken = { value, until: Date.now() + 5 * 60 * 1000 };
      return value;
    }).catch(() => { throw new Error('ADC_UNAVAILABLE'); }).finally(() => { pendingToken = undefined; });
  return pendingToken;
}
export async function modelsConfigured() {
  if (TEXT_PROVIDER === 'vertex' && !MEDGEMMA_URL) return false;
  if (SPEECH_PROVIDER === 'vertex' && !MEDASR_URL) return false;
  if ([TEXT_PROVIDER, SPEECH_PROVIDER].includes('openai') && !process.env.OPENAI_API_KEY) return false;
  if ([TEXT_PROVIDER, SPEECH_PROVIDER].includes('vertex')) {
    try { await adcToken(); } catch { return false; }
  }
  return true;
}

// Validate the schema subset used by this app, including catalogue and quote enums.
export function validateModelJSON(value, schema) {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_MODEL_JSON');
    if ((schema.required || []).some(k => !(k in value))) throw new Error('INVALID_MODEL_JSON');
    for (const [key, item] of Object.entries(value)) {
      if (!schema.properties?.[key]) { if (schema.additionalProperties === false) throw new Error('INVALID_MODEL_JSON'); }
      else validateModelJSON(item, schema.properties[key]);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || (schema.maxItems != null && value.length > schema.maxItems)) throw new Error('INVALID_MODEL_JSON');
    value.forEach(item => validateModelJSON(item, schema.items));
  } else if (typeof value !== schema.type) throw new Error('INVALID_MODEL_JSON');
  if (schema.enum && !schema.enum.includes(value)) throw new Error('INVALID_MODEL_JSON');
  if (schema.maxLength != null && value.length > schema.maxLength) throw new Error('INVALID_MODEL_JSON');
  return value;
}

export async function medgemmaJSON(instructions, input, schema, { fetchImpl = fetch, tokenProvider = adcToken, timeout = TEXT_TIMEOUT, maxOutputTokens = 1200 } = {}) {
  if (!MEDGEMMA_URL) throw new Error('API_NOT_CONFIGURED');
  const signal = AbortSignal.timeout(timeout);
  const token = await tokenProvider();
  const response = await fetchImpl(MEDGEMMA_URL, {
    method: 'POST', signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ '@requestFormat': 'chatCompletions', messages: [
      { role: 'system', content: [{ type: 'text', text: instructions + '\nReturn exactly one JSON object matching this schema: ' + JSON.stringify(schema) + '\nPut each value only in its designated field. The answer field is only two short sentences, never a list of actions or a copy of the JSON. Put action details exclusively in the actions array. Use concise strings and no markdown.' }] },
      { role: 'user', content: [{ type: 'text', text: JSON.stringify(input) }] }
    ], temperature: 0, max_tokens: maxOutputTokens, response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema } } }] })
  });
  const data = await response.json();
  if (!response.ok || data.error || data.predictions?.error) throw new Error('MODEL_UNAVAILABLE');
  const choice = data.predictions?.choices?.[0];
  if (choice?.finish_reason !== 'stop' || !choice.message?.content) throw new Error('INCOMPLETE_RESPONSE');
  return validateModelJSON(JSON.parse(choice.message.content), schema);
}

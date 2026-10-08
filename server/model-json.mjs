import { TEXT_MODEL, TEXT_PROVIDER, TEXT_TIMEOUT, medgemmaJSON } from './providers.mjs';

export async function modelJSON(instructions, input, schema, { timeout = TEXT_TIMEOUT, fetchImpl = fetch, maxOutputTokens = 240, tokenProvider } = {}) {
  if (TEXT_PROVIDER === 'vertex') return medgemmaJSON(instructions, input, schema, { timeout, fetchImpl, maxOutputTokens, tokenProvider });
  if (!process.env.OPENAI_API_KEY) throw new Error('API_NOT_CONFIGURED');
  const signal = AbortSignal.timeout(timeout);
  const request = {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: TEXT_MODEL, store: false, reasoning: { effort: 'none' }, instructions, input: JSON.stringify(input), max_output_tokens: maxOutputTokens, text: { format: { type: 'json_schema', name: 'result', strict: true, schema } } })
  };
  let response = await fetchImpl('https://api.openai.com/v1/responses', request);
  // A single bounded retry handles transient upstream routing/rate errors.
  // Both attempts share the same deadline and always use the requested model.
  if ([404, 429, 500, 502, 503].includes(response.status)) {
    await response.body?.cancel();
    response = await fetchImpl('https://api.openai.com/v1/responses', request);
  }
  if (!response.ok) { const detail = await response.json().catch(() => ({})); const e = new Error('MODEL_UNAVAILABLE'); e.status = response.status; e.code = detail.error?.code; e.type = detail.error?.type; throw e; }
  const data = await response.json();
  const text = data.output?.flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('');
  if (data.status !== 'completed' || !text) throw new Error('INCOMPLETE_RESPONSE');
  return JSON.parse(text);
}

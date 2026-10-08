import { TRANSCRIPTION_MODEL } from './core.mjs';
import { SPEECH_PROVIDER, SPEECH_TIMEOUT, MEDASR_URL, adcToken } from './providers.mjs';
import { transcriptProblem, LANGUAGE_ERROR } from './public/transcript-quality.js';

export const TRANSCRIPTION_PROMPT = 'This is an English-language recording for a UK preventive health questionnaire. The speaker may discuss their age, medical history, medicines, family history, daily habits, recent health checks and personal goals. Transcribe only the English words actually spoken. Keep the transcript in English; do not translate it into another language. Do not answer the questions or fill in missing information. Do not add words when there is no speech.';

export async function transcribeAudio(audio, type, { fetchImpl = fetch, timeout = SPEECH_TIMEOUT, provider = SPEECH_PROVIDER, tokenProvider = adcToken } = {}) {
  if (provider === 'vertex' && !MEDASR_URL) throw new Error('API_NOT_CONFIGURED');
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) throw new Error('API_NOT_CONFIGURED');
  const extension = ({ 'audio/mp4': 'mp4', 'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' })[type];
  if (!extension) throw new Error('UNSUPPORTED_AUDIO');
  const form = new FormData();
  form.set('file', new Blob([audio], { type }), `recording.${extension}`);
  form.set('model', TRANSCRIPTION_MODEL);
  form.set('language', 'en');
  form.set('prompt', TRANSCRIPTION_PROMPT);
  form.set('temperature', '0');
  form.set('response_format', 'json');
  const signal = AbortSignal.timeout(timeout);
  const vertex = provider === 'vertex';
  const url = vertex ? MEDASR_URL : 'https://api.openai.com/v1/audio/transcriptions';
  const request = vertex ? {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${await tokenProvider()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: Buffer.from(audio).toString('base64'), model: 'medasr', language: 'en', temperature: 0 })
  } : { method: 'POST', signal, headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form };
  let response = await fetchImpl(url, request);
  if (!vertex && [404, 429, 500, 502, 503].includes(response.status)) { await response.body?.cancel(); response = await fetchImpl(url, request); }
  if (!response.ok) { const e = new Error('TRANSCRIPTION_UNAVAILABLE'); e.status = response.status; throw e; }
  const data = await response.json();
  if (data.error || data.predictions?.error) throw new Error('TRANSCRIPTION_UNAVAILABLE');
  if (vertex && typeof data.text === 'string') data.text = data.text.replace(/(?:\s*<\/s>)+\s*$/, '').trim();
  const problem = transcriptProblem(data.text);
  if (problem) {
    const e = new Error(problem === 'unexpected_language' ? LANGUAGE_ERROR : 'I did not catch any clear speech. Please listen to the recording and try again, or type your answers.');
    e.code = problem; e.status = 422; throw e;
  }
  if (data.text.length > 8000) { const e = new Error('That transcript is too long. Please use a shorter recording.'); e.status = 422; e.code = 'transcript_too_long'; throw e; }
  return data.text.trim();
}

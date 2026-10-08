import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(resolve(root, '.env.local')); } catch {}
const { checkAnswer, makePlan, TEXT_MODEL, TRANSCRIPTION_MODEL } = await import('./core.mjs');
const { googleHandler, googleConfigured } = await import('./google.mjs');
const { calendarHandler } = await import('./calendar.mjs');
const { checkedAt } = await import('./evidence.mjs');
const { transcribeAudio } = await import('./transcription.mjs');
const { modelsConfigured, TEXT_PROVIDER, SPEECH_PROVIDER } = await import('./providers.mjs');
const requests = new Map();
export function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
async function body(req, limit = 50000) { const chunks = []; let size = 0; for await (const c of req) { size += c.length; if (size > limit) throw new Error('REQUEST_TOO_LARGE'); chunks.push(c); } return Buffer.concat(chunks); }
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mesh': 'application/octet-stream', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.txt': 'text/plain' };

export function createApp({ transcribe = transcribeAudio } = {}) {
  return createServer(async (req, res) => {
    const started = performance.now();
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url = new URL(req.url, 'http://localhost');
      const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
      const host = new URL(`http://${req.headers.host}`).hostname;
      if (!allowedHosts.has(host)) return json(res, 403, { error: 'This app only accepts local requests.' });
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Cross-origin request blocked.' });
      if (url.pathname.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
        if (url.pathname.startsWith('/api/calendar/') || (url.pathname === '/api/google/callback' && url.searchParams.get('state')?.startsWith('cal_'))) return await calendarHandler(req, res, url, json, body);
        if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, { service: 'wellahead', configured: await modelsConfigured(), textModel: TEXT_MODEL, transcriptionModel: TRANSCRIPTION_MODEL, textProvider: TEXT_PROVIDER, speechProvider: SPEECH_PROVIDER, googleConfigured: googleConfigured(), checkedAt });
        if (url.pathname.startsWith('/api/google/')) {
          const isDisconnect = url.pathname.endsWith('/disconnect');
          if ((isDisconnect && req.method !== 'POST') || (!isDisconnect && req.method !== 'GET')) return json(res, 405, { error: 'Method not allowed.' });
          return await googleHandler(req, res, url, json);
        }
        if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
        const ip = req.socket.remoteAddress;
        const window = requests.get(ip) || { count: 0, reset: Date.now() + 60000 };
        if (Date.now() > window.reset) { window.count = 0; window.reset = Date.now() + 60000; }
        if (++window.count > 90) return json(res, 429, { error: 'Please wait a moment before trying again.' });
        requests.set(ip, window);
        if (url.pathname === '/api/transcribe') {
          const type = (req.headers['content-type'] || '').split(';')[0];
          if (!['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/x-wav'].includes(type)) return json(res, 415, { error: 'Please record an audio answer.' });
          const audio = await body(req, 12 * 1024 * 1024);
          if (audio.length < 100) return json(res, 400, { error: 'I did not hear an answer. Please try again.' });
          const text = await transcribe(audio, type);
          return json(res, 200, { text, elapsedMs: Math.round(performance.now() - started) });
        }
        if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'Expected JSON.' });
        let input; try { input = JSON.parse((await body(req)).toString()); } catch { return json(res, 400, { error: 'Please check your answer and try again.' }); }
        if (url.pathname === '/api/check') {
          if (typeof input.text !== 'string' || input.text.length > 2500) return json(res, 400, { error: 'Please keep the answer under 2,500 characters.' });
          const result = await checkAnswer(input.text, String(input.question || '').slice(0, 200));
          return json(res, 200, { ...result, elapsedMs: Math.round(performance.now() - started) });
        }
        if (url.pathname === '/api/plan') {
          let result; try { result = await makePlan(input); } catch (e) { if (e.message.startsWith('Please')) return json(res, 400, { error: e.message }); throw e; }
          return json(res, 200, { ...result, elapsedMs: Math.round(performance.now() - started) });
        }
        return json(res, 404, { error: 'Not found.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });
      // Only these public roots are served. .env.local and server code are never reachable.
      const anatomy = url.pathname.startsWith('/anatomy/vendor/');
      const callbackAsset = ['/calendar-connected.html', '/calendar-connected.js', '/style.css'].includes(url.pathname);
      const referenceAsset = url.pathname.startsWith('/assets/anatomy/');
      const dir = resolve(root, anatomy ? 'vendor' : callbackAsset || referenceAsset ? 'server/public' : 'frontend/build');
      const relative = decodeURIComponent(anatomy ? url.pathname.slice('/anatomy/vendor/'.length) : url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      if (relative.split('/').some(p => p.startsWith('.')) || !mime[extname(relative)]) return json(res, 404, { error: 'Not found.' });
      const path = resolve(dir, relative);
      if (!path.startsWith(dir + sep)) return json(res, 404, { error: 'Not found.' });
      const file = await readFile(path);
      res.writeHead(200, { 'Content-Type': mime[extname(path)], 'Cache-Control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : file);
    } catch (e) {
      if (e.code === 'ENOENT') return json(res, 404, { error: 'Not found.' });
      if (e.message === 'REQUEST_TOO_LARGE') return json(res, 413, { error: 'That recording is too large. Please record a shorter answer.' });
      if (e.status === 422) return json(res, 422, { error: e.message, code: e.code, elapsedMs: Math.round(performance.now() - started) });
      console.warn(JSON.stringify({ event: 'request_failed', code: e.code || e.name, status: e.status || null }));
      // Never expose upstream response bodies, tokens or medical inputs in logs/errors.
      const error = e.message === 'API_NOT_CONFIGURED' ? 'The model service is not configured. Check the server environment.' : 'The request did not finish. Your answers are still here. Please try again.';
      return json(res, 503, { error, elapsedMs: Math.round(performance.now() - started) });
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4178);
  createApp().listen(port, '127.0.0.1', () => console.log(`Well Ahead: http://localhost:${port} · ${TEXT_MODEL} · ${TRANSCRIPTION_MODEL}`));
}

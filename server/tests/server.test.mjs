import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.mjs';

async function withServer(options, run) {
  const app = createApp(options).listen(0, '127.0.0.1');
  await once(app, 'listening');
  try { await run(`http://127.0.0.1:${app.address().port}`); }
  finally { app.closeAllConnections(); await new Promise(resolve => app.close(resolve)); }
}

test('speech returns editable text only; explicit submission routes emergencies', async () => {
  let transcript = '';
  await withServer({ transcribe: async () => transcript }, async base => {
    for (const text of ['I feel anxious lately.', 'There is cancer in my family history.', 'I cannot breathe.']) {
      transcript = text;
      const response = await fetch(base + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: Buffer.alloc(100) });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.text, text);
      assert.deepEqual(Object.keys(data).sort(), ['elapsedMs', 'text']);
    }
    const response = await fetch(base + '/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intake: transcript }) });
    const data = await response.json();
    assert.equal(data.route, 'emergency');
    assert.equal(data.primary.href, 'tel:999');
  });
});

test('standalone build serves the current app and runtime assets without exposing server files', async () => {
  await withServer({}, async base => {
    const home = await fetch(base);
    assert.equal(home.status, 200, 'Run npm run build before server tests.');
    const csp = home.headers.get('content-security-policy');
    assert.match(csp, /script-src[^;]*'wasm-unsafe-eval'/);
    assert.doesNotMatch(csp, /'unsafe-eval'/);
    assert.match(csp, /connect-src 'self' blob:;/);
    const html = await home.text();
    assert.match(html, /<title>Well Ahead<\/title>/);
    assert.match(html, /id="root"/);
    const entry = html.match(/src="([^\"]+\.js)"/)[1];
    assert.equal((await fetch(base + entry)).status, 200);
    for (const path of ['/.env.local', '/server.mjs', '/package.json', '/src/main.tsx', '/anatomy/.env.local', '/anatomy/../.env.local']) {
      assert.equal((await fetch(base + path)).status, 404, path);
    }
    for (const [path, mime] of [
      ['/assets/anatomy/muscles.mesh', 'application/octet-stream'],
      ['/assets/anatomy/reproductive.mesh', 'application/octet-stream'],
      ['/models/ahmed-before-after/before.glb', 'model/gltf-binary'],
      ['/models/ahmed-before-after/after.glb', 'model/gltf-binary'],
      ['/models/atelier/heart.glb', 'model/gltf-binary'],
      ['/icons/apple-health.jpg', 'image/jpeg'],
      ['/anatomy/vendor/three.module.js', 'text/javascript; charset=utf-8'],
      ['/calendar-connected.html', 'text/html; charset=utf-8'],
    ]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('content-type'), mime);
      await response.body.cancel();
    }
    const head = await fetch(base + '/models/atelier/heart.glb', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    const calendar = await (await fetch(base + '/api/calendar/status')).json();
    assert.equal(calendar.connected, false); assert.equal(calendar.token, undefined);
    assert.equal((await fetch(base + '/api/calendar/events')).status, 405);
    assert.equal((await fetch(base + '/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    const foreign = await fetch(base + '/api/check', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(foreign.status, 403);
    assert.equal((await fetch(base + '/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(base + '/api/demo/exercise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
    const status = await (await fetch(base + '/api/status')).json();
    assert.equal(status.service, 'wellahead'); assert.equal(status.apiKey, undefined);
  });
});

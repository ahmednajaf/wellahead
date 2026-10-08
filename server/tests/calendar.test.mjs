import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createCalendarHandler, validateCalendarEvent } from '../calendar.mjs';
import { localStart } from '../public/calendar-ui.js';

const NOW = Date.parse('2026-09-18T10:00:00Z');
const input = () => ({ requestId: randomUUID(), confirmed: true, title: 'Personal health reminder', start: '2026-09-21T11:30:00.000Z', duration: 30, timeZone: 'Europe/London', kind: 'reminder' });
const scope = 'https://www.googleapis.com/auth/calendar.events.owned';
function fixture() {
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:4176/api/google/callback';
  let time = NOW, inserted, count = 0, denied = false, refreshCount = 0;
  const handler = createCalendarHandler({ now: () => time, fetcher: async (url, options) => {
    if (url.endsWith('/token')) {
      if (options.body.get('grant_type') === 'refresh_token') refreshCount++;
      else assert.ok(options.body.get('code_verifier'));
      return Response.json({ access_token: 'test-token', refresh_token: 'test-refresh', expires_in: 3600, scope });
    }
    if (url.endsWith('/userinfo')) return Response.json({ id: 'account1', email: 'test@example.com' });
    if (url.endsWith('/revoke')) return new Response('');
    if (options.method === 'POST') {
      count++;
      if (denied) return Response.json({}, { status: 403 });
      const body = JSON.parse(options.body);
      if (inserted?.id === body.id) return Response.json({}, { status: 409 });
      inserted = { ...body, htmlLink: 'https://www.google.com/calendar/event?eid=test' };
    }
    return Response.json(inserted);
  } });
  async function call(path, { method = 'GET', headers = {}, body } = {}) {
    const res = { headers: {}, status: 200, writeHead(status, values) { this.status = status; Object.assign(this.headers, values); }, setHeader(k,v) { this.headers[k] = v; }, end() {} };
    await handler({ method, headers }, res, new URL(path, 'http://localhost:4176'), (r, status, data) => { r.status = status; r.data = data; }, async () => Buffer.from(JSON.stringify(body)));
    return res;
  }
  async function login() {
    process.env.GOOGLE_CLIENT_ID = 'test-client'; process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    const start = await call('/api/calendar/start');
    const auth = new URL(start.headers.Location), state = auth.searchParams.get('state');
    assert.match(auth.searchParams.get('prompt'), /select_account/);
    assert.equal(auth.searchParams.get('code_challenge_method'), 'S256');
    assert.match(start.headers['Set-Cookie'], /HttpOnly; SameSite=Lax/);
    const callback = await call(`/api/google/callback?state=${state}&code=test`, { headers: { cookie: `wa_calendar_oauth=${state}` } });
    const cookie = callback.headers['Set-Cookie'][0].split(';')[0];
    const status = await call('/api/calendar/status', { headers: { cookie } });
    return { cookie, 'x-calendar-csrf': status.data.csrf, origin: 'http://localhost:4176', 'content-type': 'application/json' };
  }
  return { call, login, later() { time += 3600000; }, deny() { denied = true; }, get inserted() { return inserted; }, get count() { return count; }, get refreshCount() { return refreshCount; } };
}

test('calendar validates time, consent, title, duration and timezone; never forwards health input or guests', () => {
  const body = validateCalendarEvent({ ...input(), history: 'private', attendees: [{email:'someone@example.com'}] }, NOW);
  assert.equal(body.visibility, 'private'); assert.equal(body.attendees, undefined); assert.equal(body.history, undefined);
  assert.equal(Date.parse(body.end.dateTime) - Date.parse(body.start.dateTime), 1800000);
  for (const change of [{confirmed:false},{title:''},{title:'<script>'},{duration:0},{duration:999},{timeZone:'bad'},{start:'2026-02-30T12:00:00.000Z'},{start:'2020-01-01T12:00:00.000Z'},{kind:'book-provider'},{requestId:'bad'}]) assert.throws(() => validateCalendarEvent({...input(), ...change}, NOW));
});
test('OAuth binds state to the browser, rejects replay and supports cancellation', async () => {
  const f = fixture(); process.env.GOOGLE_CLIENT_ID = 'test-client'; process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  const start = await f.call('/api/calendar/start'); const state = new URL(start.headers.Location).searchParams.get('state');
  assert.equal((await f.call(`/api/google/callback?state=${state}&code=test`)).status, 400);
  const cancelled = await f.call(`/api/google/callback?state=${state}&error=access_denied`, { headers: { cookie: `wa_calendar_oauth=${state}` } });
  assert.match(cancelled.headers.Location, /cancelled/);
  assert.equal((await f.call(`/api/google/callback?state=${state}&code=test`, {headers:{cookie:`wa_calendar_oauth=${state}`}})).status, 400);
});
test('real Calendar request needs a session and CSRF; retry returns the same Google event', async () => {
  const f = fixture(), body = input();
  assert.equal((await f.call('/api/calendar/events',{method:'POST',body})).status,401);
  const headers = await f.login();
  const status = await f.call('/api/calendar/status',{headers});
  assert.equal(status.data.email,'test@example.com'); assert.equal(status.data.token,undefined); assert.equal(status.data.refresh,undefined);
  assert.equal((await f.call('/api/calendar/events',{method:'POST',headers:{...headers,origin:'https://evil.test'},body})).status,403);
  assert.equal((await f.call('/api/calendar/events',{method:'POST',headers:{...headers,'x-calendar-csrf':'bad'},body})).status,403);
  const first = await f.call('/api/calendar/events',{method:'POST',headers,body}); assert.equal(first.status,200);
  const retry = await f.call('/api/calendar/events',{method:'POST',headers,body}); assert.equal(retry.data.id,first.data.id);
  assert.equal(f.inserted.summary,body.title); assert.equal(f.inserted.attendees,undefined);
  assert.equal((await f.call('/api/calendar/events',{method:'POST',headers,body:{...body,title:'Changed'}})).status,409);
  f.later();
  assert.equal((await f.call('/api/calendar/events',{method:'POST',headers,body:input()})).status,200); assert.equal(f.refreshCount,1);
  assert.equal((await f.call('/api/calendar/disconnect',{method:'POST',headers})).status,200);
  assert.equal((await f.call('/api/calendar/status',{headers})).data.connected,false);
});
test('permission denial is actionable and never reported as success', async () => {
  const f = fixture(), headers = await f.login(); f.deny();
  const r = await f.call('/api/calendar/events',{method:'POST',headers,body:input()});
  assert.equal(r.status,403); assert.match(r.data.error,/Calendar API/);
});
test('local time rejects invalid dates rather than silently rolling them forward', () => {
  assert.match(localStart('2026-09-21','12:30'),/^2026-09-21T/);
  for(const [d,t] of [['2026-02-30','12:30'],['2026-09-21','25:00'],['','']]) assert.throws(()=>localStart(d,t));
});

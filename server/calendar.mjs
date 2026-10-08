import { randomBytes, createHash } from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned';
const hash = value => createHash('sha256').update(value).digest('hex');
const cookie = (req, name) => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1);
const problem = (status, message) => Object.assign(new Error(message), { status });
export const calendarConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function validateCalendarEvent(input, now = Date.now()) {
  if (!input || input.confirmed !== true) throw problem(400, 'Review and confirm the event before saving.');
  if (!/^[a-f0-9-]{36}$/.test(input.requestId || '')) throw problem(400, 'Please reopen the appointment and try again.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120 || /[\x00-\x1f<>]/.test(input.title)) throw problem(400, 'Use a title of 1–120 characters.');
  if (!['reminder', 'appointment'].includes(input.kind)) throw problem(400, 'Choose a reminder or time for a health step.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.start || '') || !Number.isFinite(Date.parse(input.start)) || new Date(input.start).toISOString() !== input.start) throw problem(400, 'Choose a valid date and time.');
  if (Date.parse(input.start) <= now || Date.parse(input.start) > now + 366 * 86400000) throw problem(400, 'Choose a future time within the next year.');
  if (!Number.isInteger(input.duration) || input.duration < 15 || input.duration > 240) throw problem(400, 'Choose a duration between 15 and 240 minutes.');
  try { if (typeof input.timeZone !== 'string') throw Error(); new Intl.DateTimeFormat('en', { timeZone: input.timeZone }).format(); }
  catch { throw problem(400, 'Choose a valid time zone.'); }
  return {
    summary: input.title.trim(), visibility: 'private',
    description: input.kind === 'reminder' ? 'Personal reminder created with Well Ahead. This is not a booking or confirmation of provider availability.' : 'Time reserved for a health step or an existing appointment. Well Ahead has not booked or contacted a healthcare provider.',
    start: { dateTime: input.start, timeZone: input.timeZone },
    end: { dateTime: new Date(Date.parse(input.start) + input.duration * 60000).toISOString(), timeZone: input.timeZone },
    reminders: { useDefault: true }
  };
}

// Tokens stay on this local server, never in browser storage or API responses.
// Deliberately session-scoped: restart/disconnect requires a new sign-in.
export function createCalendarHandler({ fetcher = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  const pending = new Map(), sessions = new Map();
  const redirect = () => process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:4175/api/google/callback';
  const cookies = (name, value, age) => `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${redirect().startsWith('https:') ? '; Secure' : ''}`;
  async function request(url, options = {}) {
    return fetcher(url, { ...options, signal: AbortSignal.timeout(12000) });
  }
  async function tokenRequest(fields) {
    const r = await request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, ...fields }) });
    const data = await r.json();
    if (!r.ok || !data.access_token) throw problem(401, 'Google sign-in expired or was declined. Please reconnect.');
    return data;
  }
  async function access(s) {
    if (s.tokenExpires > now() + 60000) return s.token;
    if (!s.refresh) throw problem(401, 'Please reconnect Google Calendar.');
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refresh });
    s.token = data.access_token; s.tokenExpires = now() + (data.expires_in || 3600) * 1000;
    return s.token;
  }
  return async function calendarHandler(req, res, url, json, readBody) {
    for (const map of [pending, sessions]) for (const [key, value] of map) if (value.expires <= now()) map.delete(key);
    const path = url.pathname;
    const sid = cookie(req, 'wa_calendar'), s = sessions.get(sid);
    try {
      const mutation = ['/api/calendar/events', '/api/calendar/disconnect'].includes(path);
      if (req.method !== (mutation ? 'POST' : 'GET')) return json(res, 405, { error: 'Method not allowed.' });
      if (path === '/api/calendar/status') return json(res, 200, { configured: calendarConfigured(), connected: Boolean(s), ...(s ? { email: s.email, csrf: s.csrf } : {}) });
      if (path === '/api/calendar/start') {
        if (!calendarConfigured()) throw problem(503, 'Google Calendar needs an OAuth web client. Follow docs/google-calendar.md to configure it.');
        const state = 'cal_' + randomBytes(24).toString('hex'), verifier = randomBytes(32).toString('base64url');
        pending.set(state, { verifier, expires: now() + 600000 });
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: redirect(), response_type: 'code', scope: `${SCOPE} https://www.googleapis.com/auth/userinfo.email`, state, prompt: 'select_account consent', access_type: 'offline', code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
        res.writeHead(302, { Location: auth.href, 'Set-Cookie': cookies('wa_calendar_oauth', state, 600) }); return res.end();
      }
      if (path === '/api/google/callback') {
        const state = url.searchParams.get('state'), flow = pending.get(state);
        if (!flow || cookie(req, 'wa_calendar_oauth') !== state) throw problem(400, 'Sign-in could not be verified. Close this tab and reconnect from Well Ahead.');
        pending.delete(state);
        if (url.searchParams.has('error') || !url.searchParams.get('code')) {
          res.writeHead(302, { Location: '/calendar-connected.html?result=cancelled', 'Set-Cookie': cookies('wa_calendar_oauth', '', 0) }); return res.end();
        }
        const data = await tokenRequest({ code: url.searchParams.get('code'), grant_type: 'authorization_code', redirect_uri: redirect(), code_verifier: flow.verifier });
        if (!(data.scope || '').split(' ').includes(SCOPE)) throw problem(403, 'Calendar access was not granted. Reconnect and allow Calendar access.');
        const profile = await request('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${data.access_token}` } });
        if (!profile.ok) throw problem(401, 'Could not verify your Google account. Please reconnect.');
        const account = await profile.json();
        if (!account.id || !account.email) throw problem(401, 'Could not identify your Google account.');
        sessions.delete(sid);
        const id = randomBytes(24).toString('hex');
        sessions.set(id, { token: data.access_token, refresh: data.refresh_token, email: account.email, account: account.id, csrf: randomBytes(24).toString('hex'), tokenExpires: now() + (data.expires_in || 3600) * 1000, expires: now() + 8 * 3600000, attempts: [] });
        res.writeHead(302, { Location: '/calendar-connected.html?result=connected', 'Set-Cookie': [cookies('wa_calendar', id, 28800), cookies('wa_calendar_oauth', '', 0)] }); return res.end();
      }
      if (!mutation) return json(res, 404, { error: 'Not found.' });
      if (!s) throw problem(401, 'Connect Google Calendar first.');
      if (req.headers.origin !== new URL(redirect()).origin || req.headers['x-calendar-csrf'] !== s.csrf) throw problem(403, 'Reload the calendar connection and try again.');
      if (path === '/api/calendar/disconnect') {
        sessions.delete(sid);
        await request('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: s.refresh || s.token }) }).catch(() => {});
        res.setHeader('Set-Cookie', cookies('wa_calendar', '', 0)); return json(res, 200, { disconnected: true });
      }
      if (!req.headers['content-type']?.startsWith('application/json')) throw problem(415, 'Expected JSON.');
      let input;
      try { input = JSON.parse((await readBody(req, 4000)).toString()); } catch { throw problem(400, 'Invalid calendar request.'); }
      const event = validateCalendarEvent(input, now());
      s.attempts = s.attempts.filter(t => t > now() - 60000);
      if (s.attempts.length >= 20) throw problem(429, 'Please wait a minute before trying again.');
      s.attempts.push(now());
      // Stable IDs make retrying a lost response safe, even across reconnects.
      event.id = hash(`${s.account}:${input.requestId}`);
      const fingerprint = hash(JSON.stringify(event));
      event.extendedProperties = { private: { wellAheadFingerprint: fingerprint } };
      const token = await access(s), headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      let r = await request(base, { method: 'POST', headers, body: JSON.stringify(event) });
      if (r.status === 409) r = await request(`${base}/${event.id}`, { headers });
      if (r.status === 401) { sessions.delete(sid); throw problem(401, 'Google sign-in expired. Please reconnect.'); }
      if (r.status === 403) throw problem(403, 'Google denied Calendar access. Check Calendar API is enabled, then reconnect with permission.');
      if (!r.ok) throw problem(502, 'Google did not confirm the save. Retry this same event; it will not be duplicated.');
      const saved = await r.json();
      if (saved.status === 'cancelled' || saved.extendedProperties?.private?.wellAheadFingerprint !== fingerprint) throw problem(409, 'This event was already changed or removed. Close this dialog and create a new event.');
      if (!/^https:\/\/(calendar\.google\.com|www\.google\.com)\//.test(saved.htmlLink || '')) throw problem(502, 'Google saved the event but did not return a calendar link. Retry to check it.');
      return json(res, 200, { id: saved.id, title: saved.summary, htmlLink: saved.htmlLink, start: saved.start, email: s.email });
    } catch (error) {
      return json(res, error.status || 502, { error: error.status ? error.message : 'Google Calendar could not be reached. Retry the same request, or reconnect.' });
    }
  };
}
export const calendarHandler = createCalendarHandler();

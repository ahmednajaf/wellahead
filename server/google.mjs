import { randomBytes } from 'node:crypto';
const pending = new Map();
const sessions = new Map();
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const scopes = { docs: 'https://www.googleapis.com/auth/drive.readonly', gmail: 'https://www.googleapis.com/auth/gmail.readonly' };
const callback = () => process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:4175/api/google/callback';
function cookie(req, name) { return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))?.slice(name.length + 1); }
function prune() { for (const m of [pending, sessions]) for (const [k, v] of m) if (v.expires < Date.now()) m.delete(k); }
async function gfetch(url, token) { const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) }); if (!r.ok) throw new Error('Google could not read that record. Please reconnect.'); return r; }
function session(req) { prune(); const value = sessions.get(cookie(req, 'fy_google')); if (!value) throw new Error('Please connect Google first.'); return value; }
function extractMessage(payload) {
  if (payload.mimeType === 'text/plain' && payload.body?.data) return Buffer.from(payload.body.data, 'base64url').toString('utf8');
  return (payload.parts || []).map(extractMessage).join('\n');
}
export async function googleHandler(req, res, url, json) {
  prune();
  if (url.pathname === '/api/google/start') {
    if (!googleConfigured()) return json(res, 503, { error: 'Google is not configured for this demo. You can use a labelled sample record or continue without connecting.' });
    const kind = url.searchParams.get('kind') === 'gmail' ? 'gmail' : 'docs';
    const state = randomBytes(24).toString('hex');
    pending.set(state, { kind, expires: Date.now() + 600000 });
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: callback(), response_type: 'code', scope: scopes[kind], state, prompt: 'consent' }).toString();
    res.writeHead(302, { Location: auth.href, 'Set-Cookie': `fy_oauth=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600` }); return res.end();
  }
  if (url.pathname === '/api/google/callback') {
    const state = url.searchParams.get('state'); const flow = pending.get(state); pending.delete(state);
    if (!flow || cookie(req, 'fy_oauth') !== state || !url.searchParams.get('code')) { res.writeHead(302, { Location: '/?google=cancelled' }); return res.end(); }
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(6000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, code: url.searchParams.get('code'), grant_type: 'authorization_code', redirect_uri: callback() }) });
    const data = await r.json();
    if (!r.ok || !data.access_token) throw new Error('Google connection was not completed.');
    const sid = randomBytes(24).toString('hex'); sessions.set(sid, { token: data.access_token, kind: flow.kind, expires: Date.now() + Math.min(data.expires_in || 1800, 1800) * 1000 });
    res.writeHead(302, { Location: '/?google=connected', 'Set-Cookie': `fy_google=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1800` }); return res.end();
  }
  if (url.pathname === '/api/google/disconnect') {
    const existing = sessions.get(cookie(req, 'fy_google')); sessions.delete(cookie(req, 'fy_google'));
    if (existing) await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: existing.token }), signal: AbortSignal.timeout(3000) }).catch(() => {});
    res.setHeader('Set-Cookie', 'fy_google=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); return json(res, 200, { disconnected: true });
  }
  const s = session(req);
  if (url.pathname === '/api/google/records') {
    if (s.kind === 'docs') {
      const params = new URLSearchParams({ q: "mimeType='application/vnd.google-apps.document' and trashed=false", fields: 'files(id,name,modifiedTime)', pageSize: '10', orderBy: 'modifiedTime desc' });
      const d = await (await gfetch(`https://www.googleapis.com/drive/v3/files?${params}`, s.token)).json();
      return json(res, 200, { kind: s.kind, records: d.files.map(f => ({ id: f.id, title: f.name, date: f.modifiedTime })) });
    }
    const d = await (await gfetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=from%3Abupa%20OR%20from%3Anhs%20OR%20subject%3Ahealth', s.token)).json();
    const records = await Promise.all((d.messages || []).map(async m => { const d = await (await gfetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`, s.token)).json(); return { id: m.id, title: d.payload.headers.find(h => h.name === 'Subject')?.value || 'Email', date: d.payload.headers.find(h => h.name === 'Date')?.value || '' }; }));
    return json(res, 200, { kind: s.kind, records });
  }
  if (url.pathname === '/api/google/record') {
    const id = url.searchParams.get('id'); if (!/^[\w-]{5,200}$/.test(id || '')) throw new Error('Invalid record.');
    if (s.kind === 'docs') {
      const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/plain`, s.token);
      return json(res, 200, { text: (await r.text()).slice(0, 6000), source: 'Google Docs' });
    }
    const d = await (await gfetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, s.token)).json();
    return json(res, 200, { text: (extractMessage(d.payload) || d.snippet || '').slice(0, 6000), source: 'Gmail' });
  }
  return json(res, 404, { error: 'Not found' });
}

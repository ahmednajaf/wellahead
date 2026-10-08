const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function localStart(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw Error('Choose a valid date and time.');
  const value = new Date(`${date}T${time}:00`);
  // Catch invalid dates and times skipped by daylight-saving transitions.
  const pad = n => String(n).padStart(2, '0');
  const roundtrip = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  if (!Number.isFinite(+value) || roundtrip !== `${date}T${time}`) throw Error('That local time does not exist. Choose another time.');
  return value.toISOString();
}
export function createCalendarUI({ dialog, toast, onSaved = (_event) => {} }) {
  let connection, popup, refresh;
  const $ = id => document.getElementById(id);
  async function status() {
    const r = await fetch('/api/calendar/status', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error('Calendar connection could not be checked.');
    connection = await r.json(); return connection;
  }
  window.addEventListener('message', e => {
    if (e.origin === location.origin && e.source === popup && e.data?.type === 'well-ahead-calendar') refresh?.();
  });
  async function open(item) {
    dialog('Add to Google Calendar', `<p>Checking your calendar connection…</p>`);
    try { await status(); } catch (e) { dialog('Google Calendar', `<p>${escape(e.message)}</p>`); return; }
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = new Date();
    const minDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const date = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    let requestId = crypto.randomUUID(), sent;
    dialog('Make time for your health', `<p class="calendar-context">${escape(item.title)}</p><div id="calendar-connection" class="calendar-account"></div><form id="calendar-form"><label class="calendar-label">Calendar title<input id="calendar-title" maxlength="120" value="Personal health reminder" required></label><label class="calendar-label">This is<select id="calendar-kind"><option value="reminder" ${item.intent === 'schedule' ? '' : 'selected'}>A reminder to arrange care</option><option value="appointment" ${item.intent === 'schedule' ? 'selected' : ''}>Time for this health step or an existing appointment</option></select></label><div class="calendar-fields"><label>Day<input id="calendar-date" type="date" value="${date}" min="${minDate}" required></label><label>Time<input id="calendar-time" type="time" value="12:30" required></label></div><label class="calendar-label">Duration<select id="calendar-duration"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="60">1 hour</option><option value="90">90 minutes</option></select></label><p class="dialog-small">Time zone: ${escape(zone)}. Your browser’s local time, including daylight saving.</p><p class="dialog-small">Only this title, time and a generic note go to Google. No medical history is included. A private event is still visible to Google and people with sufficient calendar access. This does not book a provider.</p><p id="calendar-error" class="error" role="alert" hidden></p><button id="calendar-save" class="primary-button" type="submit">Confirm & add to Google Calendar</button></form>`);
    async function renderConnection() {
      const box = $('calendar-connection'); if (!box) return;
      $('calendar-save').disabled = !connection.connected;
      if (connection.connected) {
        box.innerHTML = `<div><strong>${escape(connection.email)}</strong><small>Primary Google Calendar</small><button id="calendar-disconnect" class="text-button" type="button">Disconnect / switch account</button></div>`;
        $('calendar-disconnect').onclick = async () => {
          try {
            const r = await fetch('/api/calendar/disconnect', { method: 'POST', headers: { 'X-Calendar-CSRF': connection.csrf }, signal: AbortSignal.timeout(15000) });
            if (!r.ok) throw Error('Could not disconnect. Try again.');
            await status(); renderConnection();
          } catch (e) { toast(e.message); }
        };
      } else if (!connection.configured) {
        box.innerHTML = '<div><strong>One-time Google setup needed</strong><small>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, then restart. See docs/google-calendar.md.</small></div>';
      } else {
        box.innerHTML = '<div><button id="calendar-connect" class="secondary-button" type="button">Sign in with Google ↗</button><button id="calendar-check" class="text-button" type="button">I’ve signed in — check connection</button><small>Choose the Google account you want to use.</small></div>';
        $('calendar-connect').onclick = () => { popup = window.open('/api/calendar/start', 'well-ahead-calendar', 'popup,width=560,height=740'); if (!popup) toast('Allow pop-ups, then try signing in again.'); };
        $('calendar-check').onclick = refresh;
      }
    }
    refresh = async () => { try { await status(); renderConnection(); } catch(e) { toast(e.message); } };
    renderConnection();
    $('calendar-form').oninput = () => { requestId = crypto.randomUUID(); sent = undefined; $('calendar-error').hidden = true; };
    $('calendar-form').onsubmit = async e => {
      e.preventDefault(); const button = $('calendar-save'); button.disabled = true; button.textContent = 'Saving…';
      // Freeze fields until the request resolves; an uncertain retry uses the same ID.
      const fields = [...$('calendar-form').querySelectorAll('input,select')]; fields.forEach(f => f.disabled = true);
      try {
        sent ||= { requestId, confirmed: true, title: $('calendar-title').value, kind: $('calendar-kind').value, start: localStart($('calendar-date').value, $('calendar-time').value), duration: Number($('calendar-duration').value), timeZone: zone };
        const r = await fetch('/api/calendar/events', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Calendar-CSRF': connection.csrf }, body: JSON.stringify(sent), signal: AbortSignal.timeout(30000) });
        const data = await r.json(); if (!r.ok) { if (r.status === 401) { connection.connected = false; renderConnection(); } throw Error(data.error); }
        onSaved({ item, kind: sent.kind, event: data });
        dialog('Added to Google Calendar', `<div class="calendar-success" aria-hidden="true">✓</div><h3>${escape(data.title)}</h3><p>${escape(new Date(data.start.dateTime).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' }))}</p><p>${escape(data.email)}</p><p class="dialog-small">Saved to your primary calendar. No provider was contacted and no appointment was booked by Well Ahead.</p><a class="primary-button" href="${escape(data.htmlLink)}" target="_blank" rel="noopener noreferrer">View in Google Calendar ↗</a>`);
      } catch (error) {
        if ($('calendar-error')) { $('calendar-error').textContent = error.name === 'TimeoutError' ? 'Save not yet confirmed. Retry without changing the details to avoid duplicates.' : error.message; $('calendar-error').hidden = false; }
      } finally { fields.forEach(f => f.disabled = false); button.disabled = !connection.connected; button.textContent = 'Confirm & add to Google Calendar'; }
    };
  }
  return { open };
}

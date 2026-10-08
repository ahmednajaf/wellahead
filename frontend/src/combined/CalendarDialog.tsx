import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { createCalendarUI } from '../../../server/public/calendar-ui.js';
import './upstream-ui.css';
export type CalendarItem = { title: string; id?: string; todoId?: string; generation?: number; intent?: 'schedule' };
export type SavedCalendarEvent = { start: { dateTime: string }; htmlLink: string };
export type CalendarHandle = { open: (item: CalendarItem) => void; close: () => void };

// React provides the dialog surface; Rob's module owns OAuth, validation, consent,
// CSRF, event creation and retry IDs. Never reproduce those rules in this layer.
export default forwardRef<CalendarHandle, { onSaved?: (item: CalendarItem, kind: string, event: SavedCalendarEvent) => void }>(function CalendarDialog({ onSaved }, ref) {
  const dialog = useRef<HTMLDialogElement>(null), title = useRef<HTMLHeadingElement>(null), content = useRef<HTMLDivElement>(null);
  const ui = useRef<ReturnType<typeof createCalendarUI> | null>(null), active = useRef(false), opening = useRef(false);
  const [notice, setNotice] = useState('');
  const saved = useRef(onSaved); saved.current = onSaved;
  const close = () => { active.current = false; dialog.current?.close(); setNotice(''); };
  useImperativeHandle(ref, () => ({ close, open(item) {
    if (opening.current) return;
    active.current = true; setNotice('');
    ui.current ||= createCalendarUI({
      dialog: (heading: string, html: string) => {
        if (!dialog.current || !title.current || !content.current) return;
        title.current.textContent = heading;
        content.current.innerHTML = html;
        if (active.current && !dialog.current.open) dialog.current.showModal();
      },
      onSaved: ({ item, kind, event }: { item: CalendarItem; kind: string; event: SavedCalendarEvent }) => {
        saved.current?.(item, kind, event);
        if (item.intent === 'schedule' && kind === 'appointment') close();
      },
      toast: (message: string) => { if (active.current) setNotice(message); },
    });
    opening.current = true;
    void ui.current.open(item).catch(() => setNotice('Calendar could not be opened. Please try again.')).finally(() => { opening.current = false; });
  } }), []);
  useEffect(() => () => { active.current = false; dialog.current?.close(); }, []);
  return <dialog ref={dialog} className="upstream-calendar-dialog" aria-labelledby="calendar-dialog-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 ref={title} id="calendar-dialog-title">Google Calendar</h2><button className="icon-button" type="button" aria-label="Close calendar" onClick={close}><X size={18} /></button></header>
    <div ref={content} />{notice && <p role="status" className="calendar-notice">{notice}</p>}
  </dialog>;
});

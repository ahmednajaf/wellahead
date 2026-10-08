import { useEffect, useRef } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { safeLink, type Plan } from './api';
import { planTodos, type Bookings, type Progress, type TodoStatus } from './plan-progress';

export type BookingFocus = { todoId: string; sequence: number };
export default function CalendarAppointments({ plan, progress = {}, bookings = {}, bookedFocus, onProgress = () => {} }: {
  plan: Plan; progress?: Progress; bookings?: Bookings;
  bookedFocus?: BookingFocus | null; onProgress?: (id: string, status: TodoStatus) => void;
}) {
  const section = useRef<HTMLElement>(null), handledFocus = useRef<number | null>(null);
  const todos = planTodos(plan);
  const booked = todos.filter(todo => (progress[todo.id] || todo.status) === 'booked').sort((a,b) =>
    (Date.parse(bookings[a.id]?.startsAt) || Infinity) - (Date.parse(bookings[b.id]?.startsAt) || Infinity));
  useEffect(() => {
    if (!bookedFocus || handledFocus.current === bookedFocus.sequence) return;
    const row = Array.from(section.current?.querySelectorAll<HTMLElement>('[data-booked-todo]') || []).find(element => element.dataset.bookedTodo === bookedFocus.todoId);
    if (row) { handledFocus.current = bookedFocus.sequence; row.focus({preventScroll:true}); row.scrollIntoView?.({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
  }, [bookedFocus]);
  return <section ref={section} className="dashboard-glass appointments-widget" aria-labelledby="appointments-heading">
    <header className="dashboard-widget-heading"><h2 id="appointments-heading">Appointments</h2><CalendarDays size={17} aria-hidden="true" /></header>
    <div className="booked-appointments">
      {booked.length ? <ol className="booked-step-list" aria-label="Booked appointments">{booked.map(todo => {
        const booking = bookings[todo.id];
        return <li key={todo.id} data-booked-todo={todo.id} tabIndex={-1}>
          <span className="booked-step-check" aria-hidden="true"><Check size={16} /></span><div><h3>{todo.title}</h3>
            {booking ? <><time dateTime={booking.startsAt}>{new Date(booking.startsAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</time><a href={safeLink(booking.htmlLink)} target="_blank" rel="noopener noreferrer">View in Google Calendar ↗</a></> : <p>Marked booked · no calendar time added</p>}
            <button className="text-button" onClick={() => onProgress(todo.id,'completed')} aria-label={`Mark ${todo.title} completed`}>Mark completed</button>
          </div>
        </li>;
      })}</ol> : <p className="booked-empty">No appointments booked yet. Book from Your next steps.</p>}
    </div>
    <p className="widget-footnote">Reserve time in Google Calendar. Arrange provider appointments separately.</p>
  </section>;
}

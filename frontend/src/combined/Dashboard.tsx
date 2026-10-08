import type { ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import SystemIcon from '../components/SystemIcon';
import { systems, linkedItemCount } from './domains';
import type { Plan } from './api';
import CalendarAppointments, { type BookingFocus } from './CalendarAppointments';
import type { CalendarItem } from './CalendarDialog';
import './dashboard.css';
import './blood-results.css';
import { bloodResultsFor } from './blood-results';
import PlanProgress from './PlanProgress';
import { planTodos, type Bookings, type Progress, type TodoStatus } from './plan-progress';

export function HealthLauncher({ plan, onOpen }: { plan: Plan; onOpen: (id: string) => void }) {
  return <section className="compact-launcher" aria-label="Health areas">
    <div className="launcher-scroll"><div className="system-grid">
      {systems.map(system => {
        const count = linkedItemCount(plan,system.id);
        const bloodCount = bloodResultsFor(plan.bloodResults, system.id).count;
        return <button key={system.id} className="system-tile" onClick={() => onOpen(system.id)} aria-label={`${system.name}${count ? `, ${count} linked items` : ''}${bloodCount ? `, ${bloodCount} blood results` : ''}`}><SystemIcon system={system} count={count} /><span className="system-name">{system.name}</span>{bloodCount > 0 && <small className="system-results-hint">{bloodCount} blood {bloodCount === 1 ? 'result' : 'results'}</small>}</button>;
      })}
    </div></div>
    <p className="launcher-scroll-hint">Scroll across to explore all 15 health areas</p>
  </section>;
}

export default function Dashboard({ agentControl, plan, onOpen, onPlan, onCalendar, progress = {}, onProgress = () => {}, bookings = {}, bookedFocus }: { agentControl?: ReactNode; bookings?: Bookings; bookedFocus?: BookingFocus | null; progress?: Progress; onProgress?: (id: string, status: TodoStatus) => void; plan: Plan; onOpen: (id: string) => void; onPlan: (recommendationId?: string) => void; onCalendar: (item: CalendarItem) => void }) {
  const todos = planTodos(plan), tests = todos.filter(todo => (todo.authority === 'Bupa' || todo.authority === 'NHS') && (progress[todo.id] || todo.status) === 'pending');
  return <div className="health-dashboard">
    <PlanProgress agentControl={agentControl} todos={todos} progress={progress} onChange={onProgress} />
    <HealthLauncher plan={plan} onOpen={onOpen} />
    <div className="dashboard-widgets">
      <section className="dashboard-glass next-actions-widget" aria-labelledby="next-actions-heading">
        <header className="dashboard-widget-heading"><h2 id="next-actions-heading">Your next steps</h2><Sparkles size={17} aria-hidden="true" /></header>
        {tests.length ? <ul className="next-actions-list" aria-label="Recommended Bupa and NHS tests">
          {tests.map(test => {
            const name = test.displayTitle || test.title;
            return <li key={test.id}>
              <button className="next-test-details" onClick={() => onPlan(test.sourceId)} aria-label={`View details for ${name}`}>{name}</button>
              <button className="next-test-book" onClick={() => onCalendar({ id:test.sourceId, todoId:test.id, title:test.title, intent:'schedule' })} aria-label={`Book time for ${name} in Google Calendar`}>Book</button>
            </li>;
          })}
        </ul> : <p className="widget-empty-copy">{!todos.length && plan.intro ? plan.intro : 'No Bupa or NHS tests to arrange in this plan.'}</p>}
        <button className="widget-plan-link" onClick={() => onPlan()}>View your full health plan <ArrowRight size={15} aria-hidden="true" /></button>
      </section>
      <CalendarAppointments plan={plan} progress={progress} onProgress={onProgress} bookings={bookings} bookedFocus={bookedFocus} />
    </div>
  </div>;
}

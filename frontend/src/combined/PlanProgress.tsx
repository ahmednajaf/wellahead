import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { progressSummary, type Progress, type Todo, type TodoStatus } from './plan-progress';

export default function PlanProgress({ agentControl, todos, progress, onChange }: { agentControl?: ReactNode; todos: Todo[]; progress: Progress; onChange: (id: string, status: TodoStatus) => void }) {
  const summary = progressSummary(todos, progress);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  const visible = open ? todos.filter(todo => (progress[todo.id] || todo.status) !== 'completed') : [];
  return <>
    <div className="dashboard-summary">
      <div className="summary-buttons">
        {agentControl}
        <div className="summary-glass" role="group" aria-label={`Health optimisation score: ${summary.percentage === null ? 'no to-dos yet' : `${summary.percentage}%`}`}>
          <strong>{summary.percentage === null ? '—' : `${summary.percentage}%`}</strong><span>Health optimisation score<small>{summary.booked + summary.completed} of {summary.total} booked or completed</small></span>
        </div>
        <button className="summary-glass" onClick={() => setOpen(true)} aria-label={`Upcoming health to-dos: ${summary.upcoming}`}>
          <strong>{summary.upcoming}</strong><span>Upcoming health to-dos<small>{summary.pending} to arrange · {summary.booked} booked</small></span><ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
    <dialog ref={dialog} className="progress-dialog" aria-labelledby="progress-title" onCancel={event => { event.preventDefault(); setOpen(false); }}>
      <header><h2 id="progress-title">Upcoming health to-dos</h2><button className="icon-button" aria-label="Close plan progress" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <p>Keep track of what’s next. Booked appointments stay here until you complete them.</p>
      {visible.length ? <ul className="progress-list">{visible.map(todo => <li key={todo.id}><label><span>{todo.title}</span><select aria-label={`Status for ${todo.title}`} value={progress[todo.id] || todo.status} onChange={event => onChange(todo.id, event.target.value as TodoStatus)}><option value="pending">To arrange</option><option value="booked">Booked</option><option value="completed">Completed</option></select></label></li>)}</ul> : <p>{todos.length ? 'You’ve completed all your to-dos.' : 'Your plan has no to-dos to track yet.'}</p>}
      <p className="progress-footnote">Mark “Booked” only after arranging care with a provider. Updates stay in this session and reset when you create a new plan.</p>
    </dialog>
  </>;
}

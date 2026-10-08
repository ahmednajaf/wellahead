import type { Plan } from './api';
import type { MatrixItem } from './domains';

export type TodoStatus = 'pending' | 'booked' | 'completed';
export type Todo = { id: string; sourceId: string; title: string; displayTitle?: string; status: TodoStatus; description?: string; timing?: string; authority?: string };
export type Progress = Record<string, TodoStatus>;
export type CalendarBooking = { startsAt: string; htmlLink: string };
export type Bookings = Record<string, CalendarBooking>;

// Presentation state only. These are rows already returned by Rob's planner.
// Optional checks remain discussions; marking them never establishes eligibility.
export function planTodos(plan: Plan): Todo[] {
  const rows: Todo[] = plan.actions.map(action => ({ id: `action:${action.id}`, sourceId: action.id, title: action.title, status: 'pending', description: action.idea }));
  const r = plan.recommendations;
  const checks = (r ? [r.primary, ...(r.nice || []), ...(r.nhs || []), ...(r.optional || [])] : []) as (MatrixItem | null)[];
  for (const item of checks) {
    if (!item || ['excluded', 'not_eligible', 'up_to_date'].includes(item.status)) continue;
    rows.push({ id: `check:${item.id}`, sourceId: item.id, title: item.authority === 'Bupa' ? `Discuss ${item.title}` : item.title, displayTitle: item.title, status: item.status === 'completed' ? 'completed' : item.status === 'booked' ? 'booked' : 'pending', description: item.explanation, timing: item.status, authority: item.authority });
  }
  return rows.filter((row, index) => rows.findIndex(other => other.id === row.id) === index);
}
// Display priority uses explicit timing supplied by the backend, never age,
// symptoms or new eligibility rules. Stable sorting retains its other ordering.
export function nextSteps(plan: Plan, progress: Progress): Todo[] {
  const rank = (todo: Todo) => todo.timing === 'overdue' ? 0 : todo.timing === 'due' ? 1 : 2;
  return planTodos(plan).filter(todo => (progress[todo.id] || todo.status) === 'pending')
    .sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}
export function progressSummary(todos: Todo[], progress: Progress) {
  const counts = { pending: 0, booked: 0, completed: 0 };
  for (const todo of todos) counts[progress[todo.id] || todo.status]++;
  return { ...counts, total: todos.length, upcoming: counts.pending + counts.booked,
    percentage: todos.length ? Math.round((counts.booked + counts.completed) / todos.length * 100) : null };
}
export function calendarProgress(progress: Progress, todos: Todo[], item: { todoId?: string; generation?: number }, kind: string, generation: number): Progress {
  const todo = todos.find(row => row.id === item.todoId);
  if (kind !== 'appointment' || item.generation !== generation || !todo) return progress;
  return { ...progress, [todo.id]: (progress[todo.id] || todo.status) === 'completed' ? 'completed' : 'booked' };
}

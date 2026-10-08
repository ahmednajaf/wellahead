import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { calendarProgress, nextSteps, planTodos, progressSummary, type Progress } from '../combined/plan-progress';
import PlanProgress from '../combined/PlanProgress';
import type { Plan } from '../combined/api';

const plan = { actions: [{id:'move',title:'Move more'}, {id:'rest',title:'Make time to rest'}], recommendations: {
  primary:{id:'assessment',title:'Health assessment',authority:'Bupa',status:'recommended'},
  nice:[{id:'assessment',title:'Health assessment',authority:'Bupa',status:'recommended'}],
  nhs:[{id:'excluded',title:'Excluded',status:'excluded'}, {id:'not-eligible',title:'Not eligible',status:'not_eligible'}, {id:'current',title:'Up to date',status:'up_to_date'}, {id:'done',title:'Finished check',status:'completed'}], optional:[],
} } as unknown as Plan;

test('uses only existing actions and applicable discussion rows; deduplicates rows and retains completed to-dos', () => {
 const before=JSON.stringify(plan), todos=planTodos(plan);
 expect(todos.map(t=>t.id)).toEqual(['action:move','action:rest','check:assessment','check:done']);
 expect(todos[2].title).toBe('Discuss Health assessment');
 expect(JSON.stringify(plan)).toBe(before);
});
test('next steps prioritise backend overdue/due timing and refill from outstanding items only', () => {
 const timed={...plan,recommendations:{...plan.recommendations,nhs:[{id:'due',title:'Due check',status:'due'},{id:'overdue',title:'Overdue check',status:'overdue'}]}} as unknown as Plan;
 const before=JSON.stringify(timed);
 expect(nextSteps(timed,{}).map(t=>t.id)).toEqual(['check:overdue','check:due','action:move']);
 expect(nextSteps(timed,{'check:overdue':'booked','action:move':'completed'}).map(t=>t.id)).toEqual(['check:due','action:rest','check:assessment']);
 expect(JSON.stringify(timed)).toBe(before);
 expect(nextSteps(plan,{'action:move':'completed','action:rest':'booked'}).map(t=>t.id)).toEqual(['check:assessment']);
 expect(nextSteps({actions:[]} as unknown as Plan,{})).toEqual([]);
});
test('booked or completed count once each, stale IDs do not count, and no tasks means no score', () => {
 const todos=planTodos(plan);
 expect(progressSummary(todos, {'action:move':'booked','action:rest':'completed',stale:'completed'})).toEqual({total:4,pending:1,booked:1,completed:2,upcoming:2,percentage:75});
 expect(progressSummary(todos, {'action:move':'completed','action:rest':'completed','check:assessment':'completed'}).percentage).toBe(100);
 expect(progressSummary([], {stale:'completed'}).percentage).toBeNull();
});
test('calendar reminders and saves from a previous plan never mark a to-do as booked', () => {
 const todos=planTodos(plan), previous:Progress={};
 expect(calendarProgress(previous,todos,{todoId:'action:move',generation:1},'reminder',1)).toBe(previous);
 expect(calendarProgress(previous,todos,{todoId:'action:move',generation:1},'appointment',2)).toBe(previous);
 expect(calendarProgress(previous,todos,{todoId:'unknown',generation:1},'appointment',1)).toBe(previous);
 expect(calendarProgress(previous,todos,{todoId:'action:move',generation:1},'appointment',1)).toEqual({'action:move':'booked'});
 expect(calendarProgress({'check:done':'completed'},todos,{todoId:'check:done',generation:1},'appointment',1)).toEqual({'check:done':'completed'});
});
test('score is display-only; upcoming retains the progress controls and excludes completed items', () => {
 function Harness() {const [progress,setProgress]=useState<Progress>({});return <PlanProgress todos={planTodos(plan)} progress={progress} onChange={(id,status)=>setProgress(p=>({...p,[id]:status}))} />;}
 render(<Harness />);
 const score=screen.getByRole('group',{name:'Health optimisation score: 25%'});
 expect(screen.queryByRole('button',{name:/Health optimisation score/})).not.toBeInTheDocument();
 expect(score).not.toHaveAttribute('tabindex');fireEvent.click(score);expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Upcoming health to-dos: 3'}));
 fireEvent.change(screen.getByRole('combobox',{name:'Status for Move more'}),{target:{value:'booked'}});
 fireEvent.change(screen.getByRole('combobox',{name:'Status for Make time to rest'}),{target:{value:'completed'}});
 fireEvent.click(screen.getByRole('button',{name:'Close plan progress'}));
 expect(screen.getByRole('group',{name:'Health optimisation score: 75%'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Upcoming health to-dos: 2'}));
 expect(screen.getByRole('combobox',{name:'Status for Move more'})).toHaveValue('booked');
 expect(screen.queryByRole('combobox',{name:'Status for Make time to rest'})).not.toBeInTheDocument();
});
